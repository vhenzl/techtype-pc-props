import type { Client } from 'pg';
import * as uuid from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Node, createNewNodeId, createNodeIdFrom } from '../../domain/node.ts';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { createConnection } from './db.ts';
import { PostgresNodeRepository } from './postgres-node-repository.ts';

describe('PostgresNodeRepository', () => {
  let client: Client;
  let repository: PostgresNodeRepository;
  let uniqueNamePrefix: string;

  function uniqueName(name: string): string {
    return `${uniqueNamePrefix}:${name}`;
  }

  beforeEach(async () => {
    const testConnectionString = process.env['DATABASE_URL'] || import.meta.env['VITE_DATABASE_URL'];
    if (!testConnectionString) {
      throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable is required for integration tests');
    }

    uniqueNamePrefix = `Test:${uuid.v4()}`;
    client = await createConnection(testConnectionString);
    repository = new PostgresNodeRepository(client);
  });

  afterEach(async () => {
    await client.query('DELETE FROM nodes WHERE name LIKE $1', [`${uniqueNamePrefix}%`]);
    await client.end();
  });

  describe('findById() with seed data', () => {
    it('finds existing nodes', async () => {
      // Use seed data UUIDs
      const alphaId = createNodeIdFrom('00000000-0000-7000-a000-100000000001');
      const processingId = createNodeIdFrom('00000000-0000-7000-a000-100000000002');
      const cpuId = createNodeIdFrom('00000000-0000-7000-a000-100000000003');

      const alphaNode = await repository.findById(alphaId);
      expect(alphaNode?.name).toBe('AlphaPC');
      expect(alphaNode?.parentId).toBeNull();

      const processingNode = await repository.findById(processingId);
      expect(processingNode?.name).toBe('Processing');
      expect(processingNode?.parentId).toBe(alphaId);

      const cpuNode = await repository.findById(cpuId);
      expect(cpuNode?.name).toBe('CPU');
      expect(cpuNode?.parentId).toBe(processingId);
    });

    it('returns null for non-existent node', async () => {
      const nonExistentId = createNewNodeId();
      const result = await repository.findById(nonExistentId);
      expect(result).toBeNull();
    });
  });

  describe('getById() with seed data', () => {
    it('returns existing node', async () => {
      const alphaId = createNodeIdFrom('00000000-0000-7000-a000-100000000001');
      const node = await repository.getById(alphaId);
      expect(node.name).toBe('AlphaPC');
      expect(node.parentId).toBeNull();
    });

    it('throws NotFoundError for non-existent node', async () => {
      const nonExistentId = createNewNodeId();
      await expect(repository.getById(nonExistentId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('findByPath() with seed data', () => {
    it('finds root node by path', async () => {
      const node = await repository.findByPath('/AlphaPC');
      expect(node?.name).toBe('AlphaPC');
      expect(node?.parentId).toBeNull();
    });

    it('finds deeply nested node by path', async () => {
      const node = await repository.findByPath('/AlphaPC/Processing/CPU');
      expect(node?.name).toBe('CPU');
    });

    it('returns null for non-existent path', async () => {
      const node = await repository.findByPath('/NonExistent');
      expect(node).toBeNull();
    });

    it('returns null for partially valid path', async () => {
      const node = await repository.findByPath('/AlphaPC/NonExistent');
      expect(node).toBeNull();
    });

    it('returns null for empty path', async () => {
      const node = await repository.findByPath('');
      expect(node).toBeNull();
    });

    it('returns null for root path', async () => {
      const node = await repository.findByPath('/');
      expect(node).toBeNull();
    });
  });

  describe('existsInParent() with seed data', () => {
    it('returns true for existing root node', async () => {
      const exists = await repository.existsInParent('AlphaPC', null);
      expect(exists).toBe(true);
    });

    it('returns false for non-existing root node', async () => {
      const exists = await repository.existsInParent('NonExistent', null);
      expect(exists).toBe(false);
    });

    it('returns true for existing child node', async () => {
      const alphaId = createNodeIdFrom('00000000-0000-7000-a000-100000000001');
      const exists = await repository.existsInParent('Processing', alphaId);
      expect(exists).toBe(true);
    });

    it('returns false for non-existing child node', async () => {
      const alphaId = createNodeIdFrom('00000000-0000-7000-a000-100000000001');
      const exists = await repository.existsInParent('NonExistent', alphaId);
      expect(exists).toBe(false);
    });
  });

  describe('add()', () => {
    it('adds a new node successfully', async () => {
      const rootId = createNewNodeId();
      const rootName = uniqueName('Node');
      const root = new Node(rootId, null, rootName);
      const childId = createNewNodeId();
      const childName = uniqueName('Child');
      const child = new Node(childId, rootId, childName);

      await repository.add(root);
      await repository.add(child);
      const retrievedRoot = await repository.findById(rootId);
      const retrievedChild = await repository.findById(childId);

      expect(retrievedRoot).not.toBeNull();
      expect(retrievedRoot?.id).toBe(rootId);
      expect(retrievedRoot?.name).toBe(rootName);
      expect(retrievedRoot?.parentId).toBe(null);

      expect(retrievedChild).not.toBeNull();
      expect(retrievedChild?.id).toBe(childId);
      expect(retrievedChild?.name).toBe(childName);
      expect(retrievedChild?.parentId).toBe(rootId);
    });
  });
});
