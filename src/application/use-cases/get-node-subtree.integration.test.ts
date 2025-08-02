import type { Client } from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNewNodeId } from '../../domain/node.ts';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { createConnection } from '../../infrastructure/persistence/db.ts';
import { withQueryValidation } from '../../infrastructure/processing.ts';
import { InvalidQueryError } from '../building-blocks/query.ts';
import { createGetNodeSubtreeQuery, createGetNodeSubtreeQueryHandler, GetNodeSubtreeQuerySchema } from './get-node-subtree.ts';

describe('get node subtree query', () => {
  let db: Client;
  let handler: ReturnType<typeof createGetNodeSubtreeQueryHandler>;

  beforeEach(async () => {
    const testConnectionString = process.env['DATABASE_URL'] || import.meta.env['VITE_DATABASE_URL'];
    if (!testConnectionString) {
      throw new Error('DATABASE_URL environment variable is required for integration tests');
    }

    db = await createConnection(testConnectionString);
    handler = withQueryValidation(
      GetNodeSubtreeQuerySchema,
      createGetNodeSubtreeQueryHandler({ db }),
    );
  });

  afterEach(async () => {
    await db.end();
  });

  it('returns single node with properties when querying leaf node', async () => {
    // CPU node from seed data
    const cpuId = '00000000-0000-7000-a000-100000000003';
    const query = createGetNodeSubtreeQuery({ nodeId: cpuId });

    const result = await handler(query);

    expect(result.id).toBe(cpuId);
    expect(result.name).toBe('CPU');
    expect(result.parentId).toBe('00000000-0000-7000-a000-100000000002'); // Processing node
    expect(result.children).toHaveLength(0); // Leaf node
    expect(result.properties).toHaveLength(2);

    const coresProperty = result.properties.find(p => p.name === 'Cores');
    const powerProperty = result.properties.find(p => p.name === 'Power');

    expect(coresProperty?.value).toBe(4);
    expect(powerProperty?.value).toBe(2.41);
  });

  it('returns complete subtree from root node', async () => {
    // AlphaPC root node from seed data
    const alphaId = '00000000-0000-7000-a000-100000000001';
    const query = createGetNodeSubtreeQuery({ nodeId: alphaId });

    const result = await handler(query);

    expect(result.id).toBe(alphaId);
    expect(result.name).toBe('AlphaPC');
    expect(result.parentId).toBeNull(); // Root node
    expect(result.children).toHaveLength(2); // Processing and Storage
    expect(result.properties).toHaveLength(2);

    // Check AlphaPC properties
    const heightProperty = result.properties.find(p => p.name === 'Height');
    const widthProperty = result.properties.find(p => p.name === 'Width');

    expect(heightProperty?.value).toBe(450);
    expect(widthProperty?.value).toBe(180);

    // Check Processing child
    const processingChild = result.children.find(c => c.name === 'Processing');
    expect(processingChild).toBeDefined();
    expect(processingChild?.children).toHaveLength(2); // CPU and Graphics
    expect(processingChild?.properties).toHaveLength(1);

    const ramProperty = processingChild?.properties.find(p => p.name === 'RAM');
    expect(ramProperty?.value).toBe(32000);

    // Check CPU grandchild
    const cpuGrandchild = processingChild?.children.find(c => c.name === 'CPU');
    expect(cpuGrandchild?.name).toBe('CPU');
    expect(cpuGrandchild?.children).toHaveLength(0);
    expect(cpuGrandchild?.properties).toHaveLength(2);
  });

  it('returns the same subtree when queried by nodeId and by path', async () => {
    // AlphaPC root node from seed data
    const alphaId = '00000000-0000-7000-a000-100000000001';
    const alphaPath = '/AlphaPC';

    const byIdQuery = createGetNodeSubtreeQuery({ nodeId: alphaId });
    const byPathQuery = createGetNodeSubtreeQuery({ path: alphaPath });

    const [byIdResult, byPathResult] = await Promise.all([
      handler(byIdQuery),
      handler(byPathQuery),
    ]);

    expect(byIdResult).toEqual(byPathResult);
  });

  it('throws NotFoundError when node does not exist', async () => {
    const nonExistentId = createNewNodeId();
    const query = createGetNodeSubtreeQuery({ nodeId: nonExistentId });

    const result = handler(query);

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow(`Node with id ${nonExistentId} not found`);
  });

  it.for(
    [[''], ['invalid'], ['10000000-0000-0000-0000-000000000000']] as Array<[string]>,
  )('throws InvalidQueryError for invalid query data (by.nodeId = "%s")', async ([nodeId]) => {
    const query = createGetNodeSubtreeQuery({ nodeId });

    const result = handler(query);

    await expect(result).rejects.toThrow(InvalidQueryError);
    await expect(result).rejects.toThrow(expect.objectContaining({
      errors: [
        {
          message: 'Invalid UUID',
          path: ['by', 'nodeId'],
        },
      ],
      name: 'InvalidQueryError',
    }) as InvalidQueryError);
  });

  it.for(
    [[''], ['/'], ['invalid']] as Array<[string]>,
  )('throws InvalidQueryError for invalid query data (by.path = "%s")', async ([path]) => {
    const query = createGetNodeSubtreeQuery({ path });

    const result = handler(query);

    await expect(result).rejects.toThrow(InvalidQueryError);
    await expect(result).rejects.toThrow(expect.objectContaining({
      errors: [
        {
          message: 'Path must start with a slash and not be empty',
          path: ['by', 'path'],
        },
      ],
      name: 'InvalidQueryError',
    }) as InvalidQueryError);
  });
});
