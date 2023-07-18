import { filesCounters } from "./files-types";
import { FileTypes } from "./files-types/base.count";

export * from "./files-types";

export default function countPages(buffer: Uint8Array | Buffer, type: FileTypes): Promise<number> | number {
    const counterClass = filesCounters[type];

    if (!counterClass) {
        throw new Error(`File type not accepted. File type: ${type}`);
    }

    return counterClass.count(buffer);
}