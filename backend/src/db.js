import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'jobfit',
  password: process.env.PGPASSWORD || 'jobfit',
  database: process.env.PGDATABASE || 'jobfit',
});

// Single source of truth, shared with the browser build so the static demo
// and the API can never drift apart.
const SEED_SKILLS = JSON.parse(
  readFileSync(new URL('../../shared/skills.json', import.meta.url), 'utf8')
);

/** Create the table if it does not exist, then seed it once. */
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skills (
      id       SERIAL PRIMARY KEY,
      name     TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      aliases  TEXT[] NOT NULL DEFAULT '{}'
    );
  `);

  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM skills');
  if (rows[0].n > 0) return;

  for (const { name, category, aliases } of SEED_SKILLS) {
    await pool.query(
      'INSERT INTO skills (name, category, aliases) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
      [name, category, aliases]
    );
  }
  console.log(`Seeded ${SEED_SKILLS.length} skills`);
}

export async function getSkills() {
  const { rows } = await pool.query(
    'SELECT name, category, aliases FROM skills ORDER BY category, name'
  );
  return rows;
}
