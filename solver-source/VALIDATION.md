# Solver validation

Audit date: 24 November 2026.

The current port was checked against the updated master notebook in
`OML_project_update.zip`. Supplied inputs and the MILP formulation are retained.
The updated seven-step heuristic is implemented for live browser runs.

## Checks completed

- TypeScript typecheck of the model, orchestration and worker passed.
- Six real HiGHS WebAssembly solves passed: test A at 0%, 25% and 100%
  flexibility; the one-external-course test; an immutable-block test; and a
  shared-seat-cap test. Both stages were proven optimal for these tiny cases.
- All 48 supplied saved runs passed independent plan validation and validation
  of the reconstructed integer solution against every generated model row,
  variable bound and integrality condition. This covers 19,968 synthetic
  student plans across two surveys, 24 scenarios and two methods.
- Twenty-four deterministic small instances matched a separately implemented
  exhaustive oracle for the lexicographic objectives: minimum shortfall,
  minimum courses asked and maximum total credits. The cases include fractional
  credits, fixed blocks, seat capacities, same-content groups, external-course
  limits and flexibility values of 0%, 50% and 100%.
- Twenty-three independent Python heuristic fixtures matched complete allocations, moves and metrics. Four seeded random sequences matched Python `random.Random`, including a seed larger than 32 bits.
- Four full-cohort heuristic executions (416 students each, both demand profiles, zero and 20% flexibility) matched the supplied updated notebook allocations and moves exactly. See `HEURISTIC_VALIDATION.json` for runtimes and outcomes.
- Three custom-input heuristic regressions cover zero external access and credit-ceiling edge cases. The port guards a notebook edge case where a minimal floor-covering set could exceed a customized ceiling; supplied-data results remain identical.
- Seven additional optimal solver runs confirm that editable credit ceilings, external access, seat caps and same-content groups affect the actual constraints. Seven invalid input cases are rejected, including impossible dates, non-finite slots and unsafe numeric values.
- The bundled browser loader branch fetched WebAssembly in an isolated Node VM
  and solved test A at 25% correctly, then ran both methods with unlimited solver time. It uses the actual compiled worker and
  WebAssembly asset intended for the website.

Reproduce with `npm ci` and `npm run check:all` from `solver-source/`.

## Scope of the evidence

The 48 saved results remain supplied notebook outputs. Four full-size heuristic cases were rerun for exact comparisons; the full-size time-limited integer programs were not rerun during this audit. Feasibility validation does not turn a
time-limited incumbent into a proven optimum. Original stage statuses, bounds
and gaps remain part of every saved solver record. The VM loader test is not
browser visual testing and does not demonstrate every hosted browser feature.

The source computes flexibility allowances using all original occupied slots,
including block slots, but only eligible class sessions may move. For ITS this
means 22 occupied slots. Moved sessions are removed from their original slots;
the solver does not assign their destinations or prove replacement-slot
availability.

## Supplied capacity assumption

The final v2 source sets Bitcoins and Bullion (`BaB`) to **80 seats**, with the
source label `default 80 (outline says TBD)`. The website preserves that value.
It is an assumption in the supplied data, not a newly verified official cap.

`capacity-audit.json` records the BaB allocation in every updated saved plan.
All 48 plans satisfy the supplied 80-seat cap; the maximum allocation is 57.
If this input capacity is changed, affected scenarios must be recomputed rather
than reusing saved allocations.
