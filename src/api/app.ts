import express from 'express';
import { createGetNodeSubtreeQueryHandler, GetNodeSubtreeQuerySchema } from '../application/use-cases/get-node-subtree.ts';
import { createConnection } from '../infrastructure/persistence/db.ts';
import { withQueryValidation } from '../infrastructure/processing.ts';
import { createGetSubtreeController } from './controllers.ts';
import * as middlewares from './middleware.ts';

// ----- services composition -----
const db = await createConnection();

const getSubtreeQueryHandler = withQueryValidation(
  GetNodeSubtreeQuerySchema,
  createGetNodeSubtreeQueryHandler({ db }),
);

const getSubtreeController = createGetSubtreeController(getSubtreeQueryHandler);

// ----- express app composition -----
const app = express();

app.use(middlewares.logger);
app.use(middlewares.requireJsonPost);
app.use(express.json());

app.use('/subtree/*path', getSubtreeController);

app.use(middlewares.errorLogger);
app.use(middlewares.errorHandler);

export default app;
