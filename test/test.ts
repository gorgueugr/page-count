import { readFileSync } from "fs";
import { DocxCounter, OdtCounter, PdfCounter, PptxCounter } from "../src/index";

test('should count 1 page on pdf', async () => {
    const buffer = readFileSync("test/files/test-1.pdf")
    expect(await PdfCounter.count(buffer)).toBe(1)
})

test('should count 10 pages on pdf', async () => {
    const buffer = readFileSync("test/files/test-10.pdf")
    expect(await PdfCounter.count(buffer)).toBe(10)
})


test('should count 1 page on docx', async () => {
    const buffer = readFileSync("test/files/test-1.docx")
    expect(await DocxCounter.count(buffer)).toBe(1)
})

test('should count 10 pages on docx', async () => {
    const buffer = readFileSync("test/files/test-10.docx")
    expect(await DocxCounter.count(buffer)).toBe(10)
})
  

test('should count 1 page on pptx', async () => {
    const buffer = readFileSync("test/files/test-1.pptx")
    expect(await PptxCounter.count(buffer)).toBe(1)
})

test('should count 10 pages on pptx', async () => {
    const buffer = readFileSync("test/files/test-10.pptx")
    expect(await PptxCounter.count(buffer)).toBe(10)
})

test('should count 1 page on odt', async () => {
    const buffer = readFileSync("test/files/test-1.odt")
    expect(await OdtCounter.count(buffer)).toBe(1)
})

test('should count 10 pages on odt', async () => {
    const buffer = readFileSync("test/files/test-10.odt")
    expect(await OdtCounter.count(buffer)).toBe(10)
})