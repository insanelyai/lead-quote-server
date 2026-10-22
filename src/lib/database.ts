import { Pool, PoolClient } from "pg";
import { env } from "../config/env.js";

const poolConfig = {
  user: env.db_user,
  password: env.db_password,
  host: env.db_host,
  port: env.db_port,
  database: env.db_name,
};

export const pool = new Pool(poolConfig);

// Anything that can run a query: the pool itself or a transaction's client
export type Queryable = Pick<PoolClient, "query">;

export const query = (text: string, params?: unknown[]) =>
  pool.query(text, params);
