import { CreateOrderDto, Order } from '@/types';
import { logger } from '@utils/logger';
import { OrderRepository } from '@/services';

export class OrderService {
  private repository: OrderRepository;

  constructor() {
    this.repository = new OrderRepository();
  }

  /**
   * Create new order
   */
  async createOrder(dto: CreateOrderDto): Promise<Order> {
    try {
      this.validateOrderDto(dto);

      const order = await this.repository.create(dto);

      logger.info(
        `Order created successfully: #${order.id} for ${dto.chat2deskClientId}, quantity: ${dto.quantity}`
      );

      return order;
    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(id: number): Promise<Order | null> {
    return this.repository.findById(id);
  }

  /**
   * Get client's orders
   */
  async getClientOrders(chat2deskClientId: string): Promise<Order[]> {
    return this.repository.findByClient(chat2deskClientId);
  }

  /**
   * Validate order DTO
   */
  private validateOrderDto(dto: CreateOrderDto): void {
    if (!dto.clientPhone || dto.clientPhone.trim().length === 0) {
      throw new Error('Client phone is required');
    }

    if (!dto.deliveryAddress || dto.deliveryAddress.trim().length === 0) {
      throw new Error('Delivery address is required');
    }

    if (!dto.quantity || dto.quantity < 1 || dto.quantity > 50) {
      throw new Error('Quantity must be between 1 and 50');
    }

    if (!dto.chat2deskClientId || dto.chat2deskClientId.trim().length === 0) {
      throw new Error('Chat2Desk client ID is required');
    }
  }
}
