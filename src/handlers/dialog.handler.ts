import { StateService } from '@services/state/state.service';
import { Chat2DeskService } from '@services/chat2desk/chat2desk.service';
import { OrderService } from '@services/order/order.service';
import { validatePhone, validateAddress, validateBottles } from '@/validators';
import { DialogState, DialogContext } from '@/types';
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

        case DialogState.WAITING_BOTTLES:
          await this.handleBottles(clientId, messageText, context);
          break;

        case DialogState.WAITING_CONFIRMATION:
          await this.handleConfirmation(clientId, messageText, context);
          break;

        default:
          logger.warn(`Unknown state: ${context.state} for client ${clientId}`);
          await this.chat2deskService.sendMessage(
            clientId,
            'Произошла ошибка. Начните заново, напишите "Привет"'
          );
          await this.stateService.deleteContext(clientId);
      }
    } catch (error) {
      logger.error(`Error processing message for ${clientId}:`, error);
      await this.chat2deskService.sendMessage(
        clientId,
        'Произошла ошибка. Попробуйте позже или позвоните нам.'
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
      'Здравствуйте! Я помогу вам оформить заказ на доставку воды Shoro.\n\nУкажите, пожалуйста, адрес доставки.'
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
      'Отлично! Теперь укажите контактный номер телефона.'
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
      state: DialogState.WAITING_BOTTLES,
      data: {
        ...context.data,
        phone: validation.normalized!,
      },
    });

    await this.chat2deskService.sendMessage(
      clientId,
      'Сколько бутылей воды вы хотите заказать? (от 1 до 50)'
    );
  }

  /**
   * Handle bottles count input
   */
  private async handleBottles(
    clientId: string,
    messageText: string,
    context: DialogContext
  ): Promise<void> {
    const validation = validateBottles(messageText);

    if (!validation.isValid) {
      await this.chat2deskService.sendMessage(clientId, validation.error!);
      return;
    }

    await this.stateService.updateContext(clientId, {
      state: DialogState.WAITING_CONFIRMATION,
      data: {
        ...context.data,
        bottlesCount: validation.count!,
      },
    });

    const summary = `
Проверьте данные заказа:

📍 Адрес: ${context.data.address}
📞 Телефон: ${context.data.phone}
💧 Количество: ${validation.count} ${this.getBottlesWord(validation.count!)}

Всё верно? (Да/Нет)
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
          bottlesCount: context.data.bottlesCount!,
          chat2deskClientId: clientId,
        });

        await this.chat2deskService.sendMessage(
          clientId,
          `✅ Заказ №${order.id} успешно оформлен!\n\nДоставка воды в течение 2-4 часов.\n\nСпасибо за заказ! 💧`
        );

        await this.stateService.deleteContext(clientId);

        logger.info(`Order completed: #${order.id} for client ${clientId}`);
      } catch (error) {
        logger.error(`Failed to create order for ${clientId}:`, error);
        await this.chat2deskService.sendMessage(
          clientId,
          'Произошла ошибка при оформлении заказа. Пожалуйста, попробуйте позже или позвоните нам.'
        );
      }
    } else if (this.isNegativeResponse(response)) {
      await this.stateService.deleteContext(clientId);
      await this.chat2deskService.sendMessage(
        clientId,
        'Заказ отменён. Напишите снова, когда захотите оформить новый заказ.'
      );

      logger.info(`Order cancelled by client ${clientId}`);
    } else {
      await this.chat2deskService.sendMessage(clientId, 'Пожалуйста, ответьте "Да" или "Нет"');
    }
  }

  /**
   * Check if response is positive
   */
  private isPositiveResponse(response: string): boolean {
    const positiveWords = ['да', 'yes', 'ага', 'угу', '+', 'конечно', 'верно', 'правильно'];
    return positiveWords.some((word) => response.includes(word));
  }

  /**
   * Check if response is negative
   */
  private isNegativeResponse(response: string): boolean {
    const negativeWords = ['нет', 'no', 'не', '-', 'отмена', 'cancel'];
    return negativeWords.some((word) => response.includes(word));
  }

  /**
   * Get correct word form for bottles
   */
  private getBottlesWord(count: number): string {
    if (count === 1) {
      return 'бутыль';
    } else if (count >= 2 && count <= 4) {
      return 'бутыли';
    } else {
      return 'бутылей';
    }
  }
}
