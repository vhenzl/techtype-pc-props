import * as uuid from 'uuid';
import { describe, expect, it } from 'vitest';
import { Node, createNewNodeId, createNodeIdFrom } from './node.ts';
import { BusinessError } from './shared-kernel/errors.ts';

describe('Node', () => {
  const validId = createNewNodeId();
  const validParentId = createNewNodeId();
  const validName = 'Test Node';

  it('creates a node with valid data', () => {
    const node = new Node(validId, validParentId, validName);
    expect(node.id).toBe(validId);
    expect(node.parentId).toBe(validParentId);
    expect(node.name).toBe(validName);
  });

  it('creates a node without parent (root node)', () => {
    const node = new Node(validId, null, validName);
    expect(node.id).toBe(validId);
    expect(node.parentId).toBe(null);
    expect(node.name).toBe(validName);
  });

  it('trims the name', () => {
    const node = new Node(validId, validParentId, '  Trimmed  ');
    expect(node.name).toBe('Trimmed');
  });

  it('throws if name is empty', () => {
    expect(() => new Node(validId, validParentId, '   ')).toThrow(BusinessError);
  });
});

describe('createNewNodeId', () => {
  it('creates a valid UUID', () => {
    const id = createNewNodeId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('creates unique IDs', () => {
    const id1 = createNewNodeId();
    const id2 = createNewNodeId();
    expect(id1).not.toBe(id2);
  });
});

describe('createNodeIdFrom', () => {
  it.for([
    [uuid.v1()],
    [uuid.v4()],
    [uuid.v7()],
    ['00000000-0000-7000-a000-000000000000'], // minimal valid v7
  ] as Array<[string]>)('returns a NodeId for a valid UUID (%s)', ([value]) => {
    expect(createNodeIdFrom(value)).toBe(value); // any valid UUID version will do
  });

  it.for([
    [uuid.v4().replaceAll('-', '')],
    ['not-a-uuid'],
    [''],
    ['00000000-0000-7000-0000-000000000000'],
  ] as Array<[string]>)('throws for an invalid UUID string (%s)', ([value]) => {
    expect(() => createNodeIdFrom(value)).toThrow(BusinessError);
  });

  it('throws for the empty (NIL) UUID', () => {
    expect(() => createNodeIdFrom('00000000-0000-0000-0000-000000000000')).toThrow(BusinessError);
  });
});
