/**
 * Layout heuristics for docx files.
 *
 * A .docx has no pages: pagination is the result of the layout engine. When
 * the file carries no pagination data at all (no Pages property and no
 * rendered page breaks), the page count can only be estimated from the text
 * volume and the page geometry. This is what this module does: characters per
 * line from the text area and the font size, lines per page from the line
 * height. The result is an approximation, usually within 10-20%.
 */

export interface LayoutMetrics {
  /** Page size in twips (1/1440 inch). */
  pageWidth: number;
  pageHeight: number;
  /** Margins in twips. */
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  /** Font size in points. */
  fontSize: number;
  /** Number of text columns. */
  columns: number;
}

const TWIPS_PER_POINT = 20;

// A4, 2.5 cm margins, 11 pt: what Word uses when nothing else is available.
const DEFAULT_METRICS: LayoutMetrics = {
  pageWidth: 11906,
  pageHeight: 16838,
  marginTop: 1417,
  marginBottom: 1417,
  marginLeft: 1417,
  marginRight: 1417,
  fontSize: 11,
  columns: 1,
};

// Average advance width of a proportional font, as a fraction of the em size.
const AVERAGE_CHAR_WIDTH = 0.5;
// Word's single line spacing for the default styles is about 1.2 em.
const LINE_HEIGHT_FACTOR = 1.2;

function readAttribute(xml: string, attribute: string): number | undefined {
  const match = xml.match(new RegExp(attribute + '\\s*=\\s*"(-?\\d+)"'));
  if (!match) {
    return undefined;
  }
  const value = parseInt(match[1], 10);
  return Number.isFinite(value) ? value : undefined;
}

function lastSectionProperties(documentXml: string): string | undefined {
  const sections = documentXml.match(/<[A-Za-z0-9]+:sectPr\b[^>]*>[\s\S]*?<\/[A-Za-z0-9]+:sectPr>/g);
  return sections && sections.length > 0 ? sections[sections.length - 1] : undefined;
}

function defaultFontSize(documentXml: string, stylesXml?: string): number {
  const sources: string[] = [];
  if (stylesXml) {
    const docDefaults = stylesXml.match(/<[A-Za-z0-9]+:docDefaults\b[\s\S]*?<\/[A-Za-z0-9]+:rPrDefault>/);
    if (docDefaults) {
      sources.push(docDefaults[0]);
    }
  }
  sources.push(documentXml);

  for (const source of sources) {
    const sizes = source.match(/<[A-Za-z0-9]+:sz\b[^>]*\b[A-Za-z0-9]+:val\s*=\s*"(\d+)"/g);
    if (sizes && sizes.length > 0) {
      // Half points, take the most frequent one as the body text size.
      const counts = new Map<number, number>();
      for (const size of sizes) {
        const value = readAttribute(size, "[A-Za-z0-9]+:val");
        if (value && value >= 8 && value <= 200) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      }
      let best = 0;
      let bestCount = 0;
      counts.forEach((count, value) => {
        if (count > bestCount || (count === bestCount && value > 0 && best === 0)) {
          best = value;
          bestCount = count;
        }
      });
      if (best) {
        return best / 2;
      }
    }
  }

  return DEFAULT_METRICS.fontSize;
}

