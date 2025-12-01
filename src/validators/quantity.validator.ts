/**
 * Validation result
 */
export interface QuantityValidationResult {
  isValid: boolean;
  count?: number;
  error?: string;
}

/**
 * Validate quantity
 */
export function validateQuantity(input: string | number): QuantityValidationResult {
  let count: number;

  if (typeof input === 'string') {
    const cleaned = input.replace(/\D/g, '');

    if (cleaned.length === 0) {
      return {
        isValid: false,
        error: 'Please specify quantity as a number',
      };
    }

    count = parseInt(cleaned, 10);
  } else {
    count = input;
  }

  if (isNaN(count)) {
    return {
      isValid: false,
      error: 'Please specify quantity as a number',
    };
  }

  if (count < 1) {
    return {
      isValid: false,
      error: 'Minimum quantity is 1',
    };
  }

  if (count > 50) {
    return {
      isValid: false,
      error: 'Maximum quantity is 50. For larger orders, please contact our manager',
    };
  }

  return {
    isValid: true,
    count,
  };
}

/**
 * Check if quantity is valid (simple check)
 */
export function isValidQuantity(input: string | number): boolean {
  return validateQuantity(input).isValid;
}
