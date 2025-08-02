import express from 'express';
import { createCreateNodeCommandHandler, CreateNodeCommandSchema } from '../application/use-cases/create-node.ts';
import { createGetNodeSubtreeQueryHandler, GetNodeSubtreeQuerySchema } from '../application/use-cases/get-node-subtree.ts';
import { createConnection } from '../infrastructure/persistence/db.ts';
import { PostgresNodeRepository } from '../infrastructure/persistence/postgres-node-repository.ts';
import { PostgresNodePropertyRepository } from '../infrastructure/persistence/postgres-property-repository.ts';
import { withCommandLogging, withCommandValidation, withQueryValidation } from '../infrastructure/processing.ts';
import { createGetSubtreeController, createPostNodeController } from './controllers.ts';
import * as middlewares from './middleware.ts';

// ----- services composition -----
const db = await createConnection();

const nodeRepository = new PostgresNodeRepository(db);
const nodePropertyRepository = new PostgresNodePropertyRepository(db);

const getSubtreeQueryHandler = withQueryValidation(
  GetNodeSubtreeQuerySchema,
  createGetNodeSubtreeQueryHandler({ db }),
);
const createNodeCommandHandler = withCommandLogging(
  withCommandValidation(
    CreateNodeCommandSchema,
    createCreateNodeCommandHandler({ nodeRepository, nodePropertyRepository }),
  ),
);
const getSubtreeController = createGetSubtreeController(getSubtreeQueryHandler);
const postNodeController = createPostNodeController(
  createNodeCommandHandler,
  getSubtreeQueryHandler,
);

// ----- express app composition -----
const app = express();

app.use(middlewares.logger);
app.use(middlewares.requireJsonPost);
app.use(express.json());

app.post('/nodes', postNodeController);
app.use('/subtree/*path', getSubtreeController);

app.use(middlewares.errorLogger);
app.use(middlewares.errorHandler);

export default app;
