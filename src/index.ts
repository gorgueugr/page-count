import { detectFileType } from "./detect";
import { EstimateResult, FileTypes } from "./files-types/base.count";
import { counterFor } from "./files-types";

export * from "./files-types";
export { detectFileType } from "./detect";
export { FileNotCompatibleError } from "./errors/FileNotCompatibleError";
export { CountingPagesError } from "./errors/CountingPagesError";

/**
 * Counts the pages of a document.
 *
 * The file type is detected from the file content when it is not given, so
 * the extension of the name never matters.
 */
export default async function countPages(
  buffer: Uint8Array | Buffer,
  type?: FileTypes
): Promise<number> {
  const fileType = type || (await detectFileType(buffer));
  const counter = counterFor(fileType);

  if (!counter) {
    throw new Error(`File type not accepted. File type: ${fileType}`);
  }

  return counter.count(buffer);
}

/**
 * Page count with its provenance: `estimated: false` means the number was
 * stored in the file by the editor that paginated it, `estimated: true` means
 * it was derived (heuristic layout estimate or a lower bound such as the
 * number of sheets).
 */
export async function estimatePages(
  buffer: Uint8Array | Buffer,
  type?: FileTypes
): Promise<EstimateResult> {
  const fileType = type || (await detectFileType(buffer));
  const counter = counterFor(fileType);

  if (!counter) {
    throw new Error(`File type not accepted. File type: ${fileType}`);
  }

  if (typeof counter.estimate === "function") {
    return counter.estimate(buffer);
  }

  return { pages: await counter.count(buffer), estimated: false, method: "stored" };
}
