import type { Client } from 'pg';
import { z } from 'zod';
import { NotFoundError } from '../../domain/shared-kernel/errors.ts';
import { createQuerySchema, type QueryHandler } from '../building-blocks/query.ts';
import type { NodeDto } from './dtos/node-subtree.ts';

export const GetNodeSubtreeQuerySchema = createQuerySchema('GetNodeSubtree', {
  nodeId: z.string().uuid(),
});

export type GetNodeSubtreeQuery = z.infer<typeof GetNodeSubtreeQuerySchema>;

export function createGetNodeSubtreeQuery(nodeId: string): GetNodeSubtreeQuery {
  return { nodeId, __name: 'GetNodeSubtree' };
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
    const subtreeQuery = `
      WITH RECURSIVE subtree (id, name, parent_id, depth) AS (
        SELECT id, name, parent_id, 0
        FROM nodes
        WHERE id = $1

        UNION ALL

        SELECT n.id, n.name, n.parent_id, s.depth + 1
        FROM nodes n
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

    const result = await db.query<SubtreeRow>(subtreeQuery, [query.nodeId]);

    if (result.rows.length === 0) {
      throw new NotFoundError(`Node with id ${query.nodeId} not found`);
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

    return nodeMap.get(query.nodeId)!;
  };
}
