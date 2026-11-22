import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { openPackage, readExtendedProperty } from "./ooxml";

const SLIDE_PART = /^ppt\/slides\/slide\d+\.xml$/;

/**
 * PowerPoint presentations store the number of slides in docProps/app.xml.
 * When that value is missing the slides can be counted exactly anyway: every
 * slide is a part of the package.
 */
export class PptxCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const packageFile = await openPackage(buffer);
    const slides = packageFile.list().filter((path) => SLIDE_PART.test(path));

    if (!packageFile.has("docProps/app.xml") && slides.length === 0) {
      throw new FileNotCompatibleError();
    }

    const propsXml = await packageFile.readText("docProps/app.xml");
    if (propsXml) {
      const stored = await readExtendedProperty(propsXml, "Slides");
      if (stored) {
        return stored;
      }
    }

    if (slides.length > 0) {
      return slides.length;
    }

    throw new FileNotCompatibleError(
      "The presentation has no stored slide count and no slides."
    );
  }

  /** Same as count: the slide parts give the exact number, nothing to estimate. */
  static async estimate(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: "stored" | "parts" }> {
    const packageFile = await openPackage(buffer);
    const propsXml = await packageFile.readText("docProps/app.xml");

    if (propsXml) {
      const stored = await readExtendedProperty(propsXml, "Slides");
      if (stored) {
        return { pages: stored, estimated: false, method: "stored" };
      }
    }

    const slides = packageFile.list().filter((path) => SLIDE_PART.test(path));
    if (slides.length === 0) {
      throw new FileNotCompatibleError("The presentation has no slides.");
    }

    return { pages: slides.length, estimated: false, method: "parts" };
  }
}
