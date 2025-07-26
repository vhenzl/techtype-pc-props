import express from 'express';
import * as middlewares from './middleware.ts';

const app = express();

app.use(middlewares.logger);
app.use(express.json());

export default app;
