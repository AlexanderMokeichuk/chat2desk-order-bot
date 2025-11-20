/**
 * Validation result
 */
export interface AddressValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate delivery address
 */
export function validateAddress(address: string): AddressValidationResult {
  if (!address || address.trim().length === 0) {
    return {
      isValid: false,
      error: 'Адрес не может быть пустым',
    };
  }

  const trimmed = address.trim();

  if (trimmed.length < 5) {
    return {
      isValid: false,
      error: 'Адрес слишком короткий. Укажите полный адрес доставки',
    };
  }

  if (trimmed.length > 200) {
    return {
      isValid: false,
      error: 'Адрес слишком длинный',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Check if address is valid (simple check)
 */
export function isValidAddress(address: string): boolean {
  return validateAddress(address).isValid;
}
