import { ICounter } from "./base.count";
import {getDocument} from 'pdfjs-dist';

export class PdfCounter implements ICounter {
    static async count(buffer: Buffer): Promise<number> {
            const doc = await getDocument(buffer).promise;
            const pages = doc?.numPages;

            return pages || 0;
    }
}