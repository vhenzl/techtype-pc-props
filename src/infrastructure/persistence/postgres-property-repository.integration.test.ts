import type { Client } from 'pg';
import * as uuid from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNewNodeId, createNodeIdFrom, type NodeId } from '../../domain/node.ts';
import { NodeProperty, createNewNodePropertyId, createNodePropertyIdFrom } from '../../domain/property.ts';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { PropertyValue } from '../../domain/value.ts';
import { createConnection } from './db.ts';
import { PostgresNodePropertyRepository } from './postgres-property-repository.ts';

describe('PostgresNodePropertyRepository', () => {
  let client: Client;
  let propertyRepository: PostgresNodePropertyRepository;
  let uniqueNamePrefix: string;

  function uniqueName(name: string): string {
    return `${uniqueNamePrefix}:${name}`;
  }

  async function createTestRootNode(): Promise<NodeId> {
    const nodeId = createNewNodeId();
    const name = uniqueName(`Node-${nodeId}`);
    const node = { id: nodeId, name, parentId: null };
    await client.query('INSERT INTO nodes (id, name, parent_id) VALUES ($1, $2, $3)', [node.id, node.name, node.parentId]);
    return nodeId;
  }

  beforeEach(async () => {
    const testConnectionString = process.env['DATABASE_URL'] || import.meta.env['VITE_DATABASE_URL'];
    if (!testConnectionString) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable is required for integration tests');
    }

    uniqueNamePrefix = `Test:${uuid.v4()}`;
    client = await createConnection(testConnectionString);
    propertyRepository = new PostgresNodePropertyRepository(client);
  });

  afterEach(async () => {
    await client.query('DELETE FROM nodes WHERE name LIKE $1', [`${uniqueNamePrefix}%`]);
    await client.end();
  });

  describe('findById() with seed data', () => {
    it('finds existing properties', async () => {
      const heightPropertyId = createNodePropertyIdFrom('00000000-0000-7000-a000-200000000001');
      const coresPropertyId = createNodePropertyIdFrom('00000000-0000-7000-a000-200000000004');

      const heightProperty = await propertyRepository.findById(heightPropertyId);
      expect(heightProperty?.name).toBe('Height');
      expect(heightProperty?.value.value).toBe(450.00);

      const coresProperty = await propertyRepository.findById(coresPropertyId);
      expect(coresProperty?.name).toBe('Cores');
      expect(coresProperty?.value.value).toBe(4);
    });

    it('returns null for non-existent property', async () => {
      const nonExistentId = createNewNodePropertyId();
      const result = await propertyRepository.findById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('getById() with seed data', () => {
    it('returns existing property', async () => {
      const heightPropertyId = createNodePropertyIdFrom('00000000-0000-7000-a000-200000000001');
      const property = await propertyRepository.getById(heightPropertyId);
      expect(property.name).toBe('Height');
      expect(property.value.value).toBe(450.00);
    });

    it('throws NotFoundError for non-existent property', async () => {
      const nonExistentId = createNewNodePropertyId();
      await expect(propertyRepository.getById(nonExistentId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAllByNodeId() with seed data', () => {
    it('returns all properties a node', async () => {
      const cpuId = createNodeIdFrom('00000000-0000-7000-a000-100000000003'); // CPU node
      const properties = await propertyRepository.getAllByNodeId(cpuId);

      expect(properties).toHaveLength(2);
      expect(properties.map(p => p.name)).toContain('Cores');
      expect(properties.map(p => p.name)).toContain('Power');
    });

    it('returns empty array for non-existent node', async () => {
      const nonExistentId = createNewNodeId();
      const properties = await propertyRepository.getAllByNodeId(nonExistentId);

      expect(properties).toHaveLength(0);
    });
  });

  describe('getAllByNodePath() with seed data', () => {
    it('returns properties for a node by its path', async () => {
      const properties = await propertyRepository.getAllByNodePath('/AlphaPC/Processing');

      expect(properties).toHaveLength(1);
      expect(properties[0]?.name).toBe('RAM');
      expect(properties[0]?.value.value).toBe(32000.00);
    });

    it('returns empty array for non-existent path', async () => {
      const properties = await propertyRepository.getAllByNodePath('/NonExistent');

      expect(properties).toHaveLength(0);
    });

    it('returns empty array for invalid path', async () => {
      const properties = await propertyRepository.getAllByNodePath('/AlphaPC/NonExistent');

      expect(properties).toHaveLength(0);
    });
  });

  describe('add property', () => {
    it('adds a new integer property successfully', async () => {
      const nodeId = await createTestRootNode();
      const propertyId = createNewNodePropertyId();
      const value = new PropertyValue(99);
      const property = new NodeProperty(propertyId, nodeId, 'TestProperty', value);

      await propertyRepository.add(property);
      const retrieved = await propertyRepository.findById(propertyId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(propertyId);
      expect(retrieved?.nodeId).toBe(nodeId);
      expect(retrieved?.name).toBe('TestProperty');
      expect(retrieved?.value.value).toBe(99);
    });

    it('adds a new decimal property successfully', async () => {
      const nodeId = await createTestRootNode();
      const propertyId = createNewNodePropertyId();
      const value = new PropertyValue(1.724752);
      const property = new NodeProperty(propertyId, nodeId, 'TestProperty', value);

      await propertyRepository.add(property);
      const retrieved = await propertyRepository.findById(propertyId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(propertyId);
      expect(retrieved?.nodeId).toBe(nodeId);
      expect(retrieved?.name).toBe('TestProperty');
      expect(retrieved?.value.value).toBe(1.724752);
    });
  });

  describe('existsInNode', () => {
    it('returns true when property exists for node', async () => {
      const nodeId = await createTestRootNode();
      const propertyId = createNewNodePropertyId();
      const value = new PropertyValue(123);
      const property = new NodeProperty(propertyId, nodeId, 'ExistingProperty', value);

      await propertyRepository.add(property);
      const exists = await propertyRepository.existsInNode('ExistingProperty', nodeId);

      expect(exists).toBe(true);
    });

    it('returns false when property does not exist for node', async () => {
      const nodeId = await createTestRootNode();
      const exists = await propertyRepository.existsInNode('NonExistentProperty', nodeId);

      expect(exists).toBe(false);
    });

    it('returns false when property exists for different node', async () => {
      const nodeId1 = await createTestRootNode();
      const nodeId2 = await createTestRootNode();

      const propertyId = createNewNodePropertyId();
      const value = new PropertyValue(123);
      const property = new NodeProperty(propertyId, nodeId1, 'TestProperty', value);

      await propertyRepository.add(property);
      const exists = await propertyRepository.existsInNode('TestProperty', nodeId2);

      expect(exists).toBe(false);
    });
  });
});
