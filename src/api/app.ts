import express from 'express';
import * as middlewares from './middleware.ts';

const app = express();

app.use(middlewares.logger);
app.use(middlewares.requireJsonPost);
app.use(express.json());

app.use(middlewares.errorLogger);
app.use(middlewares.errorHandler);

export default app;
