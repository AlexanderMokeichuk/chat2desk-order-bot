import { logger } from '@utils/logger';
import { Chat2DeskService, RateLimiter } from '@/services';

async function testChat2DeskService() {
  logger.info('=== Testing Chat2Desk Service ===');

  const chat2deskService = new Chat2DeskService();
  const testClientId = 'test_client_chat2desk';

  logger.info('Note: This test will fail if CHAT2DESK_API_TOKEN is not valid');
  logger.info('That is expected for development. Check logs for details.\n');

  logger.info('Test 1: Send message');
  const result = await chat2deskService.sendMessage(
    testClientId,
    'Тестовое сообщение от бота Shoro'
  );
  logger.info(`Send result: ${result}`);

  logger.info('\nTest 2: Rate Limiter');
  const rateLimiter = new RateLimiter(5, 10000);

  for (let i = 1; i <= 7; i++) {
    const canMake = rateLimiter.canMakeRequest();
    logger.info(
      `Request ${i}: Can make? ${canMake}, Current count: ${rateLimiter.getCurrentCount()}`
    );

    if (canMake) {
      rateLimiter.recordRequest();
    } else {
      const waitTime = rateLimiter.getTimeUntilNextRequest();
      logger.info(`Rate limited! Wait ${waitTime}ms`);
    }
  }

  logger.info('\n=== Chat2Desk Service Tests Completed ===');
  logger.info('If token is invalid, message will be in outbox queue for retry');

  process.exit(0);
}

testChat2DeskService().catch((error) => {
  logger.error('Chat2Desk test failed:', error);
  process.exit(1);
});
