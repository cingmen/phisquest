/**
 * Test engine JavaScript dengan fixture golden yang sama seperti pytest.
 * Jalankan: node --test web/test/
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PQError,
  createProgress,
  evaluateAnswer,
  levelFor,
  normalizeProgress,
  startSession,
  streakBonus,
} from '../js/engine.js';
import { insertEntry } from '../js/leaderboard.js';

const here = dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(readFileSync(resolve(here, '../../tests/fixtures/golden.json'), 'utf8'));

const scenarioOf = (id) => golden.scenarios[id];
const packOf = (packId, scenarios) => ({ pack_id: packId, name: 'Golden', scenarios });

test('ambang level sesuai PRD §7.3', () => {
  const expected = [
    [0, 'amatir'],
    [99, 'amatir'],
    [100, 'analis_muda'],
    [249, 'analis_muda'],
    [250, 'analis'],
    [449, 'analis'],
    [450, 'detektif'],
    [649, 'detektif'],
    [650, 'phishhunter'],
  ];
  for (const [xp, level] of expected) assert.equal(levelFor(xp), level);
});

test('bonus streak dibatasi 10', () => {
  assert.deepEqual([...Array(9).keys()].map((n) => streakBonus(n)), [0, 0, 2, 4, 6, 8, 10, 10, 10]);
  assert.equal(streakBonus(50), 10);
});

test('penilaian jawaban per tipe soal', () => {
  assert.equal(evaluateAnswer(scenarioOf('g-001'), 'PHISH'), true);
  assert.equal(evaluateAnswer(scenarioOf('g-001'), 'LEGIT'), false);
  assert.equal(evaluateAnswer(scenarioOf('g-010'), 'legit'), true);
  assert.equal(evaluateAnswer(scenarioOf('g-003'), 'C'), true);
  assert.equal(evaluateAnswer(scenarioOf('g-003'), 'A'), false);
});

test('jawaban ganda dan jawaban asing ditolak', () => {
  const session = startSession([packOf('golden', [scenarioOf('g-001')])], { count: 1 });
  session.answer('PHISH');
  assert.throws(() => session.answer('PHISH'), (error) => error instanceof PQError);
  assert.throws(
    () => evaluateAnswer(scenarioOf('g-003'), 'Z'),
    (error) => error instanceof PQError && error.code === 'INVALID_OPTION',
  );
});

test('normalizeProgress melengkapi field yang hilang', () => {
  const progress = normalizeProgress({ total_xp: 250 });
  assert.equal(progress.level, 'analis');
  assert.equal(progress.counters.answered, 0);
  assert.deepEqual(progress.counters.correct_redflag, {});
  assert.deepEqual(normalizeProgress(null), createProgress());
});

for (const testCase of golden.answer_cases) {
  test(`golden jawaban: ${testCase.name}`, () => {
    const progress = normalizeProgress(testCase.progress);
    const session = startSession([packOf('golden', [scenarioOf(testCase.scenario_id)])], {
      count: 1,
      progress,
    });
    const result = session.answer(testCase.option_id);
    for (const [field, expected] of Object.entries(testCase.expected)) {
      assert.deepEqual(result[field], expected, `field ${field} tidak cocok`);
    }
  });
}

for (const testCase of golden.session_cases) {
  test(`golden sesi: ${testCase.name}`, () => {
    const scenarios = testCase.scenario_ids.map(scenarioOf);
    const progress = normalizeProgress(testCase.progress);
    const session = startSession([packOf(testCase.pack_id, scenarios)], {
      count: testCase.count,
      seed: testCase.seed,
      progress,
    });
    assert.deepEqual(
      session.scenarios.map((scenario) => scenario.id),
      testCase.expected_order,
      'urutan hasil seed harus identik dengan Python',
    );
    for (const scenarioId of testCase.expected_order) {
      assert.equal(session.current().id, scenarioId);
      session.answer(testCase.answers[scenarioId]);
    }
    const summary = session.summary();
    for (const [field, expected] of Object.entries(testCase.expected)) {
      assert.deepEqual(summary[field], expected, `field ${field} tidak cocok`);
    }
    assert.deepEqual(session.summary(), summary, 'summary harus idempoten');
  });
}

for (const testCase of golden.time_attack_cases) {
  test(`golden mode waktu: ${testCase.name}`, () => {
    const progress = normalizeProgress(testCase.progress);
    const session = startSession([packOf('golden', [scenarioOf(testCase.scenario_id)])], {
      count: 1,
      progress,
      mode: testCase.mode,
      timeLimitMs: testCase.time_limit_ms,
    });
    const result = session.answer(testCase.option_id, testCase.elapsed_ms);
    for (const [field, expected] of Object.entries(testCase.expected)) {
      assert.deepEqual(result[field], expected, `field ${field} tidak cocok`);
    }
  });
}

for (const testCase of golden.leaderboard_cases) {
  test(`golden leaderboard: ${testCase.name}`, () => {
    const { entries, rank } = insertEntry(testCase.entries, testCase.entry);
    assert.equal(rank, testCase.expected_rank, 'peringkat tidak cocok');
    assert.deepEqual(entries.map((item) => item.score), testCase.expected_scores);
  });
}

test('mode tidak dikenal ditolak', () => {
  assert.throws(
    () => startSession([packOf('golden', [scenarioOf('g-001')])], { mode: 'kilat' }),
    (error) => error instanceof PQError && error.code === 'INVALID_MODE',
  );
});

test('batas waktu harus positif', () => {
  assert.throws(
    () => startSession([packOf('golden', [scenarioOf('g-001')])], { timeLimitMs: 0 }),
    (error) => error instanceof PQError && error.code === 'INVALID_MODE',
  );
});

test('maxScore mode waktu mencakup bonus kecepatan', () => {
  const pack = packOf('golden', [scenarioOf('g-001')]);
  const classic = startSession([pack], { count: 1, mode: 'classic' });
  classic.answer('PHISH', 0);
  assert.equal(classic.maxScore, 10);

  const timed = startSession([pack], { count: 1, mode: 'time_attack' });
  timed.answer('PHISH', 0);
  assert.equal(timed.maxScore, 15);
  assert.equal(timed.score, 15);
});
