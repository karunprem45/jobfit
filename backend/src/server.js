import express from 'express';
import cors from 'cors';
import { initDb, getSkills } from './db.js';
import { matchSkills } from '../../shared/matcher.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

/** Liveness probe — Kubernetes uses this to know the pod is healthy. */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/skills', async (_req, res, next) => {
  try {
    res.json(await getSkills());
  } catch (err) {
    next(err);
  }
});

const ML_URL = process.env.ML_URL || 'http://ml:8000';

/**
 * Ask the Python service which of the unmatched skills are *semantically*
 * present — a JD saying "containerization" implies Docker without naming it.
 *
 * This is an enhancement, not a dependency. If the ML service is slow or down
 * we return an empty list and the caller still gets exact-match results, so a
 * failure here degrades the response instead of breaking it.
 */
async function fetchSemanticMatches(jdText, missingSkills) {
  if (missingSkills.length === 0) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${ML_URL}/semantic-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd_text: jdText, skills: missingSkills }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = await res.json();
    return data.related ?? [];
  } catch (err) {
    console.warn('semantic matching unavailable:', err.message);
    return [];
  }
}

app.post('/api/match', async (req, res, next) => {
  try {
    const { jdText } = req.body;

    if (typeof jdText !== 'string' || jdText.trim().length === 0) {
      return res.status(400).json({ error: 'jdText is required' });
    }

    const skills = await getSkills();
    const result = matchSkills(jdText, skills);

    const related = await fetchSemanticMatches(jdText, result.missing);
    const relatedNames = new Set(related.map((r) => r.name));

    res.json({
      ...result,
      related,
      // Anything neither exactly nor semantically present is a genuine gap.
      missing: result.missing.filter((s) => !relatedNames.has(s.name)),
    });
  } catch (err) {
    next(err);
  }
});

// Centralised error handler — every route forwards failures here via next(err).
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'internal server error' });
});

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialise database:', err);
    process.exit(1);
  });
