import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { openCompoundFile } from "../ole/compoundFile";
import { readPropertySet } from "../ole/propertySet";
import { ICounter } from "./base.count";

const SUMMARY_INFORMATION = "\u0005SummaryInformation";
const DOCUMENT_SUMMARY_INFORMATION = "\u0005DocumentSummaryInformation";

// Property ids of the summary information streams.
const PIDSI_PAGE_COUNT = 14;
const PIDDSI_SLIDE_COUNT = 7;
const PIDDSI_NOTE_COUNT = 8;

/**
 * Binary PowerPoint 97-2003 files store the number of slides in the document
 * summary information stream. Some producers write it as the page count of
 * the regular summary information stream instead, so both are checked.
 */
export class PptCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    let compoundFile;

    try {
      compoundFile = openCompoundFile(buffer);
    } catch (error) {
      throw new FileNotCompatibleError();
    }

    if (!compoundFile.hasStream("PowerPoint Document")) {
      throw new FileNotCompatibleError();
    }

    const documentSummary = compoundFile.getStream(DOCUMENT_SUMMARY_INFORMATION);
    if (documentSummary) {
      const properties = readPropertySet(documentSummary);
      const slides = properties.getNumber(PIDDSI_SLIDE_COUNT);
      if (slides) {
        return slides;
      }
      // A presentation with notes but no slides is an empty presentation.
      if (properties.get(PIDDSI_NOTE_COUNT) === 0) {
        return 0;
      }
    }

    const summary = compoundFile.getStream(SUMMARY_INFORMATION);
    const pages = summary ? readPropertySet(summary).getNumber(PIDSI_PAGE_COUNT) : undefined;
    if (pages) {
      return pages;
    }

    throw new FileNotCompatibleError(
      "The presentation has no stored slide count (it was never saved by PowerPoint)."
    );
  }
}
