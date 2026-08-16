import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, buildNgramSet, matchSkills } from './matcher.js';

const SKILLS = [
  { name: 'Python', category: 'language', aliases: [] },
  { name: 'React', category: 'frontend', aliases: ['reactjs'] },
  { name: 'GitHub Actions', category: 'devops', aliases: [] },
  { name: 'Kubernetes', category: 'devops', aliases: ['k8s'] },
];

test('tokenize lowercases and strips punctuation', () => {
  assert.deepEqual(tokenize('Python, Java; React!'), ['python', 'java', 'react']);
});

test('tokenize keeps C++ and CI/CD style tokens readable', () => {
  assert.deepEqual(tokenize('C++ and CI/CD'), ['c++', 'and', 'ci', 'cd']);
});

test('tokenize trims sentence punctuation but keeps it inside a token', () => {
  // "C++." ends a sentence — the period is not part of the skill name.
  assert.deepEqual(tokenize('we use C++. and Node.js too'), [
    'we', 'use', 'c++', 'and', 'node.js', 'too',
  ]);
});

test('matchSkills finds a skill at the end of a sentence', () => {
  const skills = [{ name: 'C++', category: 'language', aliases: [] }];
  const { matched } = matchSkills('Languages: Python, Java, C++.', skills);
  assert.deepEqual(matched.map((s) => s.name), ['C++']);
});

test('buildNgramSet captures multi-word phrases', () => {
  const set = buildNgramSet('we use github actions daily');
  assert.ok(set.has('github'));
  assert.ok(set.has('github actions'));
  assert.ok(set.has('use github actions'));
});

test('matchSkills separates matched from missing', () => {
  const jd = 'We need Python and GitHub Actions experience.';
  const { matched, missing } = matchSkills(jd, SKILLS);

  assert.deepEqual(matched.map((s) => s.name), ['Python', 'GitHub Actions']);
  assert.deepEqual(missing.map((s) => s.name), ['React', 'Kubernetes']);
});

test('matchSkills resolves aliases', () => {
  const { matched } = matchSkills('experience with k8s clusters', SKILLS);
  assert.deepEqual(matched.map((s) => s.name), ['Kubernetes']);
});

test('matchSkills scores as a percentage of the catalog', () => {
  const { score } = matchSkills('Python React k8s github actions', SKILLS);
  assert.equal(score, 100);
});

test('matchSkills handles an empty catalog without dividing by zero', () => {
  assert.equal(matchSkills('anything', []).score, 0);
});
