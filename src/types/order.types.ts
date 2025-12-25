/**
 * Order status enum
 */
export enum OrderStatus {
  NEW = 'new',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * DTO for creating new order
 */
export interface CreateOrderDto {
  clientPhone: string;
  deliveryAddress: string;
  quantity: number;
  chat2deskClientId: string | number;
}

/**
 * Order entity from database
 */
export interface Order {
  id: number;
  clientPhone: string;
  deliveryAddress: string;
  quantity: number;
  source: string;
  chat2deskClientId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
