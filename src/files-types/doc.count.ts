import { ICounter } from "./base.count";

export class DocCounter implements ICounter {    
    static count(buffer: Uint8Array | Buffer): number {
        throw new Error("Method not implemented.");
    }
}