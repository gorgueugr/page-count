import { bufferToStream, streamToString } from "./shared";
import * as unzip from 'unzip';
import { parseString } from 'xml2js';
import { ICounter } from "./base.count";

export class DocxCounter implements ICounter {
    static count(buffer: Buffer): Promise<number> {
        return new Promise(async (resolve, reject) => {
            bufferToStream(buffer)
                .pipe(unzip.Parse())
                .on('entry', async (entry) => {
                    if (entry.path == 'docProps/app.xml') {
                        const entryStr: string = await streamToString(entry);
                        parseString(entryStr, (err, result) => {
                            if(result['Properties']['Pages'][0]){
                                return resolve(result['Properties']['Pages'][0])
                              } else {
                                return reject(`Cannot find page count. Error: ${err}`);
                              }
                        })
                    }
                    entry.autodrain();
                })
        })
    }
}