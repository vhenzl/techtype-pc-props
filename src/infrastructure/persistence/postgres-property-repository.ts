import type { Client, QueryResult } from 'pg';
import { createNodeIdFrom, type NodeId } from '../../domain/node.ts';
import type { NodePropertyRepository } from '../../domain/property-repository.ts';
import { NodeProperty, createNodePropertyIdFrom, type NodePropertyId } from '../../domain/property.ts';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { PropertyValue } from '../../domain/value.ts';

interface PropertyRow {
  id: string;
  node_id: string;
  name: string;
  value: string;
}

function createPropertyFromRow(row: PropertyRow): NodeProperty {
  return new NodeProperty(
    createNodePropertyIdFrom(row.id),
    createNodeIdFrom(row.node_id),
    row.name,
    new PropertyValue(parseFloat(row.value)),
  );
}

export class PostgresNodePropertyRepository implements NodePropertyRepository {
  private readonly client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async findById(id: NodePropertyId): Promise<NodeProperty | null> {
    const query = 'SELECT id, node_id, name, value FROM node_properties WHERE id = $1';
    const result: QueryResult<PropertyRow> = await this.client.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return createPropertyFromRow(row);
  }

  async getById(id: NodePropertyId): Promise<NodeProperty> {
    const property = await this.findById(id);
    if (!property) {
      throw new NotFoundError(`Property with id ${id} not found`);
    }
    return property;
  }

  async getAllByNodeId(nodeId: NodeId): Promise<NodeProperty[]> {
    const query = 'SELECT id, node_id, name, value FROM node_properties WHERE node_id = $1';
    const result: QueryResult<PropertyRow> = await this.client.query(query, [nodeId]);

    return result.rows.map(createPropertyFromRow);
  }

  async getAllByNodePath(path: string): Promise<NodeProperty[]> {
    if (!path) {
      return [];
    }

    const query = `
      SELECT p.id, p.node_id, p.name, p.value
      FROM node_properties p
      INNER JOIN nodes_with_path np ON p.node_id = np.id
      WHERE np.path = $1
    `;

    const result: QueryResult<PropertyRow> = await this.client.query(query, [path]);

    return result.rows.map(createPropertyFromRow);
  }

  async add(property: NodeProperty): Promise<void> {
    const query = 'INSERT INTO node_properties (id, node_id, name, value) VALUES ($1, $2, $3, $4)';
    const values = [property.id, property.nodeId, property.name, property.value.value];

    await this.client.query(query, values);
  }
}
