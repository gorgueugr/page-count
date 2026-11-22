import { CounterConstructor, FileTypes } from "./base.count";
import { DocCounter } from "./doc.count";
import { DocxCounter } from "./docx.count";
import { OdpCounter } from "./odp.count";
import { OdsCounter } from "./ods.count";
import { OdtCounter } from "./odt.count";
import { PdfCounter } from "./pdf.count";
import { PptCounter } from "./ppt.count";
import { PptxCounter } from "./pptx.count";
import { RtfCounter } from "./rtf.count";
import { XlsxCounter } from "./xlsx.count";

export {
  DocCounter,
  DocxCounter,
  OdpCounter,
  OdsCounter,
  OdtCounter,
  PdfCounter,
  PptCounter,
  PptxCounter,
  RtfCounter,
  XlsxCounter,
};
export { LayoutEstimate, LayoutMetrics, estimateLayout, readLayoutMetrics } from "./docx.layout";
export { DocxEstimate } from "./docx.count";
export { EstimateResult, FileTypes } from "./base.count";

export const filesCounters: Record<FileTypes, CounterConstructor> = {
  pdf: PdfCounter,

  docx: DocxCounter,
  docm: DocxCounter,
  dotx: DocxCounter,
  dotm: DocxCounter,

  pptx: PptxCounter,
  pptm: PptxCounter,
  ppsx: PptxCounter,
  potx: PptxCounter,
  potm: PptxCounter,

  xlsx: XlsxCounter,
  xlsm: XlsxCounter,
  xltx: XlsxCounter,

  odt: OdtCounter,
  ott: OdtCounter,

  odp: OdpCounter,
  otp: OdpCounter,

  ods: OdsCounter,
  ots: OdsCounter,

  doc: DocCounter,
  dot: DocCounter,

  ppt: PptCounter,
  pps: PptCounter,
  pot: PptCounter,

  rtf: RtfCounter,
};

/** Counter registered for a file type, undefined when it is not supported. */
export function counterFor(fileType: string): CounterConstructor | undefined {
  return filesCounters[fileType as FileTypes];
}
