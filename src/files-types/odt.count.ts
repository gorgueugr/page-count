import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { openOdfPackage, readOdfKind, readOdfPageCount } from "./odf";

/**
 * OpenDocument text documents carry the page count of the last save in
 * meta.xml (meta:page-count). Files exported by tools that do not paginate
 * have no value at all, and there is nothing else to read in the package.
 */
export class OdtCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const packageFile = await openOdfPackage(buffer);

    if (!packageFile.has("content.xml")) {
      throw new FileNotCompatibleError();
    }

    const kind = await readOdfKind(packageFile);
    if (kind && kind !== "text") {
      throw new FileNotCompatibleError("The package is not a text document.");
    }

    const metaXml = await packageFile.readText("meta.xml");
    const pages = metaXml ? readOdfPageCount(metaXml) : undefined;

    if (pages) {
      return pages;
    }

    throw new FileNotCompatibleError(
      "The document has no stored page count (it was never saved by a paginating editor)."
    );
  }

  static async estimate(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: "stored" }> {
    return { pages: await OdtCounter.count(buffer), estimated: false, method: "stored" };
  }
}
