import type { Client } from 'pg';
import * as uuid from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNewNodeId, createNodeIdFrom, type NodeId } from '../../domain/node.ts';
import { BusinessError, NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { createConnection } from '../../infrastructure/persistence/db.ts';
import { PostgresNodeRepository } from '../../infrastructure/persistence/postgres-node-repository.ts';
import { PostgresNodePropertyRepository } from '../../infrastructure/persistence/postgres-property-repository.ts';
import { withCommandValidation } from '../../infrastructure/processing.ts';
import { InvalidCommandError } from '../building-blocks/command.ts';
import { createCreateNodeCommandHandler, createNodeCommand, CreateNodeCommandSchema } from './create-node.ts';

describe('create node use case', () => {
  let client: Client;
  let nodeRepository: PostgresNodeRepository;
  let propertyRepository: PostgresNodePropertyRepository;
  let handler: ReturnType<typeof createCreateNodeCommandHandler>;
  let uniqueNamePrefix: string;

  function uniqueName(name: string): string {
    return `${uniqueNamePrefix}:${name}`;
  }

  beforeEach(async () => {
    const testConnectionString = process.env['DATABASE_URL'] || import.meta.env['VITE_DATABASE_URL'];
    if (!testConnectionString) {
      throw new Error('DATABASE_URL environment variable is required for integration tests');
    }

    uniqueNamePrefix = `Test:${uuid.v4()}:`;
    client = await createConnection(testConnectionString);
    nodeRepository = new PostgresNodeRepository(client);
    propertyRepository = new PostgresNodePropertyRepository(client);
    handler = withCommandValidation(
      CreateNodeCommandSchema,
      createCreateNodeCommandHandler({
        nodeRepository,
        nodePropertyRepository: propertyRepository,
      }),
    );
  });

  afterEach(async () => {
    await client.query('DELETE FROM nodes where name LIKE $1', [`${uniqueNamePrefix}%`]);
    await client.end();
  });

  it('creates a root node with properties and returns its id', async () => {
    const name = uniqueName('RootNode');
    const command = createNodeCommand(
      null,
      name,
      [
        { name: 'Height', value: 100.5 },
        { name: 'Width', value: 200.0 },
      ],
    );

    const id = await handler(command);
    const node = await nodeRepository.getById(id as NodeId);
    const properties = await propertyRepository.getAllByNodeId(id as NodeId);

    expect(node.name).toBe(name);
    expect(node.parentId).toBeNull();
    expect(properties).toHaveLength(2);

    const heightProperty = properties.find(p => p.name === 'Height');
    const widthProperty = properties.find(p => p.name === 'Width');

    expect(heightProperty?.value.value).toBe(100.5);
    expect(widthProperty?.value.value).toBe(200.0);
  });

  it('creates a child node under existing parent', async () => {
    const parentId = await handler(
      createNodeCommand(null, uniqueName('RootNode'), []),
    );

    const name = uniqueName('ChildNode');
    const command = createNodeCommand(
      parentId,
      name,
      [{ name: 'Capacity', value: 500 }],
    );

    const id = await handler(command);
    const node = await nodeRepository.getById(id as NodeId);
    const properties = await propertyRepository.getAllByNodeId(id as NodeId);

    expect(node.name).toBe(name);
    expect(node.parentId).toBe(createNodeIdFrom(parentId));
    expect(properties).toHaveLength(1);
    expect(properties[0]?.name).toBe('Capacity');
    expect(properties[0]?.value.value).toBe(500);
  });

  it('creates a node without properties', async () => {
    const name = uniqueName('Test:EmptyNode');
    const command = createNodeCommand(null, name, []);

    const id = await handler(command);
    const node = await nodeRepository.getById(id as NodeId);
    const properties = await propertyRepository.getAllByNodeId(id as NodeId);

    expect(node.name).toBe(name);
    expect(node.parentId).toBeNull();
    expect(properties).toHaveLength(0);
  });

  it('throws BusinessError when root node with same name already exists', async () => {
    // Try to create another root node with name "AlphaPC" (exists in seed data)
    const command = createNodeCommand(null, 'AlphaPC', []);
    const result = handler(command);

    await expect(result).rejects.toThrow(BusinessError);
    await expect(result).rejects.toThrow('Root node with name "AlphaPC" already exists');
  });

  it('throws BusinessError when node with same name already exists in parent', async () => {
    // Try to create another "Processing" node under AlphaPC (exists in seed data)
    const parentId = '00000000-0000-7000-a000-100000000001';

    const command = createNodeCommand(parentId, 'Processing', []);
    const result = handler(command);

    await expect(result).rejects.toThrow(BusinessError);
    await expect(result).rejects.toThrow('Node with name "Processing" already exists under parent');
  });

  it('throws InvalidCommandError for invalid command data', async () => {
    const command = createNodeCommand(
      'invalid-uuid',
      '   ', // empty name after trim
      [
        { name: '', value: 123 }, // empty property name
        { name: 'ValidName', value: NaN }, // invalid value
      ],
    );

    const result = handler(command);

    await expect(result).rejects.toThrow(InvalidCommandError);
    await expect(result).rejects.toThrow(expect.objectContaining({
      errors: [
        {
          message: 'Invalid UUID',
          path: ['parentNodeId'],
        },
        {
          message: 'Name cannot be empty',
          path: ['name'],
        },
        {
          message: 'Property name cannot be empty',
          path: ['properties', 0, 'name'],
        },
        {
          message: 'Property value must be a valid number',
          path: ['properties', 1, 'value'],
        },
      ],
      name: 'InvalidCommandError',
    }) as InvalidCommandError);
  });

  it('throws error when parent node does not exist', async () => {
    const nonExistentParentId = createNewNodeId();
    const command = createNodeCommand(nonExistentParentId, 'TestNode', []);

    const result = handler(command);

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow(`Node with id ${nonExistentParentId} not found`);
  });
});