export function readLayoutMetrics(documentXml: string, stylesXml?: string): LayoutMetrics {
  const metrics: LayoutMetrics = Object.assign({}, DEFAULT_METRICS);
  metrics.fontSize = defaultFontSize(documentXml, stylesXml);

  const section = lastSectionProperties(documentXml);
  if (!section) {
    return metrics;
  }

  const pageSize = section.match(/<[A-Za-z0-9]+:pgSz\b[^>]*>/);
  if (pageSize) {
    const width = readAttribute(pageSize[0], "[A-Za-z0-9]+:w");
    const height = readAttribute(pageSize[0], "[A-Za-z0-9]+:h");
    if (width) {
      metrics.pageWidth = width;
    }
    if (height) {
      metrics.pageHeight = height;
    }
  }

  const pageMargins = section.match(/<[A-Za-z0-9]+:pgMar\b[^>]*>/);
  if (pageMargins) {
    const top = readAttribute(pageMargins[0], "[A-Za-z0-9]+:top");
    const bottom = readAttribute(pageMargins[0], "[A-Za-z0-9]+:bottom");
    const left = readAttribute(pageMargins[0], "[A-Za-z0-9]+:left");
    const right = readAttribute(pageMargins[0], "[A-Za-z0-9]+:right");
    if (top !== undefined) {
      metrics.marginTop = Math.max(0, top);
    }
    if (bottom !== undefined) {
      metrics.marginBottom = Math.max(0, bottom);
    }
    if (left !== undefined) {
      metrics.marginLeft = Math.max(0, left);
    }
    if (right !== undefined) {
      metrics.marginRight = Math.max(0, right);
    }
  }

  const columns = section.match(/<[A-Za-z0-9]+:cols\b[^>]*>/);
  if (columns) {
    const count = readAttribute(columns[0], "[A-Za-z0-9]+:num");
    if (count && count > 1) {
      metrics.columns = Math.min(count, 12);
    }
  }

  return metrics;
}

/** Visible text of the body, whitespace normalised. */
export function documentText(documentXml: string): string {
  const stats = documentTextStats(documentXml);
  return stats.text;
}

export interface TextStats {
  text: string;
  /** Number of characters of each paragraph of the body, 0 for empty ones. */
  paragraphLengths: number[];
}

export function documentTextStats(documentXml: string): TextStats {
  const paragraphs = documentXml.split(/<\/[A-Za-z0-9]+:p>/);
  const textPattern = /<[A-Za-z0-9]+:t\b[^>]*>([\s\S]*?)<\/[A-Za-z0-9]+:t>/g;
  const paragraphLengths: number[] = [];
  const parts: string[] = [];

  for (const paragraph of paragraphs) {
    let length = 0;
    let match = textPattern.exec(paragraph);
    while (match !== null) {
      const value = decodeEntities(match[1]);
      parts.push(value);
      length += value.length;
      match = textPattern.exec(paragraph);
    }
    textPattern.lastIndex = 0;
    paragraphLengths.push(length);
  }

  return { text: parts.join(" "), paragraphLengths };
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export interface LayoutEstimate {
  pages: number;
  lines: number;
  linesPerPage: number;
  charactersPerLine: number;
  metrics: LayoutMetrics;
}

/**
 * Estimates the number of pages of a document body. `additionalPageBreaks`
 * are the hard breaks (explicit breaks and section breaks) that always start
 * a new page.
 */
export function estimateLayout(
  documentXml: string,
  additionalPageBreaks: number,
  metrics: LayoutMetrics = readLayoutMetrics(documentXml)
): LayoutEstimate {
  const stats = documentTextStats(documentXml);

  const textAreaWidth =
    (metrics.pageWidth - metrics.marginLeft - metrics.marginRight) / metrics.columns;
  const textAreaHeight = metrics.pageHeight - metrics.marginTop - metrics.marginBottom;

  const characterWidth = metrics.fontSize * AVERAGE_CHAR_WIDTH * TWIPS_PER_POINT;
  const lineHeight = metrics.fontSize * LINE_HEIGHT_FACTOR * TWIPS_PER_POINT;

  const charactersPerLine = Math.max(1, Math.floor(textAreaWidth / Math.max(1, characterWidth)));
  const linesPerPage = Math.max(1, Math.floor(textAreaHeight / Math.max(1, lineHeight)));

  // Every paragraph occupies at least one line, even the empty ones.
  let lines = 0;
  for (const length of stats.paragraphLengths) {
    lines += Math.max(1, Math.ceil(length / charactersPerLine));
  }
  lines = Math.max(1, lines);

  const pages = Math.max(1, Math.ceil(lines / linesPerPage) + additionalPageBreaks);

  return { pages, lines, linesPerPage, charactersPerLine, metrics };
}
