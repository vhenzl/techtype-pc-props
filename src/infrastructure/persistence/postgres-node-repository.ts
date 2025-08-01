import type { Client, QueryResult } from 'pg';
import type { NodeRepository } from '../../domain/node-repository.ts';
import { Node, createNodeIdFrom, type NodeId } from '../../domain/node.ts';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';

interface NodeRow {
  id: string;
  name: string;
  parent_id: string | null;
}

function createNodeFromRow(row: NodeRow): Node {
  return new Node(
    createNodeIdFrom(row.id),
    row.parent_id ? createNodeIdFrom(row.parent_id) : null,
    row.name,
  );
}

export class PostgresNodeRepository implements NodeRepository {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async findById(id: NodeId): Promise<Node | null> {
    const query = 'SELECT id, name, parent_id FROM nodes WHERE id = $1';
    const result: QueryResult<NodeRow> = await this.client.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return createNodeFromRow(row);
  }

  async getById(id: NodeId): Promise<Node> {
    const node = await this.findById(id);
    if (!node) {
      throw new NotFoundError(`Node with id ${id} not found`);
    }
    return node;
  }

  async findByPath(path: string): Promise<Node | null> {
    if (!path || path === '/') {
      return null;
    }

    const query = `
      SELECT id, name, parent_id
      FROM nodes_with_path
      WHERE path = $1
    `;

    const result: QueryResult<NodeRow> = await this.client.query(query, [path]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return createNodeFromRow(row);
  }

  async add(node: Node): Promise<void> {
    const query = 'INSERT INTO nodes (id, name, parent_id) VALUES ($1, $2, $3)';
    const values = [node.id, node.name, node.parentId];

    await this.client.query(query, values);
  }

  async existsInParent(name: string, parentId: NodeId | null): Promise<boolean> {
    const query = parentId === null
      ? 'SELECT 1 FROM nodes WHERE name = $1 AND parent_id IS NULL'
      : 'SELECT 1 FROM nodes WHERE name = $1 AND parent_id = $2';

    const params = parentId === null ? [name] : [name, parentId];
    const result = await this.client.query(query, params);

    return result.rows.length > 0;
  }
}
