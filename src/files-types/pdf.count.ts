import { ICounter } from "./base.count";
import pdfParse from 'pdf-parse';

export class PdfCounter implements ICounter {


    static async count(buffer: Uint8Array | Buffer): Promise<number> {
            if (buffer instanceof Buffer) {
                buffer = new Uint8Array(buffer);
            }
            const { numpages } = await pdfParse(buffer);

            return numpages || 0;
    }
}