# OML browser solver

This TypeScript port preserves the supplied updated November 2026 master notebook model:
two mixed-integer solve stages; quarter-credit shortfalls; constraints C0–C9;
rounded flexibility allowances based on all occupied slots; immutable block
sessions; and independent validation from allocations and moved sessions.
Stage 1 starts from scratch. Stage 2 starts from the first plan and locks its
shortfall, number of courses asked and minimum credits. Cleanup removes
unnecessary moves, after which all hard rules are checked again.

The model proposes original sessions to move. It does not assign replacement
times, rooms or faculty availability. Results assume suitable replacement slots
exist. The two supplied surveys are synthetic and their course lists are unranked.

## Files

- `oml-model.ts`: input checks, model, priority locks, result reconstruction,
  independent hard-constraint checks and per-slot cleanup.
- `oml-solve.ts`: HiGHS 1.16.0 WebAssembly orchestration and source JSON adapter.
- `oml-heuristic.ts`: updated seven-step heuristic with Python-compatible seeded random choices.
- `heuristic-tests.ts`: exact comparisons with independent Python notebook fixtures.
- `oml.worker.ts`: background-worker interface. Terminate the worker to cancel.
- `tests.ts`: known-answer cases, immutable blocks, seat caps, and validation of
  all 48 saved solver and heuristic plans against each model row.
- `exhaustive-tests.ts`: 24 deterministic small cases compared with exhaustive
  enumeration using a separate constraint evaluator.
- `worker-vm-check.cjs`: bundled browser loader branch with fetched WebAssembly.
- `browser-check.cjs`: optional Chromium worker smoke check; requires Playwright
  through `CODEX_PRIMARY_RUNTIME_NODE_MODULES` and a usable Chromium installation.
- `VALIDATION.md`: validation scope and current evidence.
- `capacity-audit.json`: supplied BaB capacity assumption and sensitivity counts.

## Install and check

Run these commands from `solver-source/`:

```sh
npm ci
npm run check:all
```

Saved data are read from `../public/lab/data/oml_project.json`. Override that
location with `OML_BUNDLE_PATH` when auditing a different bundle. The worker VM
check reads `../public/lab/oml.worker.js` and
`../public/lab/solver-assets/highs.wasm`. Its package script supplies the required
Node `--experimental-vm-modules` flag. A VM check is not browser visual QA.

## Rebuild browser assets

Run `npm run build:worker` and `npm run build:api` after changing solver source.
These scripts bundle to `../public/lab/oml.worker.js` and
`../public/lab/oml-api.js`. Copy `node_modules/highs/build/highs.wasm` into
`../public/lab/solver-assets/` and retain the package's `LICENSE` there as
`HIGHS_LICENSE.txt`. The bundled `node:module` import remains inside HiGHS's
Node-only branch and is not executed by a browser worker.

## Browser interface

Import `inputFromBundle` from `./oml-api.js`. Create a module worker at
`./oml.worker.js` and post `{id, input, settings, method, wasmUrl}`. `method` is `solver`, `heuristic` or `both`. Settings include
`floor`, `version` (`with` or `without`), `theta` as a fraction and `timeLimit`
in seconds per stage (`null` means unlimited). Other settings include `maxCredits`, `outsideLimit` (zero or one), `penalty`, `heuristicRounds`, `heuristicPatience`, `heuristicGroup`, `heuristicSeed` and `showSolverLog`. The supplied source default is 1,200 seconds per stage.
A shorter selected limit changes search time, not the formulation.

Messages have `type` equal to `progress`, `log`, `result` or `error`. Completion carries `{results, engineVersion}`, where results has the chosen method keys. Each result contains `plan`, `method`, `total_seconds` and its method-specific evidence. Solver evidence includes `step1`, `step2`, `optimal`, `message` and `model_size`. Heuristic results are feasible plans without optimality bounds. A stage report has
`status`, `found_plan`, `objective`, `bound`, `gap`, `seconds` and
`started_from_plan`. Missing or non-finite bounds and gaps are null. A time-limit
incumbent must never be presented as proven optimal. Without a stage-1 feasible
incumbent, the result has no plan. If stage 2 produces no feasible incumbent,
the verified stage-1 plan is retained and the message says so explicitly.

A plan contains `allocation`, `moves` (`unit_id`, `date`, `slot`), `asked`,
`short`, `students_short` and `credits`. New moves use `unit_id`, whereas saved
JSON moves use `unit`; normalize that field in the interface. Step-2 bounds
are conditional on the first-stage locks, not global lexicographic bounds.

Both methods execute live in the browser worker. For a combined execution, the heuristic runs first and the solver still starts stage 1 from scratch, as in the master notebook. If a selected method fails or the user cancels, no completed-run history record is written. Recent-run persistence belongs to the UI; the engine never reuses a cached plan for changed inputs.
