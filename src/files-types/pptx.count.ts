import { Stream } from 'stream';
import * as unzip from 'unzipper';
import { parseString } from 'xml2js';
import { ICounter } from './base.count';
import { bufferToStream, streamToString } from "./shared";

export class PptxCounter implements ICounter {


    private static async _parseXmlFile(xml: Stream) : Promise<number> {
        const xmlStr: string = await streamToString(xml);

        return new Promise<number>((resolve) => {
            parseString(xmlStr, (err, result) => {
                if (err) resolve(0);
    
                if (result['Properties']['Slides'][0]) {
                    resolve(parseInt(result['Properties']['Slides'][0]));
                } 
                resolve(0);
            })
        })
    }


    static count(buffer: Buffer): Promise<number> {
        return new Promise(async (resolve) => {
            bufferToStream(buffer)
                .pipe(unzip.Parse())
                .on('entry', async (entry) => {
                    if (entry.path == 'docProps/app.xml') {
                        const pages = await PptxCounter._parseXmlFile(entry);
                        resolve(pages);
                    }
                    entry.autodrain();
                })
        })
    }
}
