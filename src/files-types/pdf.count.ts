import { ICounter } from "./base.count";
import {getDocument} from 'pdfjs-dist';

export class PdfCounter implements ICounter {
    static async count(buffer: Buffer): Promise<number> {
        try {
            const doc = await getDocument(buffer).promise;
            const pages = doc.numPages;

            if (!pages) return 0;
            return pages;
        } catch (error) {
            console.error(error)
            throw new Error(error)    
        }
    }
}