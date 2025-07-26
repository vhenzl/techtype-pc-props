import { describe, expect, it } from 'vitest';
import { BusinessError } from './shared-kernel/errors.ts';
import { PropertyValue } from './value.ts';

describe('PropertyValue', () => {
  it('creates with valid number value', () => {
    const value = new PropertyValue(123.45);
    expect(value.value).toBe(123.45);
  });

  it('creates with zero value', () => {
    const value = new PropertyValue(0);
    expect(value.value).toBe(0);
  });

  it('creates with negative value', () => {
    const value = new PropertyValue(-10.5);
    expect(value.value).toBe(-10.5);
  });

  it('equals returns true for same value', () => {
    const v1 = new PropertyValue(100.5);
    const v2 = new PropertyValue(100.5);
    expect(v1.equals(v2)).toBe(true);
  });

  it('equals returns false for different value', () => {
    const v1 = new PropertyValue(100);
    const v2 = new PropertyValue(200);
    expect(v1.equals(v2)).toBe(false);
  });

  it.for([
    [NaN, 'NaN'],
    [Infinity, 'Infinity'],
    [-Infinity, '-Infinity'],
    ['100', 'string'],
    [null, 'null'],
    [undefined, 'undefined'],
    [{}, 'object'],
    [[], 'array'],
  ])('throws for invalid value: %s (%s)', ([val]) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    expect(() => new PropertyValue(val as any)).toThrow(BusinessError);
  });
});
