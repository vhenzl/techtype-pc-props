// DTOs for node subtree query response
export type NodeDto = {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly properties: PropertyDto[];
  readonly children: NodeDto[];
};

export type PropertyDto = {
  readonly id: string;
  readonly name: string;
  readonly value: number;
};
