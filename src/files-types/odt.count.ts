import * as unzip from 'unzipper';
import { ICounter } from './base.count';
import { bufferToStream, streamToString } from "./shared";

export class OdtCounter implements ICounter {
    static count(buffer: Uint8Array | Buffer): Promise<number> {
        return new Promise(async (resolve, reject) => {
            bufferToStream(buffer)
                .pipe(unzip.Parse())
                .on('entry', async (entry) => {
                    if (entry.path == 'meta.xml') {
                        const entryStr: string = await streamToString(entry);
                        const searchTerm = 'page-count="';
                        const start = entryStr.indexOf(searchTerm);
                        const firstStr = entryStr.substring(start + searchTerm.length, entryStr.length);
                        const end = firstStr.indexOf('"');
                        const numStr = firstStr.substring(0, end);
                        return resolve(parseInt(numStr));
                    }
                    entry.autodrain();
                })
        })
    }
}
