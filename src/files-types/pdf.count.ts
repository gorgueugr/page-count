import { CountingPagesException } from "../errors/CountingPagesException";
import { ICounter } from "./base.count";

export class PdfCounter implements ICounter {
    static async count(buffer: Buffer): Promise<number> {
        const pages = buffer
                       .toString()
                       .match(new RegExp('/Type\\s*/Page[^s]', 'g'))
                       ?.length || null;
        
        if (pages === null) throw new CountingPagesException();
        return pages;
    }
}