import { pool } from '@config/database.config';
import { Order, CreateOrderDto, OrderStatus } from '@/types';
import { logger } from '@utils/logger';

export class OrderRepository {
  /**
   * Create new order in database
   */
  async create(dto: CreateOrderDto): Promise<Order> {
    const query = `
        INSERT INTO orders (client_phone,
                            delivery_address,
                            bottles_count,
                            source,
                            chat2desk_client_id,
                            status)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `;

    const values = [
      dto.clientPhone,
      dto.deliveryAddress,
      dto.bottlesCount,
      'chat2desk_bot',
      dto.chat2deskClientId,
      OrderStatus.NEW,
    ];

    try {
      const result = await pool.query(query, values);
      const row = result.rows[0];

      logger.info(`Order created: ID=${row.id}, client=${dto.chat2deskClientId}`);

      return this.mapRowToOrder(row);
    } catch (error) {
      logger.error('Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Find order by ID
   */
  async findById(id: number): Promise<Order | null> {
    const query = 'SELECT * FROM orders WHERE id = $1';

    try {
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToOrder(result.rows[0]);
    } catch (error) {
      logger.error(`Failed to find order ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find orders by client
   */
  async findByClient(chat2deskClientId: string): Promise<Order[]> {
    const query = `
        SELECT *
        FROM orders
        WHERE chat2desk_client_id = $1
        ORDER BY created_at DESC LIMIT 10
    `;

    try {
      const result = await pool.query(query, [chat2deskClientId]);
      return result.rows.map((row) => this.mapRowToOrder(row));
    } catch (error) {
      logger.error(`Failed to find orders for client ${chat2deskClientId}:`, error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  async updateStatus(id: number, status: OrderStatus): Promise<void> {
    const query = `
        UPDATE orders
        SET status     = $1,
            updated_at = NOW()
        WHERE id = $2
    `;

    try {
      await pool.query(query, [status, id]);
      logger.debug(`Order ${id} status updated to ${status}`);
    } catch (error) {
      logger.error(`Failed to update order ${id} status:`, error);
      throw error;
    }
  }

  /**
   * Map database row to Order entity
   */
  private mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      clientPhone: row.client_phone,
      deliveryAddress: row.delivery_address,
      bottlesCount: row.bottles_count,
      source: row.source,
      chat2deskClientId: row.chat2desk_client_id,
      status: row.status as OrderStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
