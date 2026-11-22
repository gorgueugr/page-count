import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { countOdfSlides, openOdfPackage, readOdfKind, readOdfPageCount } from "./odf";

/**
 * OpenDocument presentations: meta.xml usually carries no page count, so the
 * slides are counted in content.xml. The presentation has no fixed pagination
 * beyond its slides.
 */
export class OdpCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const packageFile = await openOdfPackage(buffer);

    if (!packageFile.has("content.xml")) {
      throw new FileNotCompatibleError();
    }

    const kind = await readOdfKind(packageFile);
    if (kind && kind !== "presentation") {
      throw new FileNotCompatibleError("The package is not a presentation.");
    }

    const metaXml = await packageFile.readText("meta.xml");
    const stored = metaXml ? readOdfPageCount(metaXml) : undefined;
    if (stored) {
      return stored;
    }

    const contentXml = await packageFile.readText("content.xml");
    const slides = contentXml ? countOdfSlides(contentXml) : 0;
    if (slides > 0) {
      return slides;
    }

    throw new FileNotCompatibleError("The presentation has no slides.");
  }
}
