import { Client } from 'pg';

export function getConnectionString(): string {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return connectionString;
}

export async function createConnection(connectionString?: string) {
  connectionString = connectionString ?? getConnectionString();
  const client = new Client({
    connectionString,
  });
  await client.connect();
  return client;
}
