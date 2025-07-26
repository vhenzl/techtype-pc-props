import * as uuid from 'uuid';
import { describe, expect, it } from 'vitest';
import { createNewNodeId } from './node.ts';
import { NodeProperty, createNewNodePropertyId, createNodePropertyIdFrom } from './property.ts';
import { BusinessError } from './shared-kernel/errors.ts';
import { PropertyValue } from './value.ts';

describe('NodeProperty', () => {
  const validId = createNewNodePropertyId();
  const validNodeId = createNewNodeId();
  const validName = 'Test Property';
  const validValue = new PropertyValue(100);

  it('creates a property with valid data', () => {
    const property = new NodeProperty(validId, validNodeId, validName, validValue);
    expect(property.id).toBe(validId);
    expect(property.nodeId).toBe(validNodeId);
    expect(property.name).toBe(validName);
    expect(property.value.value).toBe(validValue.value);
  });

  it('trims the name', () => {
    const property = new NodeProperty(validId, validNodeId, '  Trimmed  ', validValue);
    expect(property.name).toBe('Trimmed');
  });

  it('throws if name is empty', () => {
    expect(() => new NodeProperty(validId, validNodeId, '   ', validValue)).toThrow(BusinessError);
  });
});

describe('createNewNodePropertyId', () => {
  it('creates a valid UUID', () => {
    const id = createNewNodePropertyId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('creates unique IDs', () => {
    const id1 = createNewNodePropertyId();
    const id2 = createNewNodePropertyId();
    expect(id1).not.toBe(id2);
  });
});

describe('createNodePropertyIdFrom', () => {
  it.for([
    [uuid.v1()],
    [uuid.v4()],
    [uuid.v7()],
    ['00000000-0000-7000-a000-000000000000'], // minimal valid v7
  ] as Array<[string]>)('returns a NodePropertyId for a valid UUID (%s)', ([value]) => {
    expect(createNodePropertyIdFrom(value)).toBe(value); // any valid UUID version will do
  });

  it.for([
    [uuid.v4().replaceAll('-', '')],
    ['not-a-uuid'],
    [''],
    ['00000000-0000-7000-0000-000000000000'],
  ] as Array<[string]>)('throws for an invalid UUID string (%s)', ([value]) => {
    expect(() => createNodePropertyIdFrom(value)).toThrow(BusinessError);
  });

  it('throws for the empty (NIL) UUID', () => {
    expect(() => createNodePropertyIdFrom('00000000-0000-0000-0000-000000000000')).toThrow(BusinessError);
  });
});
