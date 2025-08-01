import { z } from 'zod';
import type { NodeRepository } from '../../domain/node-repository.ts';
import { createNewNodeId, createNodeIdFrom, Node, type NodeId } from '../../domain/node.ts';
import type { NodePropertyRepository } from '../../domain/property-repository.ts';
import { createNewNodePropertyId, NodeProperty } from '../../domain/property.ts';
import { BusinessError } from '../../domain/shared-kernel/errors.ts';
import { PropertyValue } from '../../domain/value.ts';
import { createCommandSchema, type CommandHandler } from '../building-blocks/command.ts';

export const CreateNodeCommandSchema = createCommandSchema('CreateNode', {
  parentNodeId: z.uuid().nullable(),
  name: z.string().trim().min(1, 'Name cannot be empty'),
  properties: z.array(z.object({
    name: z.string().trim().min(1, 'Property name cannot be empty'),
    value: z.number('Property value must be a valid number'),
  })),
});

export type CreateNodeCommand = z.infer<typeof CreateNodeCommandSchema>;

export function createNodeCommand(
  parentNodeId: string | null,
  name: string,
  properties: Array<{ name: string; value: number }>,
): CreateNodeCommand {
  return { parentNodeId, name, properties, __name: 'CreateNode' };
}

type Dependencies = {
  nodeRepository: NodeRepository;
  nodePropertyRepository: NodePropertyRepository;
};

export function createCreateNodeCommandHandler({
  nodeRepository,
  nodePropertyRepository,
}: Dependencies): CommandHandler<CreateNodeCommand, string> {
  return async (command) => {
    const parentNode = await ensureParentExists(command.parentNodeId);
    const parentNodeId = parentNode?.id ?? null;

    await ensureNodeDoesNotExist(command.name, parentNodeId);

    const id = createNewNodeId();
    const node = new Node(id, parentNodeId, command.name);

    const properties = command.properties.map((prop) => {
      const value = new PropertyValue(prop.value);
      const property = new NodeProperty(
        createNewNodePropertyId(),
        id,
        prop.name,
        value,
      );
      return property;
    });

    await nodeRepository.add(node);
    await Promise.all(properties.map((property) => {
      return nodePropertyRepository.add(property);
    }));

    return node.id;
  };

  async function ensureParentExists(parentNodeId: string | null): Promise<Node | null> {
    if (!parentNodeId) {
      return null;
    }
    return nodeRepository.getById(createNodeIdFrom(parentNodeId));
  }

  async function ensureNodeDoesNotExist(name: string, parentNodeId: NodeId | null): Promise<void> {
    const exists = await nodeRepository.existsInParent(name, parentNodeId);
    if (exists) {
      const message = parentNodeId
        ? `Node with name "${name}" already exists under parent ${parentNodeId}`
        : `Root node with name "${name}" already exists`;
      throw new BusinessError(message);
    }
  }
}
