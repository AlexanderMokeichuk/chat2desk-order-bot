import { DialogHandler } from '@/handlers';
import { logger } from '@utils/logger';

async function testDialogHandler() {
  logger.info('=== Testing Dialog Handler ===');

  const dialogHandler = new DialogHandler();
  const testClientId = 'test_client_dialog_123';

  logger.info('Simulating full dialog flow...\n');

  logger.info('Step 1: Client says "Привет"');
  await dialogHandler.processMessage(testClientId, 'Привет');
  await sleep(1000);

  logger.info('\nStep 2: Client provides address');
  await dialogHandler.processMessage(testClientId, 'ул. Киевская 123, кв. 45');
  await sleep(1000);

  logger.info('\nStep 3: Client provides phone');
  await dialogHandler.processMessage(testClientId, '0555123456');
  await sleep(1000);

  logger.info('\nStep 4: Client provides bottles count');
  await dialogHandler.processMessage(testClientId, '5');
  await sleep(1000);

  logger.info('\nStep 5: Client confirms order');
  await dialogHandler.processMessage(testClientId, 'Да');
  await sleep(1000);

  logger.info('\n=== Dialog Test Completed ===');
  logger.info('Check your Chat2Desk (or check logs above for API errors)');
  logger.info('Check database for created order');

  process.exit(0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

testDialogHandler().catch((error) => {
  logger.error('Dialog test failed:', error);
  process.exit(1);
});
