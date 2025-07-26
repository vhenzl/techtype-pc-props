import * as uuid from 'uuid';
import type { NodeId } from './node.ts';
import { type Branded } from './shared-kernel/branded-types.ts';
import { BusinessError } from './shared-kernel/errors.ts';
import type { PropertyValue } from './value.ts';

export type NodePropertyId = Branded<string, 'NodePropertyId'>;

export function createNewNodePropertyId(): NodePropertyId {
  return uuid.v7() as NodePropertyId;
}

export function createNodePropertyIdFrom(id: string): NodePropertyId {
  if (!uuid.validate(id)) {
    throw new BusinessError('Invalid UUID format for NodePropertyId');
  }
  if (id === uuid.NIL) {
    throw new BusinessError('NodePropertyId must not be a empty UUID');
  }
  return id as NodePropertyId;
}

export class NodeProperty {
  #id: NodePropertyId;
  #nodeId: NodeId;
  #name: string;
  #value: PropertyValue;

  constructor(
    id: NodePropertyId,
    nodeId: NodeId,
    name: string,
    value: PropertyValue,
  ) {
    name = name.trim();
    if (name === '') {
      throw new BusinessError('NodeProperty name cannot be empty');
    }

    this.#id = id;
    this.#name = name;
    this.#nodeId = nodeId;
    this.#value = value;
  }

  get id(): NodePropertyId {
    return this.#id;
  }

  get nodeId(): NodeId {
    return this.#nodeId;
  }

  get name(): string {
    return this.#name;
  }

  get value(): PropertyValue {
    return this.#value;
  }
}
