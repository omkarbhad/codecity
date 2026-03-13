import { Pool, neon } from "@neondatabase/serverless"

// Use HTTP-based query function for edge compatibility
const sql = neon(process.env.DATABASE_URL!)

// Pool for cases where we need transactions or streaming
let _pool: Pool | null = null
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return _pool
}

export { sql }
