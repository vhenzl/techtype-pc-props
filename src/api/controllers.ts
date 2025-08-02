import express from 'express';
import z from 'zod';
import type { QueryHandler } from '../application/building-blocks/query.ts';
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
