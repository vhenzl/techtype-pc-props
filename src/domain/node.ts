import * as uuid from 'uuid';
import { type Branded } from './shared-kernel/branded-types.ts';
import { BusinessError } from './shared-kernel/errors.ts';

export type NodeId = Branded<string, 'NodeId'>;

export function createNewNodeId(): NodeId {
  return uuid.v7() as NodeId;
}

export function createNodeIdFrom(id: string): NodeId {
  if (!uuid.validate(id)) {
    throw new BusinessError('Invalid UUID format for NodeId');
  }
  if (id === uuid.NIL) {
    throw new BusinessError('NodeId must not be a empty UUID');
  }
  return id as NodeId;
}

export class Node {
  #id: NodeId;
  #parentId: NodeId | null;
  #name: string;

  constructor(
    id: NodeId,
    parentId: NodeId | null,
    name: string,
  ) {
    name = name.trim();
    if (name === '') {
      throw new BusinessError('Node name cannot be empty');
    }

    this.#id = id;
    this.#name = name;
    this.#parentId = parentId;
  }

  get id(): NodeId {
    return this.#id;
  }

  get parentId(): NodeId | null {
    return this.#parentId;
  }

  get name(): string {
    return this.#name;
  }
}
