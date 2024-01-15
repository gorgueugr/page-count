import { Stream } from "stream";
import * as unzip from "unzipper";
import { parseString } from "xml2js";
import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";
import { bufferToStream, streamToString } from "./shared";

export class DocxCounter implements ICounter {
  private static async _parseXmlFile(xml: Stream): Promise<number> {
    const xmlStr: string = await streamToString(xml);

    return new Promise<number>((resolve, reject) => {
      parseString(xmlStr, (err, result) => {
        if (err) resolve(0);
        // check if Properties.Pages exists
        if (result["Properties"] && result["Properties"]["Pages"]) {
          resolve(parseInt(result["Properties"]["Pages"][0]));
        }
        reject(new FileNotCompatibleError());
      });
    });
  }

  static count(buffer: Uint8Array | Buffer): Promise<number> {
    return new Promise(async (resolve, reject) => {
      bufferToStream(buffer)
        .pipe(unzip.Parse())
        .on("entry", async (entry) => {
          if (entry.path === "docProps/app.xml") {
            try {
              const pages = await DocxCounter._parseXmlFile(entry);
              resolve(pages);
            } catch (error) {
              reject(error);
            } finally {
              entry.autodrain();
            }
          }
          entry.autodrain();
        })
        .on("close", () => {
          reject(new FileNotCompatibleError());
        });
    });
  }
}
