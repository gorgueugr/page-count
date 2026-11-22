import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { openOdfPackage, readOdfKind } from "./odf";

/**
 * OpenDocument spreadsheets store no pagination at all: the printed page
 * count depends on the print area and the paper size. The number of sheets is
 * reported instead, which is the minimum number of pages (one per sheet).
 */
export class OdsCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const packageFile = await openOdfPackage(buffer);
    const contentXml = await packageFile.readText("content.xml");

    if (!contentXml) {
      throw new FileNotCompatibleError();
    }

    const kind = await readOdfKind(packageFile);
    if (kind && kind !== "spreadsheet") {
      throw new FileNotCompatibleError("The package is not a spreadsheet.");
    }

    const tables = contentXml.match(/<table:table[\s>]/g);
    const sheets = tables ? tables.length : 0;

    if (sheets > 0) {
      return sheets;
    }

    throw new FileNotCompatibleError("The workbook has no worksheets.");
  }

  static async estimate(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: "sheets" }> {
    return { pages: await OdsCounter.count(buffer), estimated: true, method: "sheets" };
  }
}
