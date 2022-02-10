import { filesCounters } from "./files-types";
import { FileTypes, ICounter } from "./files-types/base.count";


export function countPages(buffer: Buffer, type: FileTypes) : Promise<number> | number {
    const counterClass = filesCounters[type];
    
    if (!counterClass){
        throw new Error(`File type not accepted. File type: ${type}`)
    } 

    return counterClass.count(buffer);
}