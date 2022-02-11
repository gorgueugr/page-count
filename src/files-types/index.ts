import { DocCounter } from "./doc.count";
import { DocxCounter } from "./docx.count";
import { PdfCounter } from "./pdf.count";
import { PptCounter } from "./ppt.count";
import { PptxCounter } from "./pptx.count";
import { OdtCounter } from "./odt.count";

export const filesCounters = {
        "pdf": PdfCounter,
        "doc": DocCounter,
        "docx": DocxCounter,
        "ppt": PptCounter,
        "pptx": PptxCounter,
        "odt": OdtCounter,
}