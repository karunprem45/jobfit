/**
 * Skill matching core.
 *
 * The naive approach is a nested loop: for every skill, scan every word of the
 * job description. That is O(n * m) — with 500 JD words and 60 skills it is
 * 30,000 comparisons, and it grows badly as either side gets bigger.
 *
 * Instead we tokenize the JD once into a hash Set, then do one O(1) lookup per
 * skill. Total cost drops to O(n + m).
 *
 * Skills like "github actions" are two words, so the Set holds both unigrams
 * and bigrams — that keeps the O(1) lookup while still matching phrases.
 */

const MAX_PHRASE_WORDS = 3;

/** Lowercase, strip punctuation, split on whitespace. */
export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Build a Set containing every 1-, 2-, and 3-word sequence in the text.
 * This is what turns phrase matching into a constant-time lookup.
 */
export function buildNgramSet(text) {
  const words = tokenize(text);
  const set = new Set();

  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= MAX_PHRASE_WORDS && i + n <= words.length; n++) {
      set.add(words.slice(i, i + n).join(' '));
    }
  }
  return set;
}

/** Normalize a skill name the same way we normalized the JD text. */
function normalizeSkill(skill) {
  return tokenize(skill).join(' ');
}

/**
 * Match a profile's skills against a job description.
 *
 * @param {string} jdText          raw job description
 * @param {Array<{name: string, category: string}>} skills  the profile catalog
 * @returns {{matched: Array, missing: Array, score: number}}
 */
export function matchSkills(jdText, skills) {
  const ngrams = buildNgramSet(jdText);

  const matched = [];
  const missing = [];

  for (const skill of skills) {
    const needle = normalizeSkill(skill.name);
    const aliases = (skill.aliases || []).map(normalizeSkill);

    const hit = ngrams.has(needle) || aliases.some((a) => ngrams.has(a));
    (hit ? matched : missing).push(skill);
  }

  const score = skills.length === 0
    ? 0
    : Math.round((matched.length / skills.length) * 100);

  return { matched, missing, score };
}
