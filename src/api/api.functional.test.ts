import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.ts';

describe('API endpoint', () => {
  let app: express.Express;
  beforeAll(async () => {
    process.env['DATABASE_URL'] ??= import.meta.env.VITE_DATABASE_URL;
    app = await createApp();
  });

  describe('GET /subtree/*path', function () {
    it.for([
      ['/AlphaPC'],
      ['/AlphaPC/Processing/CPU'],
    ])('responds with expected json for path "%s"', async ([path]) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const res = await request(app).get(`/subtree${path}`).set('Accept', 'application/json');

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.statusCode).toEqual(200);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.headers['content-type']).toMatch(/json/);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(res.body).toMatchSnapshot();
    });
  });
});
