"""Check the distributed notebook, including its original small Tests A-D.

Requires the notebook's Python dependencies. Does not run the full study grid.
"""

from contextlib import redirect_stdout
from io import StringIO
import json
import os
from pathlib import Path
import tempfile
import zipfile

import openpyxl
import pandas as pd


archive = Path(__file__).resolve().parents[1] / "public/lab/downloads/oml_web_bundle.zip"
results = []
with tempfile.TemporaryDirectory(prefix="oml-portable-check-") as temporary:
    with zipfile.ZipFile(archive) as bundle:
        for name in bundle.namelist():
            path = Path(name)
            assert not path.is_absolute() and ".." not in path.parts
            assert "raw" not in path.parts
        bundle.extractall(temporary)
    master = Path(temporary) / "OML_elective_timetabling_master"
    os.chdir(master)
    notebook = json.loads(Path("OML_master.ipynb").read_text())
    assert all(not cell.get("outputs") for cell in notebook["cells"])
    for survey in ["survey_9_to_10.5_credits", "survey_5_to_9_credits"]:
        units = pd.read_csv(Path("surveys") / survey / "data/units.csv", keep_default_na=False)
        assert units.instructors.eq("").all()
        assert units.loc[units.unit_id.eq("BaB"), "seat_cap"].tolist() == [80]
        for workbook_path in (Path("surveys") / survey / "outputs").glob("*.xlsx"):
            workbook = openpyxl.load_workbook(workbook_path, read_only=True)
            for sheet in workbook.worksheets:
                rows = sheet.iter_rows(values_only=True)
                header = next(rows)
                columns = [i for i, value in enumerate(header) if str(value).lower() == "instructors"]
                for row in rows:
                    assert all(not row[column] for column in columns)
            workbook.close()
        scope, log = {}, StringIO()
        with redirect_stdout(log):
            for index, cell in enumerate(notebook["cells"]):
                # Cell 79 introduces saved-file paths, followed by full study runs.
                if index > 77:
                    break
                if cell["cell_type"] != "code":
                    continue
                code = "".join(cell["source"])
                if index == 4:
                    code = code.replace('SURVEY = "survey_9_to_10.5_credits"', f'SURVEY = "{survey}"')
                exec(compile(code, f"OML_master.ipynb cell {index}", "exec"), scope)
        assert all(name in scope for name in ["test_a", "test_b", "test_c", "test_d"])
        results.append({"survey": survey, "portable_setup_and_original_tests_A_to_D": "passed",
                        "faculty_cells_blank": True, "BaB_capacity": 80})
print(json.dumps({"downloaded_notebook_checks": results}, indent=2))
