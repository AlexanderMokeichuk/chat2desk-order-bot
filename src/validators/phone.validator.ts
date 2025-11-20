/**
 * Normalize phone number to +996XXXXXXXXX format
 *
 * Accepts formats:
 * - 555123456 → +996555123456
 * - 0555123456 → +996555123456
 * - 996555123456 → +996555123456
 * - +996555123456 → +996555123456
 */
export function normalizePhone(phone: string): string | null {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.match(/^\d{9}$/)) {
    cleaned = '+996' + cleaned;
  } else if (cleaned.match(/^0\d{9}$/)) {
    cleaned = '+996' + cleaned.substring(1);
  } else if (cleaned.match(/^996\d{9}$/)) {
    cleaned = '+' + cleaned;
  } else if (cleaned.match(/^\+996\d{9}$/)) {
    return cleaned;
  } else {
    return null;
  }

  return cleaned;
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return normalized !== null;
}

/**
 * Validation result with normalized value
 */
export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validate and normalize phone number
 */
export function validatePhone(phone: string): PhoneValidationResult {
  if (!phone || phone.trim().length === 0) {
    return {
      isValid: false,
      error: 'Телефон не может быть пустым',
    };
  }

  const normalized = normalizePhone(phone);

  if (!normalized) {
    return {
      isValid: false,
      error: 'Неверный формат телефона. Пример: +996555123456 или 0555123456',
    };
  }

  return {
    isValid: true,
    normalized,
  };
}
