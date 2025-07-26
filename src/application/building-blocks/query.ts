import { z } from 'zod';

const QuerySchema = z.object({
  __name: z.string(),
});

export type Query = z.infer<typeof QuerySchema>;

export function createQuerySchema<const TName extends string, TShape extends z.core.$ZodShape>(
  name: TName,
  shape: TShape,
) {
  return QuerySchema.extend({
    __name: z.literal(name),
    ...shape,
  });
}

export type QueryHandler<TQuery extends Query, TResult> = (query: TQuery) => Promise<TResult>;

type InvalidQueryErrorDetail = {
  readonly path: (number | string | symbol)[];
  readonly message: string;
};

export class InvalidQueryError extends Error {
  public readonly errors?: InvalidQueryErrorDetail[];

  constructor(
    errors: InvalidQueryErrorDetail[],
  ) {
    super('Invalid query');
    this.name = 'InvalidQueryError';
    this.errors = errors;
  }
}
