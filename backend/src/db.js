import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'jobfit',
  password: process.env.PGPASSWORD || 'jobfit',
  database: process.env.PGDATABASE || 'jobfit',
});

const SEED_SKILLS = [
  ['Python', 'language', []],
  ['Java', 'language', []],
  ['JavaScript', 'language', ['js']],
  ['C++', 'language', ['cpp']],
  ['SQL', 'database', []],
  ['React', 'frontend', ['react.js', 'reactjs']],
  ['Node.js', 'backend', ['node', 'nodejs']],
  ['REST APIs', 'backend', ['rest api', 'rest']],
  ['Docker', 'devops', []],
  ['Kubernetes', 'devops', ['k8s']],
  ['Git', 'devops', []],
  ['CI/CD', 'devops', ['ci cd', 'continuous integration']],
  ['GitHub Actions', 'devops', []],
  ['PostgreSQL', 'database', ['postgres']],
  ['NoSQL', 'database', []],
  ['Agile', 'process', ['scrum']],
  ['Data Structures', 'fundamentals', []],
  ['Algorithms', 'fundamentals', []],
  ['Debugging', 'fundamentals', []],
  ['Testing', 'fundamentals', ['unit testing']],
  ['Machine Learning', 'ml', ['ml', 'ai/ml']],
  ['Cloud', 'cloud', ['cloud computing', 'gcp', 'aws', 'azure']],
];

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

  for (const [name, category, aliases] of SEED_SKILLS) {
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
