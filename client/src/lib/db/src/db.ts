import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as dotenv from "dotenv";
import * as schema from "./schema";
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.log("no database url");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

export default db;
