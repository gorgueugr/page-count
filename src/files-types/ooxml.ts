import * as unzip from "unzipper";
import { parseString } from "xml2js";
import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";

/**
 * Helpers shared by the OOXML counters (docx, pptx, xlsx and their macro
 * enabled variants). All of them are zip packages whose page/slide count is
 * normally stored in docProps/app.xml.
 */

export interface OfficePackage {
  has(path: string): boolean;
  readText(path: string): Promise<string | undefined>;
  list(): string[];
}

export function countMatches(xml: string, re: RegExp): number {
  const matches = xml.match(re);
  return matches ? matches.length : 0;
}

export async function openPackage(buffer: Uint8Array | Buffer): Promise<OfficePackage> {
  let directory: any;

  try {
    directory = await unzip.Open.buffer(Buffer.from(buffer));
  } catch (error) {
    throw new FileNotCompatibleError();
  }

  const files: any[] = (directory && directory.files) || [];
  const paths = files.map((file) => String(file.path));

  return {
    has(path: string): boolean {
      return paths.indexOf(path) !== -1;
    },
    list(): string[] {
      return paths.slice();
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

/**
 * Reads a numeric property from the extended properties part
 * (docProps/app.xml): Pages for documents, Slides for presentations.
 * Namespace prefixes are not guaranteed, so properties are matched on their
 * local name.
 */
export async function readExtendedProperty(
  xml: string,
  propertyName: string
): Promise<number | undefined> {
  const result = await new Promise<any>((resolve) => {
    try {
      parseString(xml, { explicitArray: true }, (err, parsed) => {
        resolve(err ? undefined : parsed);
      });
    } catch (error) {
      resolve(undefined);
    }
  });

  if (!result || typeof result !== "object") {
    return undefined;
  }

  const propertiesKey = Object.keys(result).find((key) => /(^|:)Properties$/.test(key));
  const properties = propertiesKey ? result[propertiesKey] : undefined;
  if (!properties || typeof properties !== "object") {
    return undefined;
  }

  const propertyKey = Object.keys(properties).find(
    (key) => key === propertyName || key.split(":").pop() === propertyName
  );
  const rawValue = propertyKey ? properties[propertyKey] : undefined;
  const value = parseInt(String(Array.isArray(rawValue) ? rawValue[0] : rawValue), 10);

  return Number.isFinite(value) && value > 0 ? value : undefined;
}
