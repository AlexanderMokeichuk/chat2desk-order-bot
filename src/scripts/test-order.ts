import { OrderService } from '@/services';
import { CreateOrderDto } from '@/types';
import { logger } from '@utils/logger';

async function testOrderService() {
  logger.info('=== Testing Order Service ===');

  const orderService = new OrderService();

  logger.info('Test 1: Create order');

  const orderDto: CreateOrderDto = {
    clientPhone: '+996555123456',
    deliveryAddress: 'ул. Киевская 123, кв. 45',
    bottlesCount: 5,
    chat2deskClientId: 'test_client_order_123',
  };

  const order = await orderService.createOrder(orderDto);
  logger.info('Order created:', order);

  logger.info('\nTest 2: Get order by ID');
  const foundOrder = await orderService.getOrderById(order.id);
  logger.info('Order found:', foundOrder);

  logger.info('\nTest 3: Get client orders');
  const clientOrders = await orderService.getClientOrders(orderDto.chat2deskClientId);
  logger.info(`Found ${clientOrders.length} orders for client:`, clientOrders);

  logger.info('\nTest 4: Create another order');
  const order2 = await orderService.createOrder({
    ...orderDto,
    bottlesCount: 10,
  });
  logger.info('Second order created:', order2);

  logger.info('\nTest 5: Get all client orders again');
  const allClientOrders = await orderService.getClientOrders(orderDto.chat2deskClientId);
  logger.info(`Now client has ${allClientOrders.length} orders:`, allClientOrders);

  logger.info('\nTest 6: Try to create invalid order');
  try {
    await orderService.createOrder({
      clientPhone: '',
      deliveryAddress: 'test',
      bottlesCount: 100,
      chat2deskClientId: 'test',
    });
  } catch (error: unknown) {
    logger.info('Validation error caught (expected):', (error as Error).message);
  }

  logger.info('\n=== Order Service Tests Completed ===');

  process.exit(0);
}

testOrderService().catch((error) => {
  logger.error('Order test failed:', error);
  process.exit(1);
});
