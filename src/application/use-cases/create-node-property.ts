import { z } from 'zod';
import type { NodeRepository } from '../../domain/node-repository.ts';
import { createNodeIdFrom } from '../../domain/node.ts';
import type { NodePropertyRepository } from '../../domain/property-repository.ts';
import { createNewNodePropertyId, NodeProperty } from '../../domain/property.ts';
import { BusinessError } from '../../domain/shared-kernel/errors.ts';
import { PropertyValue } from '../../domain/value.ts';
import { createCommandSchema, type CommandHandler } from '../building-blocks/command.ts';

export const CreateNodePropertyCommandSchema = createCommandSchema('CreateNodeProperty', {
  nodeId: z.uuid(),
  name: z.string().trim().min(1, 'Property name cannot be empty'),
  value: z.number('Property value must be a valid number'),
});

export type CreateNodePropertyCommand = z.infer<typeof CreateNodePropertyCommandSchema>;

export function createNodePropertyCommand(
  nodeId: string,
  name: string,
  value: number,
): CreateNodePropertyCommand {
  return { nodeId, name, value, __name: 'CreateNodeProperty' };
}

type Dependencies = {
  nodeRepository: NodeRepository;
  nodePropertyRepository: NodePropertyRepository;
};

export function createCreateNodePropertyCommandHandler({
  nodeRepository,
  nodePropertyRepository,
}: Dependencies): CommandHandler<CreateNodePropertyCommand, string> {
  return async (command) => {
    const node = await nodeRepository.getById(createNodeIdFrom(command.nodeId));

    const propertyExists = await nodePropertyRepository.existsInNode(command.name, node.id);
    if (propertyExists) {
      throw new BusinessError(`Property with name "${command.name}" already exists for node ${command.nodeId}`);
    }

    const propertyId = createNewNodePropertyId();
    const value = new PropertyValue(command.value);
    const property = new NodeProperty(propertyId, node.id, command.name, value);

    await nodePropertyRepository.add(property);

    return propertyId;
  };
}
