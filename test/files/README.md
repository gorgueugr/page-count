# Test fixtures

Small documents used by the test suite. Each counter has at least one fixture
per code path (pagination stored in the file, pagination missing, wrong
format).

| File | What it exercises |
|---|---|
| `test-1.*`, `test-10.*` | One page / ten pages of pdf, docx, pptx, odt, odp |
| `file-sample_100kB.docx` | docx without `docProps/app.xml` page count |
| `test-docx-without-props.docx` | docx with explicit page breaks and no stored count |
| `test-docx-stale-props.docx` | docx with a stale `Pages` value and rendered breaks |
| `test-docx-plain-text.docx` | docx with text only: nothing stored, layout must be estimated |
| `test-docx-one-paragraph.docx` | short docx, estimated on a single page |
| `test-pptx-without-props.pptx` | pptx without `Slides`, counted from the slide parts |
| `test-2pages.doc` | binary Word document with a stored page count |
| `test-1slide.ppt` | binary PowerPoint presentation with a stored slide count |
| `test-3sheets.xlsx` | workbook without `Pages`, counted by worksheets |
| `test-7pages.xlsx` | workbook with a stored `Pages` value |
| `test-2sheets.ods` | OpenDocument spreadsheet, counted by sheets |
| `test-3pages.rtf` | rtf with two explicit page breaks |

`test-2pages.doc` and `test-1slide.ppt` come from the Apache Tika test corpus
(`tika-parser-microsoft-module`, Apache License 2.0) and are redistributed
here only as test fixtures.
