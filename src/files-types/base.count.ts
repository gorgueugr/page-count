export type FileTypes = "pdf" | "docx" | "pptx" | "odt" ; // | "doc" |  "ppt";

export abstract class ICounter {
    static count(buffer: Buffer) : Promise<number> | number {
        throw new Error('Not implemented Error');
    }
}
