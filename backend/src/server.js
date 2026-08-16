import express from 'express';
import cors from 'cors';
import { initDb, getSkills } from './db.js';
import { matchSkills } from './matcher.js';

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

app.post('/api/match', async (req, res, next) => {
  try {
    const { jdText } = req.body;

    if (typeof jdText !== 'string' || jdText.trim().length === 0) {
      return res.status(400).json({ error: 'jdText is required' });
    }

    const skills = await getSkills();
    const result = matchSkills(jdText, skills);
    res.json(result);
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
