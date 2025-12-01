import { StateService } from '@services/state/state.service';
import { Chat2DeskService } from '@services/chat2desk/chat2desk.service';
import { OrderService } from '@services/order/order.service';
import { validateAddress, validatePhone, validateQuantity } from '@/validators';
import { DialogContext, DialogState } from '@/types';
import { logger } from '@utils/logger';

export class DialogHandler {
  private stateService: StateService;
  private chat2deskService: Chat2DeskService;
  private orderService: OrderService;

  constructor() {
    this.stateService = new StateService();
    this.chat2deskService = new Chat2DeskService();
    this.orderService = new OrderService();
  }

  /**
   * Process incoming message from client
   */
  async processMessage(clientId: string, messageText: string): Promise<void> {
    try {
      let context = await this.stateService.getContext(clientId);

      if (!context) {
        context = await this.stateService.initContext(clientId);
      }

      switch (context.state) {
        case DialogState.INITIAL:
          await this.handleInitial(clientId, messageText, context);
          break;

        case DialogState.WAITING_ADDRESS:
          await this.handleAddress(clientId, messageText, context);
          break;

        case DialogState.WAITING_PHONE:
          await this.handlePhone(clientId, messageText, context);
          break;

        case DialogState.WAITING_QUANTITY:
          await this.handleQuantity(clientId, messageText, context);
          break;

        case DialogState.WAITING_CONFIRMATION:
          await this.handleConfirmation(clientId, messageText, context);
          break;

        default:
          logger.warn(`Unknown state: ${context.state} for client ${clientId}`);
          await this.chat2deskService.sendMessage(
            clientId,
            'An error occurred. Please start over by sending "Hello"'
          );
          await this.stateService.deleteContext(clientId);
      }
    } catch (error) {
      logger.error(`Error processing message for ${clientId}:`, error);
      await this.chat2deskService.sendMessage(
        clientId,
        'An error occurred. Please try again later or contact us.'
      );
    }
  }

  /**
   * Handle initial state
   */
  private async handleInitial(
    clientId: string,
    _messageText: string,
    _context: DialogContext
  ): Promise<void> {
    await this.chat2deskService.sendMessage(
      clientId,
      'Hello! I will help you place an order.\n\nPlease provide your delivery address.'
    );

    await this.stateService.updateContext(clientId, {
      state: DialogState.WAITING_ADDRESS,
    });
  }

  /**
   * Handle address input
   */
  private async handleAddress(
    clientId: string,
    messageText: string,
    context: DialogContext
  ): Promise<void> {
    const validation = validateAddress(messageText);

    if (!validation.isValid) {
      await this.chat2deskService.sendMessage(clientId, validation.error!);
      return;
    }

    await this.stateService.updateContext(clientId, {
      state: DialogState.WAITING_PHONE,
      data: {
        ...context.data,
        address: messageText.trim(),
      },
    });

    await this.chat2deskService.sendMessage(
      clientId,
      'Great! Now please provide your contact phone number.'
    );
  }

  /**
   * Handle phone input
   */
  private async handlePhone(
    clientId: string,
    messageText: string,
    context: DialogContext
  ): Promise<void> {
    const validation = validatePhone(messageText);

    if (!validation.isValid) {
      await this.chat2deskService.sendMessage(clientId, validation.error!);
      return;
    }

    await this.stateService.updateContext(clientId, {
      state: DialogState.WAITING_QUANTITY,
      data: {
        ...context.data,
        phone: validation.normalized!,
      },
    });

    await this.chat2deskService.sendMessage(
      clientId,
      'How many items would you like to order? (from 1 to 50)'
    );
  }

  /**
   * Handle quantity input
   */
  private async handleQuantity(
    clientId: string,
    messageText: string,
    context: DialogContext
  ): Promise<void> {
    const validation = validateQuantity(messageText);

    if (!validation.isValid) {
      await this.chat2deskService.sendMessage(clientId, validation.error!);
      return;
    }

    await this.stateService.updateContext(clientId, {
      state: DialogState.WAITING_CONFIRMATION,
      data: {
        ...context.data,
        quantity: validation.count!,
      },
    });

    const summary = `
Please confirm your order details:

📍 Address: ${context.data.address}
📞 Phone: ${context.data.phone}
📦 Quantity: ${validation.count}

Is everything correct? (Yes/No)
    `.trim();

    await this.chat2deskService.sendMessage(clientId, summary);
  }

  /**
   * Handle order confirmation
   */
  private async handleConfirmation(
    clientId: string,
    messageText: string,
    context: DialogContext
  ): Promise<void> {
    const response = messageText.toLowerCase().trim();

    if (this.isPositiveResponse(response)) {
      try {
        const order = await this.orderService.createOrder({
          clientPhone: context.data.phone!,
          deliveryAddress: context.data.address!,
          quantity: context.data.quantity!,
          chat2deskClientId: clientId,
        });

        await this.chat2deskService.sendMessage(
          clientId,
          `✅ Order #${order.id} has been successfully placed!\n\nDelivery within 2-4 hours.\n\nThank you for your order!`
        );

        await this.stateService.deleteContext(clientId);

        logger.info(`Order completed: #${order.id} for client ${clientId}`);
      } catch (error) {
        logger.error(`Failed to create order for ${clientId}:`, error);
        await this.chat2deskService.sendMessage(
          clientId,
          'An error occurred while placing your order. Please try again later or contact us.'
        );
      }
    } else if (this.isNegativeResponse(response)) {
      await this.stateService.deleteContext(clientId);
      await this.chat2deskService.sendMessage(
        clientId,
        'Order cancelled. Feel free to place a new order anytime.'
      );

      logger.info(`Order cancelled by client ${clientId}`);
    } else {
      await this.chat2deskService.sendMessage(clientId, 'Please answer "Yes" or "No"');
    }
  }

  /**
   * Check if response is positive
   */
  private isPositiveResponse(response: string): boolean {
    const positiveWords = ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'correct', '+'];
    return positiveWords.some((word) => response.includes(word));
  }

  /**
   * Check if response is negative
   */
  private isNegativeResponse(response: string): boolean {
    const negativeWords = ['no', 'n', 'nope', 'cancel', '-'];
    return negativeWords.some((word) => response.includes(word));
  }
}
