import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { estimateLayout, LayoutEstimate, readLayoutMetrics } from "./docx.layout";
import { countMatches, openPackage, readExtendedProperty } from "./ooxml";

const LAST_RENDERED_PAGE_BREAK = /<[A-Za-z0-9]+:lastRenderedPageBreak\b[^>]*\/?>/g;
const EXPLICIT_PAGE_BREAK =
  /<[A-Za-z0-9]+:br\b[^>]*\b[A-Za-z0-9]+:type\s*=\s*"page"[^>]*\/?>/g;
const SECTION_PROPERTIES =
  /<[A-Za-z0-9]+:sectPr\b[^>]*>[\s\S]*?<\/[A-Za-z0-9]+:sectPr>/g;
const CONTINUOUS_SECTION = /<[A-Za-z0-9]+:type\b[^>]*\b[A-Za-z0-9]+:val\s*=\s*"continuous"/;

export interface DocxEstimate {
  pages: number;
  /** False when the value comes from pagination data stored in the file. */
  estimated: boolean;
  method: "stored" | "content";
  layout?: LayoutEstimate;
}

interface DocxSignals {
  propsPages?: number;
  renderedBreaks: number;
  hardBreaks: number;
  documentXml?: string;
  stylesXml?: string;
}

async function readSignals(buffer: Uint8Array | Buffer): Promise<DocxSignals> {
  const packageFile = await openPackage(buffer);
  const documentXml = await packageFile.readText("word/document.xml");

  if (!documentXml && !packageFile.has("docProps/app.xml")) {
    throw new FileNotCompatibleError();
  }

  let propsPages: number | undefined;
  const propsXml = await packageFile.readText("docProps/app.xml");
  if (propsXml) {
    propsPages = await readExtendedProperty(propsXml, "Pages");
  }

  const signals: DocxSignals = {
    propsPages,
    renderedBreaks: 0,
    hardBreaks: 0,
    documentXml,
    stylesXml: await packageFile.readText("word/styles.xml"),
  };

  if (!documentXml) {
    return signals;
  }

  signals.renderedBreaks = countMatches(documentXml, LAST_RENDERED_PAGE_BREAK);

  const explicitBreaks = countMatches(documentXml, EXPLICIT_PAGE_BREAK);
  const sections = documentXml.match(SECTION_PROPERTIES) || [];
  // The last sectPr holds the body properties and does not start a new page,
  // continuous sections do not break the page either.
  const sectionBreaks = sections.filter((section) => !CONTINUOUS_SECTION.test(section)).length;
  signals.hardBreaks = explicitBreaks + Math.max(0, sectionBreaks - 1);

  return signals;
}

/**
 * Pages that the file itself accounts for. Rendered breaks already include
 * the explicit ones (Word writes a lastRenderedPageBreak next to every break
 * it rendered), so both signals are never added together.
 */
function structuralPages(signals: DocxSignals): number {
  if (signals.renderedBreaks > 0) {
    return signals.renderedBreaks + 1;
  }
  return 1 + signals.hardBreaks;
}

export class DocxCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const signals = await readSignals(buffer);
    const pages = Math.max(signals.propsPages || 0, structuralPages(signals));

    if (pages < 1) {
      throw new FileNotCompatibleError();
    }

    return pages;
  }

  /**
   * Never fails on a readable docx: uses the pagination stored in the file
   * when there is one, otherwise estimates the pages from the text volume and
   * the page geometry (usually within 10-20%).
   */
  static async estimate(buffer: Uint8Array | Buffer): Promise<DocxEstimate> {
    const signals = await readSignals(buffer);

    if (signals.propsPages || signals.renderedBreaks > 0) {
      return {
        pages: Math.max(signals.propsPages || 0, structuralPages(signals)),
        estimated: false,
        method: "stored",
      };
    }

    const documentXml = signals.documentXml || "";
    const metrics = readLayoutMetrics(documentXml, signals.stylesXml);
    const layout = estimateLayout(documentXml, signals.hardBreaks, metrics);

    return {
      pages: layout.pages,
      estimated: true,
      method: "content",
      layout,
    };
  }
}
