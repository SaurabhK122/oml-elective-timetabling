"""Validate and package the supplied OML project update for the web app.

Usage: python scripts/build_study_bundle.py /path/to/OML_project_update
Requires pandas and openpyxl. The input is read only; no optimization is run.
"""

from __future__ import annotations

import argparse
import ast
from collections import Counter
from hashlib import sha256
import io
from itertools import combinations
import json
import math
from pathlib import Path
import pickle
import re
import shutil
import tempfile
import zipfile

import openpyxl
import pandas as pd


class SafeUnpickler(pickle.Unpickler):
    """The supplied caches contain only primitive Python containers/scalars."""

    def find_class(self, *args):
        raise ValueError("Classes and callable objects are disabled in study caches")

    def persistent_load(self, _pid):
        raise ValueError("Persistent objects are disabled in study caches")


def records(path):
    return json.loads(pd.read_csv(path).to_json(orient="records"))


def serial(value):
    if isinstance(value, dict):
        return {str(k): serial(v) for k, v in value.items()}
    if isinstance(value, set):
        return [serial(v) for v in sorted(value)]
    if isinstance(value, (list, tuple)):
        return [serial(v) for v in value]
    if isinstance(value, float) and not math.isfinite(value):
        return None
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    raise ValueError(f"Unexpected cache type: {type(value).__name__}")


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def clean_build_data(text):
    """Remove hard-coded faculty names from the reference input builder only."""
    offsets = [0]
    for line in text.splitlines(keepends=True):
        offsets.append(offsets[-1] + len(line))
    replacements = []
    for node in ast.parse(text).body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id in {"FABM_UNITS", "PGPX_UNITS"}
            for t in node.targets
        ):
            for value in node.value.values:
                instructor = value.elts[2]
                replacements.append((
                    offsets[instructor.lineno - 1] + instructor.col_offset,
                    offsets[instructor.end_lineno - 1] + instructor.end_col_offset,
                ))
    for start, end in sorted(replacements, reverse=True):
        text = text[:start] + '""' + text[end:]
    ast.parse(text)
    return text


def clean_workbook(source, destination):
    """Retain supplied workbook structure and values, clearing faculty cells."""
    workbook = openpyxl.load_workbook(source)
    for sheet in workbook.worksheets:
        for cell in sheet[1]:
            if str(cell.value).strip().lower() in {"instructors", "instructor(s)", "faculty"}:
                for row in sheet.iter_rows(min_row=2, min_col=cell.column, max_col=cell.column):
                    row[0].value = None
    workbook.save(destination)


README = """# OML updated notebook and study results

Source: OML_project_update.zip, 24 November 2026. This package contains the updated
seven-step heuristic and the unchanged two-stage MILP model, one master notebook
for both surveys, input CSVs, data-generation code, and all 48 supplied plans.

## Run the notebook

Open OML_elective_timetabling_master/OML_master.ipynb with its working directory
set to that same folder. Set SURVEY in Section 1.2 to survey_9_to_10.5_credits or
survey_5_to_9_credits, then run all cells. OML_master.py is the notebook's code
cells concatenated in order. Python 3, pandas, NumPy, SciPy >= 1.15, matplotlib,
and openpyxl are required; highspy is optional.

The supplied solver caches retain the original 20-minute limit per stage. The
master notebook loads those caches and reruns the updated heuristic. Its cache
filenames do not fingerprint changed inputs. Delete incompatible cache files
before rerunning the notebook with different data/settings. The web app uses
separate run history with complete inputs and fingerprints.

## What is included

- oml_project.json: 69 courses, 1,184 occupied slots, seven same-content groups,
  two surveys of 416 synthetic students, and 48 scenario-method results.
- validation.json: checks of every supplied allocation and move against inputs,
  plus agreement with workbook summaries. No full optimization was rerun while
  producing this package.
- OML_elective_timetabling_master: updated notebook, Python code, both surveys'
  CSVs, build_survey.py and build_data.py reference scripts, sanitized workbooks,
  and primitive-only solver/heuristic caches.
- supplemental/solver_30min_summary.json: the separate 30-minute-per-stage
  rerun's summary only. No complete plan was supplied for that rerun, so it is
  not a loadable result and is not included among the 48 main study results.
- provenance.json: hashes of the source files used to build this package.

Faculty names and raw timetable files are excluded. A blank instructors column
is retained in downloaded units.csv and workbook reports so notebook reporting
cells still work. The reference build_data.py needs original raw timetables,
which are not distributed here; sanitized model-ready CSVs are included.
Its hard-coded faculty-name fields are blank. Model and heuristic functions in
the notebook and OML_master.py are otherwise unchanged. Notebook outputs are
cleared. All student IDs S001-S416 are synthetic, not actual registration data.

BaB capacity remains 80, following the supplied CSV assumption: "default 80
(outline says TBD)". Change the actual course capacity input to test another cap.

## Interpreting results

A time-limit solver result is a feasible incumbent, not a proven optimum.
Step 1 reports its solve-time weighted objective and bound. Final shortfall and
asked-course counts may improve during Step 2 and cleanup. Step 2's credit bound
is conditional on Step 1 locks. The 30-minute rerun does not replace the supplied
20-minute main results.

Moves identify original sessions to vacate. Replacement slots are not assigned
by this model. Protected block slots never move; the allowance counts all
occupied slots before limiting movable class sessions. Heuristic quality can
differ from solver quality; saved results and fresh browser runs are distinct.
"""


