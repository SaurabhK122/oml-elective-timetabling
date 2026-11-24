/** Tests use the IndexedDB API through fake-indexeddb, not a hand-written storage stub. */
const assert = require('node:assert/strict');
const {IDBFactory, IDBObjectStore} = require('fake-indexeddb');
const {webcrypto} = require('node:crypto');

(async () => {
  if (!globalThis.crypto) globalThis.crypto = webcrypto;
  const {openRunStore, retainedRuns, fingerprint, ENGINE_VERSION} = await import('../public/lab/run-history.js');
  const indexedDB = new IDBFactory();
  let store = await openRunStore(indexedDB);
  const record = n => ({
    schemaVersion: 1, status: 'completed', id: `run-${n}`,
    completedAt: new Date(Date.UTC(2026, 10, 24, 12, n)).toISOString(),
    method: 'both', controls: {floor: '5.25', method: 'both', unlimited: true},
    settings: {floor: 5.25, maxCredits: 9, theta: .175, timeLimit: null, heuristicSeed: 2026},
    input: {units: [{unit_id: 'A', credits: 1, seat_cap: 2}], students: {S1: ['A']}, sessions: [], groups: {}},
    engineVersion: ENGINE_VERSION, dataFingerprint: 'data-test', fingerprint: `run-test-${n}`,
    results: {
      solver: {allocation: {S1: ['A']}, short: 4.25, credits: 1, asked: [], moves: [], step1: {status: 'time limit', bound: 0, gap: .5}},
      heuristic: {allocation: {S1: ['A']}, short: 4.25, credits: 1, asked: [], moves: [], rounds_completed: 500},
    },
    logs: [{phase: 'Done'}],
  });
  assert.deepEqual(await store.list(), []);
  for (let n = 1; n <= 4; n++) await store.save(record(n));
  assert.deepEqual((await store.list()).map(x => x.id), ['run-4', 'run-3', 'run-2']);
  store.close();
  store = await openRunStore(indexedDB);
  assert.deepEqual((await store.list())[0], record(4), 'Reload must restore the entire record exactly');
  const copy = await store.list();
  copy[0].input.students.S1.push('B');
  copy[0].results.solver.allocation.S1.length = 0;
  assert.deepEqual((await store.list())[0], record(4), 'Returned data must not mutate persisted history');

  const before = await store.list();
  await assert.rejects(store.save({...record(5), status: 'cancelled'}));
  await assert.rejects(store.save({...record(5), results: {solver: record(5).results.solver}}));
  assert.deepEqual(await store.list(), before, 'Failed or partial records must not replace history');
  assert.throws(() => retainedRuns(before, {...record(5), status: 'failed'}));

  // Fail a write after it has read the previous records; the transaction must roll back.
  const originalPut = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function () { throw new DOMException('Simulated storage quota', 'QuotaExceededError'); };
  try { await assert.rejects(store.save(record(5)), /quota/i); }
  finally { IDBObjectStore.prototype.put = originalPut; }
  assert.deepEqual(await store.list(), before, 'Aborted transaction must preserve all previous records');

  // Separate tabs share serial read/write transactions, so no completed execution is lost.
  const second = await openRunStore(indexedDB);
  await Promise.all([store.save(record(5)), second.save(record(6))]);
  assert.deepEqual((await store.list()).map(x => x.id), ['run-6', 'run-5', 'run-4']);
  const changed = record(6); changed.logs.push({phase: 'Updated metadata'});
  await second.save(changed);
  assert.deepEqual((await store.list()).map(x => x.id), ['run-6', 'run-5', 'run-4'], 'Saving an existing ID must not add a duplicate');

  assert.equal(await fingerprint({a: 1, b: {c: 2}}), await fingerprint({b: {c: 2}, a: 1}));
  const base = {input: record(1).input, settings: record(1).settings, method: 'both', engineVersion: ENGINE_VERSION};
  const hash = await fingerprint(base);
  for (const changed of [
    {...base, method: 'solver'}, {...base, engineVersion: ENGINE_VERSION + '-changed'},
    {...base, settings: {...base.settings, heuristicSeed: 7}},
    {...base, input: {...base.input, units: [{unit_id: 'A', credits: 1, seat_cap: 3}]}},
  ]) assert.notEqual(await fingerprint(changed), hash, 'All outcome-determining inputs must affect the fingerprint');
  second.close(); store.close();
  console.log('History storage passed: retain last 3, reopen/restore exact records, isolated copies, reject failed/partial runs, atomic rollback, cross-tab writes, duplicate IDs and complete fingerprints.');
})().catch(error => {console.error(error); process.exitCode = 1;});
