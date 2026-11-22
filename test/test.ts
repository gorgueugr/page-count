import { readFileSync } from "fs";
import { FileNotCompatibleError } from "../src/errors/FileNotCompatibleError";
import { DocxCounter, OdtCounter, PdfCounter, PptxCounter } from "../src/index";

describe("Test pdf", () => {
  it("should count 1 page on pdf", async () => {
    const buffer = readFileSync("test/files/test-1.pdf");
    expect(await PdfCounter.count(buffer)).toBe(1);
  });
  it("should count 10 pages on pdf", async () => {
    const buffer = readFileSync("test/files/test-10.pdf");
    expect(await PdfCounter.count(buffer)).toBe(10);
  });
});

describe("Test docx", () => {
  it("should count 1 page on docx", async () => {
    const buffer = readFileSync("test/files/test-1.docx");
    expect(await DocxCounter.count(buffer)).toBe(1);
  });

  it("should count 10 pages on docx", async () => {
    const buffer = readFileSync("test/files/test-10.docx");
    expect(await DocxCounter.count(buffer)).toBe(10);
  });

  it("should count pages when docProps/app.xml has no Pages value", async () => {
    const buffer = readFileSync("test/files/file-sample_100kB.docx");
    expect(await DocxCounter.count(buffer)).toBe(1);
  });

  it("should count explicit page breaks when app.xml has no Pages value", async () => {
    const buffer = readFileSync("test/files/test-docx-without-props.docx");
    expect(await DocxCounter.count(buffer)).toBe(3);
  });

  it("should not trust a stale Pages value when the document has rendered breaks", async () => {
    const buffer = readFileSync("test/files/test-docx-stale-props.docx");
    expect(await DocxCounter.count(buffer)).toBe(5);
  });

  it("should throw an error when the buffer is not a docx", async () => {
    const buffer = readFileSync("test/files/test-1.pdf");
    await expect(DocxCounter.count(buffer)).rejects.toThrow(
      FileNotCompatibleError
    );
  });
});

describe("Test pptx", () => {
  it("should count 1 page on pptx", async () => {
    const buffer = readFileSync("test/files/test-1.pptx");
    expect(await PptxCounter.count(buffer)).toBe(1);
  });

  it("should count 10 pages on pptx", async () => {
    const buffer = readFileSync("test/files/test-10.pptx");
    expect(await PptxCounter.count(buffer)).toBe(10);
  });

  it("should count slides when docProps/app.xml has no Slides value", async () => {
    const buffer = readFileSync("test/files/test-pptx-without-props.pptx");
    expect(await PptxCounter.count(buffer)).toBe(10);
  });

  it("should throw an error when the buffer is not a pptx", async () => {
    const buffer = readFileSync("test/files/test-1.pdf");
    await expect(PptxCounter.count(buffer)).rejects.toThrow(
      FileNotCompatibleError
    );
  });
});

describe("Test odt", () => {
  test("should count 1 page on odt", async () => {
    const buffer = readFileSync("test/files/test-1.odt");
    expect(await OdtCounter.count(buffer)).toBe(1);
  });

  test("should count 10 pages on odt", async () => {
    const buffer = readFileSync("test/files/test-10.odt");
    expect(await OdtCounter.count(buffer)).toBe(10);
  });
});