def build(source, public):
    source = source.resolve()
    master = source / "OML_elective_timetabling_master"
    surveys = master / "surveys"
    common = surveys / "survey_9_to_10.5_credits" / "data"
    units = records(common / "units.csv")
    for unit in units:
        unit.pop("instructors", None)
    by_unit = {v["unit_id"]: v for v in units}
    sessions = records(common / "sessions.csv")
    groups = records(common / "same_content_groups.csv")
    slots = {unit: set() for unit in by_unit}
    classes = {unit: set() for unit in by_unit}
    for row in sessions:
        slot = (row["date"], row["slot"])
        slots[row["unit_id"]].add(slot)
        if row["session_type"] == "class":
            classes[row["unit_id"]].add(slot)
    outside = {unit for unit, data in by_unit.items() if data["is_pgpx_or_fabm"]}
    group_of = {row["unit_id"]: row["group_id"] for row in groups}
    checks, variants, inputs = [], [], []

    def remember(path):
        inputs.append({"path": str(path.relative_to(source)), "sha256": digest(path)})

    with tempfile.TemporaryDirectory(prefix="oml-bundle-") as temporary:
        stage = Path(temporary)
        notebook = json.loads((master / "OML_master.ipynb").read_text())
        remember(master / "OML_master.ipynb")
        for cell in notebook["cells"]:
            if cell["cell_type"] == "code":
                cell["outputs"] = []
                cell["execution_count"] = None
        notebook_code = "\n\n".join(
            "".join(cell["source"]) for cell in notebook["cells"] if cell["cell_type"] == "code"
        ) + "\n"
        compile(notebook_code, "OML_master.py", "exec")
        out_master = stage / "OML_elective_timetabling_master"
        out_master.mkdir()
        (out_master / "OML_master.ipynb").write_text(json.dumps(notebook, ensure_ascii=False))
        (out_master / "OML_master.py").write_text(notebook_code)

        for folder in sorted(surveys.glob("survey*")):
            source_data = folder / "data"
            for name in ["units.csv", "sessions.csv", "same_content_groups.csv"]:
                assert (source_data / name).read_bytes() == (common / name).read_bytes(), name
            preferences = {}
            for row in records(source_data / "pgp_preference_survey.csv"):
                preferences.setdefault(row["student_id"], []).append(row["course"])
            params = {row["parameter"]: row["value"] for row in records(source_data / "parameters.csv")}
            summary = pd.read_excel(folder / "outputs/pgp_office_results_v2.xlsx", sheet_name="Summary")
            heuristic_summary = pd.read_excel(folder / "outputs/heuristic_results.xlsx", sheet_name="Summary")
            runs = []
            dest = out_master / "surveys" / folder.name
            (dest / "outputs/runs").mkdir(parents=True)
            (dest / "data").mkdir()
            for fp in sorted((folder / "outputs/runs").glob("*.pkl")):
                match = re.fullmatch(r"(solver|heuristic)_floor(\d+)_(with|without)_theta(\d+)", fp.stem)
                assert match, fp
                kind, floor, version, theta = match.groups()
                floor, theta = int(floor), int(theta) / 100
                plan = SafeUnpickler(io.BytesIO(fp.read_bytes())).load()
                serial(plan)  # Explicitly reject nonprimitive content before copying a cache.
                allot, moves = plan["allocation"], plan["moves"]
                asked = {unit for unit, slot in moves}
                assert set(allot) == set(preferences) and len(allot) == int(params["N_STUDENTS"]), (fp, "students")
                remaining = {unit: all_slots - {slot for item, slot in moves if item == unit}
                             for unit, all_slots in slots.items()}
                allowance = {unit: math.floor(theta * len(all_slots) + .5) if by_unit[unit]["movable"] else 0
                             for unit, all_slots in slots.items()}
                moved_counts = Counter(unit for unit, slot in moves)
                for unit, slot in moves:
                    assert slot in classes[unit] and by_unit[unit]["movable"], (fp, "fixed/block move")
                assert all(n <= allowance[unit] for unit, n in moved_counts.items()), (fp, "move cap")
                credits, seats = {}, Counter()
                for student, held in allot.items():
                    bid = set(preferences[student]) | (outside if version == "with" else set())
                    assert held <= bid, (fp, student, "bid")
                    assert len(held & outside) <= int(params["MAX_PGPX_OR_FABM_UNITS"]), (fp, student, "outside")
                    held_groups = [group_of[x] for x in held if x in group_of]
                    assert len(held_groups) == len(set(held_groups)), (fp, student, "same content")
                    credits[student] = sum(by_unit[x]["credits"] for x in held)
                    assert credits[student] <= float(params["MAX_CREDITS"]), (fp, student, "credit max")
                    for a, b in combinations(held, 2):
                        assert not remaining[a] & remaining[b], (fp, student, "clash")
                    seats.update(held)
                assert all(n <= by_unit[unit]["seat_cap"] for unit, n in seats.items()), (fp, "seats")
                short = sum(max(0, floor - c) for c in credits.values())
                short_students = sum(c < floor for c in credits.values())
                assert (short, short_students, sum(credits.values()), asked) == (
                    plan["short"], plan["students_short"], plan["credits"], plan["asked"]), (fp, "metrics")
                for table in [summary] + ([heuristic_summary] if kind == "heuristic" else []):
                    rows = table[(table["Floor"] == floor) & (table["Version"] == version)
                                 & (table["Flexibility"] == theta) & (table["Method"] == kind.title())]
                    assert len(rows) == 1, (fp, "summary row")
                    row = rows.iloc[0]
                    assert (row["Total shortfall"], row["Students short"], row["Total credits"],
                            row["Courses asked"], row["Sessions moved"]) == (
                                short, short_students, plan["credits"], len(asked), len(moves)), (fp, "workbook")
                if kind == "solver":
                    assert plan["credits"] + 1e-8 >= plan["step2"]["step1_credits"], (fp, "credit lock")
                converted = serial(plan)
                converted.update(id=fp.stem, method=kind, floor=floor, version=version, theta=theta, validated=True)
                converted["moves"] = [{"unit": unit, "date": slot[0], "slot": slot[1]}
                                      for unit, slot in sorted(moves)]
                runs.append(converted)
                checks.append({"survey": folder.name, "run": fp.stem, "passed": True,
                               "students_checked": len(allot), "assignment_count": sum(map(len, allot.values()))})
                remember(fp)
                shutil.copyfile(fp, dest / "outputs/runs" / fp.name)
            assert len(runs) == 24, folder
            variants.append({"id": folder.name,
                             "label": "5–9 listed credits" if folder.name == "survey_5_to_9_credits" else "9–10.5 listed credits",
                             "parameters": params, "preferences": preferences, "runs": runs})
            for csv_file in sorted(source_data.glob("*.csv")):
                remember(csv_file)
                if csv_file.name == "units.csv":
                    frame = pd.read_csv(csv_file, keep_default_na=False)
                    frame["instructors"] = ""
                    frame.to_csv(dest / "data" / csv_file.name, index=False)
                else:
                    shutil.copyfile(csv_file, dest / "data" / csv_file.name)
            for script in ["build_data.py", "build_survey.py"]:
                remember(folder / script)
                text = (folder / script).read_text()
                if script == "build_data.py":
                    text = clean_build_data(text)
                compile(text, script, "exec")
                (dest / script).write_text(text)
            for workbook in sorted((folder / "outputs").glob("*.xlsx")):
                remember(workbook)
                clean_workbook(workbook, dest / "outputs" / workbook.name)

        assert len(checks) == 48
        supplemental_source = source / "solver_rerun/rerun_result.json"
        remember(supplemental_source)
        supplemental = {
            "label": "Separate 30-minute-per-stage solver rerun; summary only",
            "survey": "survey_9_to_10.5_credits", "floor": 6, "version": "with", "theta": 0.2,
            "timeLimitSecondsPerStep": 1800, "loadable": False,
            "note": "No complete allocation or move list was supplied. This does not replace the 20-minute main study result.",
            "result": json.loads(supplemental_source.read_text()),
        }
        (stage / "supplemental").mkdir()
        (stage / "supplemental/solver_30min_summary.json").write_text(json.dumps(supplemental, indent=2))
        bundle = {
            "schemaVersion": 1, "title": "OML Elective Timetabling", "institution": "IIM Ahmedabad",
            "term": "PGP II Term VI 2026–27", "sourceVersion": "Updated master notebook, 24 November 2026",
            "dataProvenance": "Synthetic student preferences generated with fixed seed 2026; actual published course and timetable data. Student IDs S001–S416 are synthetic.",
            "scope": "Saved validated results for 24 scenarios across two surveys and 48 scenario-method runs. Moving a session only removes its original slot; replacement dates/times are not optimized.",
            "timeLimitSecondsPerStep": 1200,
            "heuristicVersion": "seven-step-2026-11-24",
            "heuristicDefaults": {"rounds": 2000, "patience": 500, "groupSize": 10, "seed": 2026},
            "capacityAssumptions": [{"unit": "BaB", "seatCap": 80, "source": "default 80 (outline says TBD)"}],
            "sourceNotebookSha256": digest(master / "OML_master.ipynb"),
            "units": units, "sessions": sessions, "sameContentGroups": groups, "surveys": variants,
            "supplementalResults": [supplemental],
        }
        bundle_text = json.dumps(bundle, separators=(",", ":"), ensure_ascii=False, allow_nan=False)
        (stage / "oml_project.json").write_text(bundle_text)
        report = {
            "all_passed": True, "sourceVersion": bundle["sourceVersion"], "checked_runs": len(checks),
            "checked_student_plans": sum(x["students_checked"] for x in checks),
            "bundle_sha256": sha256(bundle_text.encode()).hexdigest(),
            "checks": ["All 416 synthetic students represented", "Bidding set membership",
                       "No more than one PGPX/FABM course", "Same content at most once", "Maximum 9 credits",
                       "No remaining original-slot clashes", "Course seat caps", "Only movable class sessions move",
                       "Per-unit allowance counts all occupied slots", "Recomputed shortfall and credit totals",
                       "Cached metrics match main workbook summaries", "Heuristic metrics match dedicated workbook",
                       "Solver Step 2 meets Step 1 credit lower limit"],
            "supplemental_plan_validated": False, "runs": checks,
        }
        (stage / "validation.json").write_text(json.dumps(report, indent=2))
        (stage / "provenance.json").write_text(json.dumps({"sourceArchive": "OML_project_update.zip", "files": inputs}, indent=2))
        (stage / "README.md").write_text(README)
        # Every public model input is name-free. Check known complete instructor fields
        # against every text member, including notebook markdown and reference scripts.
        faculty = {s for s in pd.read_csv(common / "units.csv", keep_default_na=False).instructors if s}
        for path in stage.rglob("*"):
            if path.is_file() and path.suffix in {".csv", ".json", ".py", ".ipynb", ".md"}:
                text = path.read_text()
                assert not any(name in text for name in faculty), (path, "instructor field")
        (public / "data").mkdir(parents=True, exist_ok=True)
        (public / "downloads").mkdir(parents=True, exist_ok=True)
        shutil.copyfile(stage / "oml_project.json", public / "data/oml_project.json")
        shutil.copyfile(stage / "validation.json", public / "data/validation.json")
        shutil.copyfile(stage / "provenance.json", public / "data/study_provenance.json")
        with zipfile.ZipFile(public / "downloads/oml_web_bundle.zip", "w", zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(stage.rglob("*")):
                if path.is_file():
                    archive.write(path, path.relative_to(stage))
        print(json.dumps({"checked_runs": len(checks), "checked_student_plans": report["checked_student_plans"],
                          "json_sha256": report["bundle_sha256"],
                          "zip_bytes": (public / "downloads/oml_web_bundle.zip").stat().st_size}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Extracted OML_project_update directory")
    parser.add_argument("--public", type=Path, default=Path(__file__).resolve().parents[1] / "public/lab")
    arguments = parser.parse_args()
    build(arguments.source, arguments.public)
