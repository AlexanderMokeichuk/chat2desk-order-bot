/**
 * Validation result
 */
export interface BottlesValidationResult {
  isValid: boolean;
  count?: number;
  error?: string;
}

/**
 * Validate bottles count
 */
export function validateBottles(input: string | number): BottlesValidationResult {
  let count: number;

  if (typeof input === 'string') {
    const cleaned = input.replace(/\D/g, '');

    if (cleaned.length === 0) {
      return {
        isValid: false,
        error: 'Укажите количество бутылей числом',
      };
    }

    count = parseInt(cleaned, 10);
  } else {
    count = input;
  }

  if (isNaN(count)) {
    return {
      isValid: false,
      error: 'Укажите количество бутылей числом',
    };
  }

  if (count < 1) {
    return {
      isValid: false,
      error: 'Минимальное количество - 1 бутыль',
    };
  }

  if (count > 50) {
    return {
      isValid: false,
      error: 'Максимальное количество - 50 бутылей. Для больших заказов свяжитесь с менеджером',
    };
  }

  return {
    isValid: true,
    count,
  };
}

/**
 * Check if bottles count is valid (simple check)
 */
export function isValidBottles(input: string | number): boolean {
  return validateBottles(input).isValid;
}
