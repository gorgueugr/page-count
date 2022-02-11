# PAGE COUNTER
#### Count pages from pdf, docx, pptx, odt files

##### Main example

```ts
    import { readFileSync } from "fs";
    import countPages from "page-count";

    const docxBuffer = readFileSync("test/files/test-10.docx");
    const pages = await countPages(docxBuffer, "docx");
```

##### Main example

```ts

    import { readFileSync } from "fs";
    import { DocxCounter, OdtCounter, PdfCounter, PptxCounter } from "page-count";

    const docxBuffer = readFileSync("test/files/test-10.docx");
    const pdfBuffer = readFileSync("test/files/test-10.pdf");
    const pptxBuffer = readFileSync("test/files/test-10.pptx");
    const odtBuffer = readFileSync("test/files/test-10.odt");
    
    const pagesDocx = await DocxCounter.count(docxBuffer);
    const pagesPdf = await PdfCounter.count(pdfBuffer);
    const pagesPptx = await PptxCounter.count(pptxBuffer);
    const pagesOdt = await OdtCounter.count(odtBuffer);

```

Fell free to open issues and make pull requests.