import type { NodeId } from './node.ts';
import type { NodeProperty, NodePropertyId } from './property.ts';

export interface NodePropertyRepository {
  findById(id: NodePropertyId): Promise<NodeProperty | null>;
  getById(id: NodePropertyId): Promise<NodeProperty>;
  /**
   * Finds all properties for a given node ID.
   * Returns an empty array if no properties are found.
   */
  getAllByNodeId(nodeId: NodeId): Promise<NodeProperty[]>;
  /**
   * Finds all properties for a node by its path, e.g. '/Root/Child'.
   * Returns an empty array if no properties are found.
   */
  getAllByNodePath(path: string): Promise<NodeProperty[]>;
  add(property: NodeProperty): Promise<void>;
}
