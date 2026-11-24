/** Small exhaustive oracle, independent of the MILP builder and its validators. */
import assert from 'node:assert/strict';
import loadHighs from 'highs';
import {solveOML} from './oml-solve';
import type {Input, Settings} from './oml-model';

const highs = await loadHighs();
let seed = 9363;
function random(n: number) {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed % n;
}
function subsets<T>(items: T[]) {
  return Array.from({length: 2 ** items.length}, (_, mask) =>
    items.filter((_, index) => Boolean(mask & (1 << index))));
}
function before(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

for (let test = 0; test < 24; test++) {
  const units = ['A', 'B', 'C', 'P'].map((unit_id, index) => ({
    unit_id, credits: [.5, .75, 1][random(3)], seat_cap: 1 + random(2),
    movable: random(4) ? 1 : 0, is_pgpx_or_fabm: index === 3 ? 1 : 0,
  }));
  const rows = units.flatMap((u, index) => [0, 1].map(k => ({
    unit_id: u.unit_id, date: '2026-12-01', slot: String((index + k + random(2)) % 4),
    session_type: random(5) === 0 ? 'block' : 'class',
  })));
  const sessions = rows.filter((s, index) => rows.findIndex(t =>
    t.unit_id === s.unit_id && t.slot === s.slot) === index);
  const groups = test % 3 === 0 ? {G: ['A', 'B']} : {};
  const input: Input = {units, sessions, groups, students: {
    S1: ['A', 'B', 'C'], S2: ['A', 'B', 'C'],
  }};
  const settings: Settings = {floor: 1.5, maxCredits: 2,
    theta: [0, .5, 1][test % 3], version: test % 2 ? 'with' : 'without', timeLimit: 10};
  const unitMap = new Map(units.map(u => [u.unit_id, u]));
  const allowance = new Map(units.map(u => [u.unit_id, u.movable
    ? Math.floor(settings.theta * sessions.filter(s => s.unit_id === u.unit_id).length + .5)
    : 0]));
  const movable = sessions.filter(s => s.session_type === 'class' && allowance.get(s.unit_id)! > 0);
  let best: number[] | null = null;

  for (const moves of subsets(movable)) {
    if (units.some(u => moves.filter(m => m.unit_id === u.unit_id).length > allowance.get(u.unit_id)!)) continue;
    const occupied = sessions.filter(s => !moves.includes(s));
    const choices = Object.entries(input.students).map(([, wanted]) => {
      const options = [...wanted, ...(settings.version === 'with' ? ['P'] : [])];
      return subsets(options).filter(held => {
        if (held.reduce((sum, u) => sum + unitMap.get(u)!.credits, 0) > settings.maxCredits!) return false;
        if (held.filter(u => unitMap.get(u)!.is_pgpx_or_fabm).length > 1) return false;
        if (Object.values(groups).some(g => held.filter(u => g.includes(u)).length > 1)) return false;
        for (let a = 0; a < held.length; a++) for (let b = a + 1; b < held.length; b++) {
          if (occupied.some(s => s.unit_id === held[a] && occupied.some(t =>
            t.unit_id === held[b] && s.date === t.date && s.slot === t.slot))) return false;
        }
        return true;
      });
    });
    for (const a of choices[0]) for (const b of choices[1]) {
      if (units.some(u => Number(a.includes(u.unit_id)) + Number(b.includes(u.unit_id)) > u.seat_cap)) continue;
      const credits = [a, b].map(held => held.reduce((sum, u) => sum + unitMap.get(u)!.credits, 0));
      const score = [credits.reduce((sum, c) => sum + Math.max(0, settings.floor - c), 0),
        new Set(moves.map(m => m.unit_id)).size, -credits.reduce((sum, c) => sum + c, 0)];
      if (!best || before(score, best)) best = score;
    }
  }

  const result = solveOML(highs, input, settings);
  assert(result.optimal, `Case ${test}: both stages must prove optimal`);
  assert(result.plan, `Case ${test}: missing plan`);
  assert.deepEqual([result.plan.short, result.plan.asked.length, -result.plan.credits], best,
    `Case ${test}: solver objective differs from exhaustive enumeration`);
}
console.log('24 deterministic small cases matched an independent exhaustive lexicographic oracle.');
