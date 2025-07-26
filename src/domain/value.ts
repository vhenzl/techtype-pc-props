import { BusinessError } from './shared-kernel/errors.ts';

/**
 * TODO: Use BigDecimal or decimal.js instead of number
 */
export class PropertyValue {
  #value: number;

  constructor(value: number) {
    if (!PropertyValue.isValidValue(value)) {
      throw new BusinessError('Invalid value for PropertyValue');
    }
    this.#value = value;
  }

  get value(): number {
    return this.#value;
  }

  equals(other: PropertyValue): boolean {
    return this.#value === other.value;
  }

  private static isValidValue(value: number): boolean {
    return typeof value === 'number' &&
      !isNaN(value) &&
      isFinite(value);
  }
}
