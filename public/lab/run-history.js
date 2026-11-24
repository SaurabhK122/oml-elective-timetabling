/** A single IndexedDB transaction appends a complete execution and retains the latest three. */
export const HISTORY_SCHEMA = 1;
export const ENGINE_VERSION = 'oml-2026-11-24-seven-step-v1';
const clone = value => JSON.parse(JSON.stringify(value));
export function retainedRuns(previous, execution) {
  if (execution?.schemaVersion !== HISTORY_SCHEMA || execution.status !== 'completed' || !execution.id || !Number.isFinite(Date.parse(execution.completedAt))) throw new Error('Only complete executions can enter Recent Runs.');
  const expected = execution.method === 'both' ? ['solver', 'heuristic'] : [execution.method];
  if (expected.some(method => !execution.results?.[method]?.allocation)) throw new Error('A completed execution must include every requested method.');
  return [...previous.filter(run => run.id !== execution.id), clone(execution)]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt) || b.id.localeCompare(a.id)).slice(0, 3);
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export async function fingerprint(value) {
  const bytes = new TextEncoder().encode(canonical(value));
  if (!globalThis.crypto?.subtle) throw new Error('This browser needs a secure HTTPS address to identify and save runs.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function openRunStore(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error('This browser does not provide persistent run storage.');
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('oml-timetable-lab', 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('history')) request.result.createObjectStore('history'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Run storage could not be opened.'));
    request.onblocked = () => reject(new Error('Close other tabs of this app and reload to enable run storage.'));
  });
  const transact = (mode, execution) => new Promise((resolve, reject) => {
    const transaction = db.transaction('history', mode);
    const store = transaction.objectStore('history');
    const request = store.get('recent');
    let next;
    request.onsuccess = () => {
      try {
        const previous = Array.isArray(request.result) ? request.result : [];
        next = execution ? retainedRuns(previous, execution) : previous;
        if (execution) store.put(next, 'recent');
      } catch (error) { transaction.abort(); reject(error); }
    };
    transaction.oncomplete = () => resolve(clone(next));
    transaction.onerror = () => reject(transaction.error || new Error('The run could not be saved.'));
    transaction.onabort = () => reject(transaction.error || new Error('The run could not be saved. Previous history is unchanged.'));
  });
  db.onversionchange = () => db.close();
  return {list: () => transact('readonly'), save: execution => transact('readwrite', execution), close: () => db.close()};
}
