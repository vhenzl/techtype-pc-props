import type { Node, NodeId } from './node.ts';

export interface NodeRepository {
  findById(id: NodeId): Promise<Node | null>;
  getById(id: NodeId): Promise<Node>;
  /**
   * Finds a node by its path, e.g. '/Root/Child'
   */
  findByPath(path: string): Promise<Node | null>;
  add(node: Node): Promise<void>;
  /**
   * Checks if a node with the given name exists under the specified parent node,
   * or as a root node if parentId is null.
   */
  existsInParent(name: string, parentId: NodeId | null): Promise<boolean>;
}
