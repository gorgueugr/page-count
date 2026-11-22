/** File extensions the package can count pages for. */
export type FileTypes =
  | "pdf"
  | "docx"
  | "docm"
  | "dotx"
  | "dotm"
  | "pptx"
  | "pptm"
  | "ppsx"
  | "potx"
  | "potm"
  | "xlsx"
  | "xlsm"
  | "xltx"
  | "odt"
  | "ott"
  | "odp"
  | "otp"
  | "ods"
  | "ots"
  | "doc"
  | "dot"
  | "ppt"
  | "pps"
  | "pot"
  | "rtf";

/** Shape every counter implements. */
export interface CounterConstructor {
  count(buffer: Uint8Array | Buffer): Promise<number> | number;
  estimate?(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: string }> | { pages: number; estimated: boolean; method: string };
}

export class ICounter {
  static count(buffer: Uint8Array | Buffer): Promise<number> | number {
    throw new Error("Not implemented Error");
  }
}

export interface EstimateResult {
  pages: number;
  /** False when the value comes from pagination data stored in the file. */
  estimated: boolean;
  method: string;
}
