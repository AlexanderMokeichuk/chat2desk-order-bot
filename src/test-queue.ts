import { messageQueue, outboxQueue } from '@/queues';
import { logger } from '@utils/logger';
import { MessageJob, OutboxJob } from '@/types';

async function testQueues() {
  logger.info('=== Testing Message Queue ===');

  const testMessageJob: MessageJob = {
    clientId: 'test_client_123',
    messageText: 'Привет, хочу заказать воду',
    messageId: 'test_msg_001',
    timestamp: Date.now(),
  };

  const job1 = await messageQueue.add(testMessageJob);
  logger.info(`Added job to message queue: ${job1.id}`);

  const messageQueueCounts = await messageQueue.getJobCounts();
  logger.info('Message queue stats:', messageQueueCounts);

  logger.info('=== Testing Outbox Queue ===');

  const testOutboxJob: OutboxJob = {
    clientId: 'test_client_456',
    text: 'Test message for retry',
    createdAt: Date.now(),
    attempts: 0,
  };

  const job2 = await outboxQueue.add(testOutboxJob);
  logger.info(`Added job to outbox queue: ${job2.id}`);

  const outboxQueueCounts = await outboxQueue.getJobCounts();
  logger.info('Outbox queue stats:', outboxQueueCounts);

  logger.info('=== Cleaning up test jobs ===');

  await job1.remove();
  await job2.remove();

  logger.info('Test jobs removed');

  logger.info('=== Queue Test Completed ===');

  await messageQueue.close();
  await outboxQueue.close();
  process.exit(0);
}

testQueues().catch((error) => {
  logger.error('Queue test failed:', error);
  process.exit(1);
});
