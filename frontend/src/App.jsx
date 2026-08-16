import { useState } from 'react';
import { matchSkills } from '../../shared/matcher.js';
import skills from '../../shared/skills.json';

const API = import.meta.env.VITE_API_URL || '/api';

export default function App() {
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(null);

  async function handleMatch() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setResult(await res.json());
      setOffline(false);
    } catch {
      // No API reachable — this is the GitHub Pages build, or the backend is
      // down. The exact matcher is dependency-free JavaScript, so run the same
      // module here in the browser against the same skills catalog.
      // Semantic matching needs the Python service, so it is simply absent.
      setResult(matchSkills(jdText, skills));
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <h1>JobFit</h1>
      <p className="sub">Paste a job description to see which of your skills it asks for.</p>

      <textarea
        value={jdText}
        onChange={(e) => setJdText(e.target.value)}
        placeholder="Paste the job description here..."
        rows={12}
      />

      <button onClick={handleMatch} disabled={loading || !jdText.trim()}>
        {loading ? 'Matching...' : 'Match my skills'}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <section className="results">
          <div className="score">
            <strong>{result.score}%</strong> of your skills appear in this JD
          </div>

          {offline && (
            <p className="banner">
              Running the exact matcher in your browser — no backend attached.
              Semantic matching needs the Python service, so run the full stack
              with <code>docker compose up</code> to see implied skills.
            </p>
          )}

          <SkillList title={`Matched (${result.matched.length})`} skills={result.matched} tone="hit" />

          {result.related?.length > 0 && (
            <div className="list related">
              <h2>Implied ({result.related.length})</h2>
              <p className="hint">
                Not named literally, but the JD describes them.
              </p>
              <ul>
                {result.related.map((r) => (
                  <li key={r.name} title={r.evidence}>
                    {r.name} <span className="cat">{r.similarity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <SkillList title={`Not mentioned (${result.missing.length})`} skills={result.missing} tone="miss" />
        </section>
      )}
    </main>
  );
}

function SkillList({ title, skills, tone }) {
  if (skills.length === 0) return null;

  return (
    <div className={`list ${tone}`}>
      <h2>{title}</h2>
      <ul>
        {skills.map((s) => (
          <li key={s.name}>
            {s.name} <span className="cat">{s.category}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
