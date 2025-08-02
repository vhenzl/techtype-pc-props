# TechType PC Props

## Overview

This project implements a backend system for managing a hierarchical tree of PC components (nodes) and their properties, as described in the [assignment](./assignment.md). It uses Node.js, TypeScript, PostgreSQL, and exposes a REST API for interaction.

## Prerequisites
- Node.js (24+ for native TypeScript support)
- pnpm
- Docker (for local Supabase)

## Setup

1. **Install dependencies**
   ```sh
   pnpm install
   ```

2. **Start Supabase (local Postgres)**
   Start the local Supabase stack (Postgres, Studio, etc.):
   ```sh
   pnpm supabase start
   ```
   This will run Postgres on port `54322` and Supabase Studio at http://127.0.0.1:54323, and automatically apply migrations and seed the database. 

   You can always reset the database to its initial state with:
   ```sh
   pnpm supabase db reset
   ```

4. **Configure environment**
   Copy `.env.example` to `.env` and adjust if needed:
   ```sh
   cp .env.example .env
   ```
   The default `DATABASE_URL` should work with the local Supabase.

5. **Start the API server**
   ```sh
   pnpm dev
   ```
   The server will run at `http://localhost:3000` by default.

## API Endpoints

### 1. Get a subtree by node path
- **GET** `/subtree/{path...}`
- **Example:** `/subtree/AlphaPC/Processing/CPU`
- **Response:** 200 OK, returns the subtree as JSON:
  ```json
  {
    "data": {
      "id": "<uuid>",
      "name": "Name",
      "parentId": "...",
      "properties": [ ... ],
      "children": [ ... ]
    }
  }
  ```

### 2. Create a node (optionally with parent and properties)
- **POST** `/nodes`
- **Body:**
  ```json
  {
    "name": "Graphics",
    "parentNodeId": "<parent-node-uuid>",
    "properties": [
      { "name": "RAM", "value": 4000.0 }
    ]
  }
  ```
- **Response:** 201 Created, returns `{ data: <node subtree> }`

### 3. Add a new property to a node
- **POST** `/nodes/{nodeId}/properties`
- **Body:**
  ```json
  {
    "name": "RAM",
    "value": 4000.0
  }
  ```
- **Response:** 201 Created, returns `{ data: <node subtree> }`

## Running Tests

```sh
pnpm test
```

Requires running Supabase with clean seeded data for integration and function tests.


## Interacting with the API

The easiest way to try the API is with the [REST Client extension for VS Code](https://marketplace.visualstudio.com/items?itemName=humao.rest-client). This project includes an `api.http` file with ready-to-run example requests for all endpoints. Open it in VS Code and click "Send Request" above any request.

Alternatively, you can use any HTTP client (e.g. curl):
```sh
curl "http://localhost:3000/subtree/AlphaPC"
```
