import { CountingPagesException } from "../errors/CountingPagesException";
import { ICounter } from "./base.count";

export class PdfCounter implements ICounter {
    static async count(buffer: Buffer): Promise<number> {
        try {
            
            const str = buffer.toString('utf-8')
            const match = str.match(new RegExp('/Type\s*/Page[^s]', 'g'));
            const pages = match?.length || null;
            if (pages === null) throw new CountingPagesException();
            return pages;
        } catch (error) {
            console.error(error)
            throw new Error(error)    
        }
    }
}