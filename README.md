# OML Elective Timetabling

An academic decision-support app for IIMA Term VI 2026–27. Explore two synthetic demand profiles, compare 24 scenarios using saved integer-program and heuristic results, inspect session-move requests and student allocations, or run either method with editable inputs on your own device. The three most recent completed executions can be reloaded with their original inputs and outputs.

[Lovable editor](https://lovable.dev/projects/b4e90b9e-2923-4877-92a3-ba5d6176afb7) · [GitHub repository](https://github.com/SaurabhK122/oml-elective-timetabling)

## Source and interpretation

The application uses the supplied `OML_project_update.zip`, including its single master notebook, updated seven-step heuristic and saved results for both surveys. This package supersedes the November 23 final v2 package and the initial model attachments. Its scenario grid combines two demand profiles (9–10.5 and 5–9 listed credits), floors of 5 or 6 credits, external-course access with or without one PGPX/FABM unit, and flexibility of 0%, 10% or 20%. Both methods are available for every combination: 48 saved result records.

- Student preferences and identifiers are synthetic, and preferences are unranked.
- Source seat capacities are retained. In particular, BaB uses the source CSV default of 80 seats (`outline says TBD`); validate this assumption before operational use.
- Recommendations identify original sessions to move, assuming replacements introduce no new clashes. Replacement dates, rooms and faculty availability are not optimized.
- Saved results preserve original solve statuses, bounds, gaps and run times. A feasible time-limited result is not proof of optimality. Stage 2 bounds are conditional on the first-stage limits.
- Fresh browser executions are separate from the 48 saved notebook study results. Changing the synthetic population or its preferences requires a corresponding dataset, rather than merely changing a label.

## Architecture

The existing TanStack Start/React hosting scaffold is preserved. Its home route embeds the validated static app at `/lab/index.html` in a full-page accessible frame. This isolates the app styling and worker lifecycle while preserving its relative asset URLs. The HiGHS WebAssembly solver and the TypeScript port of the updated heuristic run in a dedicated browser worker and can be cancelled. The browser executes the actual optimization locally; Lovable hosts its interface and assets. There is no database, authentication, AI call or external API dependency.

- `public/lab/`: app, source data, browser worker, locally hosted HiGHS WASM, and downloads.
- `solver-source/`: reproducible TypeScript model, solver orchestration, tests and build commands.
- `tests/`: integration and static UI checks.
- `public/lab/downloads/oml_web_bundle.zip`: the updated master notebook and Python source, both survey input sets, result workbooks, saved plans and provenance. Notebook outputs and instructor fields are sanitized.

## Editable inputs and recent runs

The live-run form exposes the demand profile, minimum and maximum credits, external-course access, timetable flexibility, per-stage solver time limit (including unlimited), shortfall penalty, and heuristic rounds, patience, group size and seed. It can run the solver, the heuristic, or both. Penalty validation preserves the notebook’s ordered priorities. Course capacities, timetable sessions, same-content groups and student preferences can be changed by importing a validated dataset JSON. The supplied capacity defaults do not silently overwrite imported data.

Recent Runs uses IndexedDB on the current browser and device. Each record keeps the complete dataset, settings, methods, results, timestamps and data/settings/engine fingerprints. Loading restores those inputs and outputs without recomputing. Only completed executions with validated feasible results enter history; a fourth completed run replaces the oldest of the three. Failed or cancelled runs do not evict anything. The two methods together count as one execution. Browser data clearing removes this history, and it does not synchronize across devices. Complete results can also be exported.

The supplied 30-minute solver rerun has summary evidence only, so it is supplementary and is never presented as a loadable complete plan. Saved study results are preserved independently of browser run history.

Instructor names are removed from the web data and download bundle. Publishing this application makes its bundled synthetic data and downloads available to website visitors.

## Development

Use the supplied Bun lockfile in Lovable. Install dependencies and run the root `dev` or `build` script for the hosting scaffold. The standalone inner app can also be checked with `python -m http.server 8765 --directory public/lab`.

In `solver-source`, run `npm ci` followed by the documented model checks, test solves and exhaustive comparisons. The solver source is tested separately from the TanStack application. Rebuild its assets using the commands in its README and retain `public/lab/solver-assets/HIGHS_LICENSE.txt`.

## GitHub workflow

Push reviewed, working commits to `main` to sync them into Lovable. Preserve published Git history and the generated-file/database rules in `AGENTS.md`. Ordinary development is performed through GitHub to minimize Lovable builder credits. Public publication is a separate action from updating the connected project.
