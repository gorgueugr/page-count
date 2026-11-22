import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { openCompoundFile } from "../ole/compoundFile";
import { readPropertySet } from "../ole/propertySet";
import { ICounter } from "./base.count";

const SUMMARY_INFORMATION = "\u0005SummaryInformation";

// Property ids of the summary information stream.
const PIDSI_PAGE_COUNT = 14;

/**
 * Binary Word 97-2003 documents store the page count in the summary
 * information stream, the same value Word shows in the document statistics.
 * Word writes it when saving, so a file that never went through Word may
 * carry no page count at all.
 */
export class DocCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    let compoundFile;

    try {
      compoundFile = openCompoundFile(buffer);
    } catch (error) {
      throw new FileNotCompatibleError();
    }

    if (!compoundFile.hasStream("WordDocument")) {
      throw new FileNotCompatibleError();
    }

    const summary = compoundFile.getStream(SUMMARY_INFORMATION);
    const pages = summary ? readPropertySet(summary).getNumber(PIDSI_PAGE_COUNT) : undefined;

    if (pages) {
      return pages;
    }

    throw new FileNotCompatibleError(
      "The document has no stored page count (it was never saved by Word)."
    );
  }
}
