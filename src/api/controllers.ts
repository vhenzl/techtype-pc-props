import express from 'express';
import z from 'zod';
import type { CommandHandler } from '../application/building-blocks/command.ts';
import type { QueryHandler } from '../application/building-blocks/query.ts';
import { createNodePropertyCommand, type CreateNodePropertyCommand } from '../application/use-cases/create-node-property.ts';
import { createNodeCommand, type CreateNodeCommand } from '../application/use-cases/create-node.ts';
import { createGetNodeSubtreeQuery, type GetNodeSubtreeQuery, type GetNodeSubtreeResult } from '../application/use-cases/get-node-subtree.ts';

const GetSubtreeParamsSchema = z.object({
  path: z.array(z.string()).min(1, 'Path must not be empty'),
});

export function createGetSubtreeController(
  handler: QueryHandler<GetNodeSubtreeQuery, GetNodeSubtreeResult>,
) {
  return async function (req: express.Request, res: express.Response) {
    const params = GetSubtreeParamsSchema.parse(req.params);
    const path = `/${params.path.join('/')}`;
    const result = await handler(createGetNodeSubtreeQuery({ path }));
    const data = {
      data: result,
    };
    res.json(data);
  };
}

const PostNodeBodySchema = z.object({
  parentNodeId: z.uuid().nullable(),
  name: z.string().trim().min(1, 'Name cannot be empty'),
  properties: z.array(z.object({
    name: z.string().trim().min(1, 'Property name cannot be empty'),
    value: z.number('Property value must be a valid number'),
  })).optional().default([]),
});

export function createPostNodeController(
  commandHandler: CommandHandler<CreateNodeCommand, string>,
  queryHandler: QueryHandler<GetNodeSubtreeQuery, GetNodeSubtreeResult>,
) {
  return async function (req: express.Request, res: express.Response) {
    // TODO: extract validation to middleware
    const parsed = PostNodeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errors: parsed.error.issues.map(issue => ({
          path: issue.path,
          message: issue.message,
        })),
      });
      return;
    }
    const command = createNodeCommand(parsed.data.parentNodeId, parsed.data.name, parsed.data.properties);
    const id = await commandHandler(command);
    const result = await queryHandler(createGetNodeSubtreeQuery({ nodeId: id }));
    const data = {
      data: result,
    };
    res.status(201).json(data);
  };
}

const PostNodePropertyParamsSchema = z.object({
  nodeId: z.uuid(),
});

const PostNodePropertyBodySchema = z.object({
  name: z.string().trim().min(1, 'Property name cannot be empty'),
  value: z.number('Property value must be a valid number'),
});

export function createPostNodePropertyController(
  commandHandler: CommandHandler<CreateNodePropertyCommand, string>,
  queryHandler: QueryHandler<GetNodeSubtreeQuery, GetNodeSubtreeResult>,
) {
  return async function (req: express.Request, res: express.Response) {
    // TODO: extract validation to middleware
    const params = PostNodePropertyParamsSchema.parse(req.params);
    const parsed = PostNodePropertyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        errors: parsed.error.issues.map(issue => ({
          path: issue.path,
          message: issue.message,
        })),
      });
      return;
    }
    const command = createNodePropertyCommand(params.nodeId, parsed.data.name, parsed.data.value);
    await commandHandler(command);
    const result = await queryHandler(createGetNodeSubtreeQuery({ nodeId: params.nodeId }));
    const data = {
      data: result,
    };
    res.status(201).json(data);
  };
}
