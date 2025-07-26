import { z } from 'zod';

const CommandSchema = z.object({
  __name: z.string(),
});

export type Command = z.infer<typeof CommandSchema>;

export function createCommandSchema<const TName extends string, TShape extends z.core.$ZodShape>(
  name: TName,
  shape: TShape,
) {
  return CommandSchema.extend({
    __name: z.literal(name),
    ...shape,
  });
}

export type CommandHandler<TCommand extends Command, TResult> = (command: TCommand) => Promise<TResult>;

type InvalidCommandErrorDetail = {
  readonly path: (number | string | symbol)[];
  readonly message: string;
};

export class InvalidCommandError extends Error {
  public readonly errors?: InvalidCommandErrorDetail[];

  constructor(
    errors: InvalidCommandErrorDetail[],
  ) {
    super('Invalid command');
    this.name = 'InvalidCommandError';
    this.errors = errors;
  }
}
