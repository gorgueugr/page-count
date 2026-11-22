import * as unzip from "unzipper";
import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";

/**
 * Helpers for the OpenDocument counters (odt, odp and their template
 * variants). ODF stores the statistical page count of text documents in
 * meta.xml; presentations have no such value, so the slides are counted in
 * content.xml instead.
 */

export interface OdfPackage {
  readText(path: string): Promise<string | undefined>;
  has(path: string): boolean;
}

export async function openOdfPackage(buffer: Uint8Array | Buffer): Promise<OdfPackage> {
  let directory: any;

  try {
    directory = await unzip.Open.buffer(Buffer.from(buffer));
  } catch (error) {
    throw new FileNotCompatibleError();
  }

  const files: any[] = (directory && directory.files) || [];

  return {
    has(path: string): boolean {
      return files.some((file) => file.path === path);
    },
    async readText(path: string): Promise<string | undefined> {
      const file = files.find((item) => item.path === path);
      if (!file) {
        return undefined;
      }
      const data = await file.buffer();
      return Buffer.from(data).toString("utf8");
    },
  };
}

/** Media type declared in the mimetype part, undefined when absent. */
export async function readOdfMimeType(packageFile: OdfPackage): Promise<string | undefined> {
  const mimetype = await packageFile.readText("mimetype");
  return mimetype ? mimetype.trim().toLowerCase() : undefined;
}

/** Kind of document declared by the package, undefined when it does not say. */
export async function readOdfKind(
  packageFile: OdfPackage
): Promise<"text" | "presentation" | "spreadsheet" | "graphics" | undefined> {
  const mimetype = await readOdfMimeType(packageFile);
  if (!mimetype) {
    return undefined;
  }
  if (mimetype.indexOf("opendocument.text") !== -1) {
    return "text";
  }
  if (mimetype.indexOf("opendocument.presentation") !== -1) {
    return "presentation";
  }
  if (mimetype.indexOf("opendocument.spreadsheet") !== -1) {
    return "spreadsheet";
  }
  if (mimetype.indexOf("opendocument.graphics") !== -1) {
    return "graphics";
  }
  return undefined;
}

/** meta:page-count of a text document, as written by the editor on save. */
export function readOdfPageCount(metaXml: string): number | undefined {
  const match = metaXml.match(/page-count\s*=\s*"(\d+)"/);
  if (!match) {
    return undefined;
  }
  const pages = parseInt(match[1], 10);
  return Number.isFinite(pages) && pages > 0 ? pages : undefined;
}

/** Number of draw:page elements (slides) in content.xml. */
export function countOdfSlides(contentXml: string): number {
  const match = contentXml.match(/<draw:page[\s>]/g);
  return match ? match.length : 0;
}
