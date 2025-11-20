import { validatePhone, validateAddress, validateBottles } from '@/validators';
import { logger } from '@utils/logger';

function testValidators() {
  logger.info('=== Testing Validators ===');

  logger.info('\n--- Phone Validator ---');

  const phoneTests = [
    '555123456',
    '0555123456',
    '996555123456',
    '+996555123456',
    '555 123 456',
    '0555-123-456',
    '123',
    'abc',
  ];

  phoneTests.forEach((phone) => {
    const result = validatePhone(phone);
    logger.info(`Phone "${phone}":`, result);
  });

  logger.info('\n--- Address Validator ---');

  const addressTests = [
    'ул. Киевская 123',
    'мкр. Асанбай, 12-45',
    'Проспект Чуй 265',
    'ул',
    '',
    'a'.repeat(201),
  ];

  addressTests.forEach((address) => {
    const result = validateAddress(address);
    logger.info(`Address "${address.substring(0, 50)}...":`, result);
  });

  logger.info('\n--- Bottles Validator ---');

  const bottlesTests = ['1', '5', '50', '0', '51', '10 бутылей', 'abc', 25];

  bottlesTests.forEach((bottles) => {
    const result = validateBottles(bottles);
    logger.info(`Bottles "${bottles}":`, result);
  });

  logger.info('\n=== Validator Tests Completed ===');
}

testValidators();
