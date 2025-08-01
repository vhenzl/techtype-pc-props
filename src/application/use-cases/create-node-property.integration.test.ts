import type { Client } from 'pg';
import * as uuid from 'uuid';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createNewNodeId, type NodeId } from '../../domain/node.ts';
import { type NodePropertyId } from '../../domain/property.ts';
import { BusinessError, NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { createConnection } from '../../infrastructure/persistence/db.ts';
import { PostgresNodeRepository } from '../../infrastructure/persistence/postgres-node-repository.ts';
import { PostgresNodePropertyRepository } from '../../infrastructure/persistence/postgres-property-repository.ts';
import { withCommandValidation } from '../../infrastructure/processing.ts';
import { InvalidCommandError } from '../building-blocks/command.ts';
import { createCreateNodePropertyCommandHandler, createNodePropertyCommand, CreateNodePropertyCommandSchema } from './create-node-property.ts';

describe('create node property use case', () => {
  let client: Client;
  let nodeRepository: PostgresNodeRepository;
  let propertyRepository: PostgresNodePropertyRepository;
  let handler: ReturnType<typeof createCreateNodePropertyCommandHandler>;
  let uniqueNamePrefix: string;

  function uniqueName(name: string): string {
    return `${uniqueNamePrefix}:${name}`;
  }

  async function createTestNode(): Promise<NodeId> {
    const nodeId = createNewNodeId();
    const name = uniqueName(`Node-${nodeId}`);
    await client.query('INSERT INTO nodes (id, name, parent_id) VALUES ($1, $2, $3)', [nodeId, name, null]);
    return nodeId;
  }

  beforeEach(async () => {
    const testConnectionString = process.env['DATABASE_URL'] || import.meta.env['VITE_DATABASE_URL'];
    if (!testConnectionString) {
      throw new Error('DATABASE_URL environment variable is required for integration tests');
    }

    uniqueNamePrefix = `Test:${uuid.v4()}`;
    client = await createConnection(testConnectionString);
    nodeRepository = new PostgresNodeRepository(client);
    propertyRepository = new PostgresNodePropertyRepository(client);
    handler = withCommandValidation(
      CreateNodePropertyCommandSchema,
      createCreateNodePropertyCommandHandler({
        nodeRepository,
        nodePropertyRepository: propertyRepository,
      }),
    );
  });

  afterEach(async () => {
    await client.query('DELETE FROM nodes WHERE name LIKE $1', [`${uniqueNamePrefix}%`]);
    await client.end();
  });

  it('creates a property for an existing node and returns its id', async () => {
    const nodeId = await createTestNode();

    const command = createNodePropertyCommand(
      nodeId,
      'TestProperty',
      123.45,
    );

    const propertyId = await handler(command);
    const property = await propertyRepository.getById(propertyId as NodePropertyId);

    expect(property.nodeId).toBe(nodeId);
    expect(property.name).toBe('TestProperty');
    expect(property.value.value).toBe(123.45);
  });

  it('creates a property with integer value', async () => {
    const nodeId = await createTestNode();

    const command = createNodePropertyCommand(
      nodeId,
      'IntegerProperty',
      42,
    );

    const propertyId = await handler(command);
    const property = await propertyRepository.getById(propertyId as NodePropertyId);

    expect(property.value.value).toBe(42);
  });

  it('creates a property with decimal value', async () => {
    const nodeId = await createTestNode();

    const command = createNodePropertyCommand(
      nodeId,
      'DecimalProperty',
      3.14159,
    );

    const propertyId = await handler(command);
    const property = await propertyRepository.getById(propertyId as NodePropertyId);

    expect(property.value.value).toBe(3.14159);
  });

  it('throws BusinessError when property with same name already exists for the node', async () => {
    const nodeId = await createTestNode();

    const firstCommand = createNodePropertyCommand(nodeId, 'DuplicateName', 100);
    await handler(firstCommand);

    // Try to create another property with the same name
    const secondCommand = createNodePropertyCommand(nodeId, 'DuplicateName', 200);
    const result = handler(secondCommand);

    await expect(result).rejects.toThrow(BusinessError);
    await expect(result).rejects.toThrow(`Property with name "DuplicateName" already exists for node ${nodeId}`);
  });

  it('allows same property name for different nodes', async () => {
    const nodeId1 = await createTestNode();
    const nodeId2 = await createTestNode();

    const command1 = createNodePropertyCommand(nodeId1, 'SameName', 100);
    const command2 = createNodePropertyCommand(nodeId2, 'SameName', 200);

    const propertyId1 = await handler(command1);
    const propertyId2 = await handler(command2);

    const property1 = await propertyRepository.getById(propertyId1 as NodePropertyId);
    const property2 = await propertyRepository.getById(propertyId2 as NodePropertyId);

    expect(property1.nodeId).toBe(nodeId1);
    expect(property1.name).toBe('SameName');
    expect(property1.value.value).toBe(100);

    expect(property2.nodeId).toBe(nodeId2);
    expect(property2.name).toBe('SameName');
    expect(property2.value.value).toBe(200);
  });

  it('throws NotFoundError when node does not exist', async () => {
    const nonExistentNodeId = createNewNodeId();

    const command = createNodePropertyCommand(
      nonExistentNodeId,
      'TestProperty',
      123,
    );

    const result = handler(command);

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow(`Node with id ${nonExistentNodeId} not found`);
  });

  it('throws InvalidCommandError for invalid command data', async () => {
    const command = createNodePropertyCommand(
      'invalid-uuid',
      '   ', // empty name after trim
      NaN, // invalid value
    );

    const result = handler(command);

    await expect(result).rejects.toThrow(InvalidCommandError);
    await expect(result).rejects.toThrow(expect.objectContaining({
      errors: [
        {
          message: 'Invalid UUID',
          path: ['nodeId'],
        },
        {
          message: 'Property name cannot be empty',
          path: ['name'],
        },
        {
          message: 'Property value must be a valid number',
          path: ['value'],
        },
      ],
      name: 'InvalidCommandError',
    }) as InvalidCommandError);
  });
});
