export type FileTypes = "pdf" | "doc" | "docx" | "ppt" | "pptx" | "odt";

export abstract class ICounter {
    static count(buffer: Buffer) : Promise<number> | number {
        throw new Error('Not implemented Error');
    }
}
