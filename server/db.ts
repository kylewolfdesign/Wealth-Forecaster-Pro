import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function verifyDatabaseConnection(): Promise<void> {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT current_database(), inet_server_addr()");
    const { current_database } = result.rows[0];
    console.log(`Database connected successfully: ${current_database}`);
    client.release();
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
}

export const db = drizzle(pool, { schema });
