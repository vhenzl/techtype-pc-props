import { ZodType } from 'zod';
import { type Command, type CommandHandler, InvalidCommandError } from '../application/building-blocks/command.ts';

export function withValidation<TCommand extends Command, TResult>(
  schema: ZodType<TCommand>,
  handler: CommandHandler<TCommand, TResult>,
): CommandHandler<TCommand, TResult> {
  return async (command) => {
    const result = await schema.safeParseAsync(command);
    if (!result.success) {
      throw new InvalidCommandError(result.error.issues.map(issue => ({
        path: issue.path,
        message: issue.message,
      })));
    }
    return handler(command);
  };
}

export function withLogging<TCommand extends Command, TResult>(
  handler: CommandHandler<TCommand, TResult>,
): CommandHandler<TCommand, TResult> {
  return async (command) => {
    const { __name: commandName, ...data } = command;
    try {
      console.log(`Processing command ${commandName}:`, data);
      const result = await handler(command);
      console.log(`Command ${commandName} processed successfully:`, result);
      return result;
    } catch (error) {
      console.error(`Command ${commandName} processing failed:`, error);
      throw error;
    }
  };
}
