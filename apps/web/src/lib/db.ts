import { Pool, neon } from "@neondatabase/serverless"

// DATABASE_URL is only required at runtime, not at build time.
// Provide a dummy string during build so neon() can construct without throwing;
// actual queries will never run during Next.js page-data collection.
export const sql = neon(process.env.DATABASE_URL ?? "postgresql://build:build@localhost/build")

// Pool for cases where we need transactions or streaming
let _pool: Pool | null = null
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return _pool
}
