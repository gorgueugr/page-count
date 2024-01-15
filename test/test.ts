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

  it("should throw an error for an incompatible docx", async () => {
    const buffer = readFileSync("test/files/file-sample_100kB.docx");
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
