import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import pdfParse from "pdf-parse";

/**
 * The pages of a pdf are structural (the page tree), so the count is exact
 * and needs no layout: any reader can enumerate the pages of the document.
 */
export class PdfCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const data = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : buffer;

    let pages: number | undefined;
    try {
      const parsed = await pdfParse(data);
      pages = parsed.numpages;
    } catch (error) {
      const detail = error instanceof Error && error.message ? ": " + error.message : "";
      throw new FileNotCompatibleError("Could not read the pdf" + detail);
    }

    if (!pages || pages < 1) {
      throw new FileNotCompatibleError("The pdf has no pages.");
    }

    return pages;
  }

  static async estimate(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: "stored" }> {
    return { pages: await PdfCounter.count(buffer), estimated: false, method: "stored" };
  }
}
