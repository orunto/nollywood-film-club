"""Convert one Wrangler SQL snapshot to per-table CSVs and an XLSX workbook.

Uses only the Python standard library. The original SQL is never modified.
Usage: python tools/migration/export-d1-snapshot.py path/to/snapshot.sql
"""

import csv
import hashlib
import json
import sqlite3
import sys
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr


def column_name(index):
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def xml_text(value):
    text = str(value)
    # XML 1.0 does not permit most control characters.
    if any(ord(c) < 32 and c not in "\t\n\r" for c in text):
        raise ValueError("Cell contains an XML-incompatible control character")
    if len(text) > 32767:
        raise ValueError("Cell exceeds Excel's 32767-character limit")
    return escape(text)


def main():
    source = Path(sys.argv[1]).resolve()
    output = source.with_suffix("")
    db = sqlite3.connect(":memory:")
    db.executescript(source.read_text(encoding="utf-8"))
    assert db.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    if "--inspect" in sys.argv:
        print("Rating inventory:", db.execute("SELECT CASE WHEN user_id LIKE 'legacy-poll:%' THEN 'legacy-poll' ELSE 'member' END, restricted, rating, COUNT(*) FROM user_ratings GROUP BY 1, 2, 3").fetchall())
        return
    output.mkdir(exist_ok=False)
    tables = db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' "
        "AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    manifest = {"source": source.name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "tables": {}}
    ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    relns = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    sheets, relationships, overrides = [], [], []
    with zipfile.ZipFile(output / "database.xlsx", "w", zipfile.ZIP_DEFLATED) as workbook:
        for sheet_id, (table,) in enumerate(tables, 1):
            quoted = '"' + table.replace('"', '""') + '"'
            cursor = db.execute("SELECT * FROM " + quoted)
            headers = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            manifest["tables"][table] = {"rows": len(rows), "columns": headers}
            with (output / (table + ".csv")).open("w", encoding="utf-8-sig", newline="") as file:
                writer = csv.writer(file)
                writer.writerow(headers)
                writer.writerows(rows)
            with (output / (table + ".csv")).open(encoding="utf-8-sig", newline="") as file:
                assert len(list(csv.reader(file))) == len(rows) + 1
            if len(rows) > 1048575:
                raise ValueError("Table exceeds Excel's row limit: " + table)
            xml_rows = []
            for row_id, row in enumerate([headers] + rows, 1):
                cells = []
                for col_id, value in enumerate(row, 1):
                    reference = column_name(col_id) + str(row_id)
                    # Use text cells to preserve IDs, long integers and literal
                    # strings (including strings starting with =, +, -, or @).
                    if value is not None:
                        cells.append(f'<c r="{reference}" t="inlineStr"><is><t xml:space="preserve">{xml_text(value)}</t></is></c>')
                xml_rows.append(f'<row r="{row_id}">' + "".join(cells) + "</row>")
            workbook.writestr(f"xl/worksheets/sheet{sheet_id}.xml", f'<worksheet xmlns="{ns}"><sheetData>' + "".join(xml_rows) + "</sheetData></worksheet>")
            sheet_name = table[:27] + "_" + str(sheet_id)
            sheets.append(f'<sheet name={quoteattr(sheet_name)} sheetId="{sheet_id}" r:id="rId{sheet_id}"/>')
            relationships.append(f'<Relationship Id="rId{sheet_id}" Type="{relns}/worksheet" Target="worksheets/sheet{sheet_id}.xml"/>')
            overrides.append(f'<Override PartName="/xl/worksheets/sheet{sheet_id}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
        workbook.writestr("xl/workbook.xml", f'<workbook xmlns="{ns}" xmlns:r="{relns}"><sheets>' + "".join(sheets) + "</sheets></workbook>")
        workbook.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + "".join(relationships) + "</Relationships>")
        workbook.writestr("_rels/.rels", f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{relns}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        workbook.writestr("[Content_Types].xml", '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' + "".join(overrides) + "</Types>")
    from xml.etree import ElementTree
    with zipfile.ZipFile(output / "database.xlsx") as workbook:
        assert workbook.testzip() is None
        for name in workbook.namelist():
            ElementTree.fromstring(workbook.read(name))
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"output": str(output), "table_counts": {k: v["rows"] for k, v in manifest["tables"].items()}}, indent=2))
    print("Rating inventory:", db.execute("SELECT CASE WHEN user_id LIKE 'legacy-poll:%' THEN 'legacy-poll' ELSE 'member' END, restricted, rating, COUNT(*) FROM user_ratings GROUP BY 1, 2, 3").fetchall())


if __name__ == "__main__":
    main()
