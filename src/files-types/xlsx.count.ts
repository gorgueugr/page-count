import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { openPackage, readExtendedProperty } from "./ooxml";

const WORKSHEET_PART = /^xl\/worksheets\/sheet\d+\.xml$/;

/**
 * Spreadsheets have no fixed pagination either: Excel stores the number of
 * printed pages in docProps/app.xml when the workbook was saved. When that
 * value is missing the number of worksheets is reported, which is the minimum
 * number of pages (one per sheet).
 */
export class XlsxCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const packageFile = await openPackage(buffer);
    const sheets = packageFile.list().filter((path) => WORKSHEET_PART.test(path));

    if (!packageFile.has("docProps/app.xml") && sheets.length === 0) {
      throw new FileNotCompatibleError();
    }

    const propsXml = await packageFile.readText("docProps/app.xml");
    if (propsXml) {
      const stored = await readExtendedProperty(propsXml, "Pages");
      if (stored) {
        return stored;
      }
    }

    if (sheets.length > 0) {
      return sheets.length;
    }

    throw new FileNotCompatibleError(
      "The workbook has no stored page count and no worksheets."
    );
  }

  static async estimate(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: "stored" | "sheets" }> {
    const packageFile = await openPackage(buffer);
    const propsXml = await packageFile.readText("docProps/app.xml");

    if (propsXml) {
      const stored = await readExtendedProperty(propsXml, "Pages");
      if (stored) {
        return { pages: stored, estimated: false, method: "stored" };
      }
    }

    const sheets = packageFile.list().filter((path) => WORKSHEET_PART.test(path));
    if (sheets.length === 0) {
      throw new FileNotCompatibleError("The workbook has no worksheets.");
    }

    return { pages: sheets.length, estimated: true, method: "sheets" };
  }
}
