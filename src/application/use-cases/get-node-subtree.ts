import type { Client } from 'pg';
import { z } from 'zod';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';

import { createQuerySchema, type QueryHandler } from '../building-blocks/query.ts';
import type { NodeDto } from './dtos/node-subtree.ts';

const ByNodeId = z.object({ nodeId: z.uuid() });
const ByPath = z.object({ path: z.string().regex(/^\/.+$/, 'Path must start with a slash and not be empty') });

export const GetNodeSubtreeQuerySchema = createQuerySchema('GetNodeSubtree', {
  by: z.union([ByNodeId, ByPath]),
});

export type GetNodeSubtreeQuery = z.infer<typeof GetNodeSubtreeQuerySchema>;

export function createGetNodeSubtreeQuery(by: { nodeId: string } | { path: string }): GetNodeSubtreeQuery {
  return { by, __name: 'GetNodeSubtree' };
}

export type GetNodeSubtreeResult = NodeDto;

type Dependencies = {
  db: Client;
};

interface SubtreeRow {
  id: string;
  name: string;
  parent_id: string | null;
  depth: number;
  property_id: string | null;
  property_name: string | null;
  property_value: string | null;
}

export function createGetNodeSubtreeQueryHandler({
  db,
}: Dependencies): QueryHandler<GetNodeSubtreeQuery, GetNodeSubtreeResult> {
  return async (query) => {
    const nodeId = 'nodeId' in query.by ? query.by.nodeId : null;
    const path = 'path' in query.by ? query.by.path : null;

    const subtreeQuery = `
      WITH RECURSIVE subtree (id, name, parent_id, depth) AS (
        SELECT id, name, parent_id, 0
        FROM nodes_with_path
        WHERE (($1::uuid IS NOT NULL AND id = $1)
          OR ($2::text IS NOT NULL AND path = $2))

        UNION ALL

        SELECT n.id, n.name, n.parent_id, s.depth + 1
        FROM nodes_with_path n
        INNER JOIN subtree s ON n.parent_id = s.id
      )
      SELECT
        s.id,
        s.name,
        s.parent_id,
        s.depth,
        p.id as property_id,
        p.name as property_name,
        p.value as property_value
      FROM subtree s
      LEFT JOIN node_properties p ON s.id = p.node_id
      ORDER BY s.depth, s.name, p.name
    `;

    const result = await db.query<SubtreeRow>(subtreeQuery, [nodeId, path]);

    if (result.rows.length === 0) {
      throw new NotFoundError(`Node with ${nodeId ? 'id' : 'path'} ${nodeId || path} not found`);
    }

    const nodeMap = new Map<string, NodeDto>();

    for (const row of result.rows) {
      let node = nodeMap.get(row.id);
      if (!node) {
        node = {
          id: row.id,
          name: row.name,
          parentId: row.parent_id,
          properties: [],
          children: [],
        };
        nodeMap.set(row.id, node);
      }

      if (row.property_id && row.property_name && row.property_value !== null) {
        node.properties.push({
          id: row.property_id,
          name: row.property_name,
          value: parseFloat(row.property_value),
        });
      }
    }

    for (const node of nodeMap.values()) {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        parent.children.push(node);
      }
    }

    const rootId = result.rows[0]!.id;
    return nodeMap.get(rootId)!;
  };
}
