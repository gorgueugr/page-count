export type FileTypes = "pdf" | "docx" | "pptx" | "odt" ; // | "doc" |  "ppt";

export class ICounter {
    static count(buffer:  Uint8Array | Buffer) : Promise<number> | number {
        throw new Error('Not implemented Error');
    }    
}
