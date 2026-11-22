import { FileNotCompatibleError } from "./errors/FileNotCompatibleError";
import { FileTypes } from "./files-types/base.count";
import { openOdfPackage } from "./files-types/odf";
import { openPackage } from "./files-types/ooxml";
import { openCompoundFile } from "./ole/compoundFile";

/**
 * Detects the kind of document from its content, so callers do not have to
 * trust the file extension: pdf, the OOXML packages (docx/pptx/xlsx), the
 * OpenDocument packages (odt/odp/ods), the binary Office formats
 * (doc/ppt) and rtf.
 */

function startsWith(buffer: Buffer, signature: string): boolean {
  if (buffer.length < signature.length) {
    return false;
  }
  for (let index = 0; index < signature.length; index++) {
    if (buffer[index] !== signature.charCodeAt(index)) {
      return false;
    }
  }
  return true;
}

function isZip(buffer: Buffer): boolean {
  return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b &&
    ((buffer[2] === 0x03 && buffer[3] === 0x04) || (buffer[2] === 0x05 && buffer[3] === 0x06));
}

function isCompoundFile(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

async function detectPackageType(buffer: Buffer): Promise<FileTypes> {
  // OpenDocument files declare their type in the mimetype part.
  const odf = await openOdfPackage(buffer);
  const mimetype = await odf.readText("mimetype");
  if (mimetype) {
    const type = mimetype.trim().toLowerCase();
    if (type.indexOf("opendocument.text") !== -1) {
      return "odt";
    }
    if (type.indexOf("opendocument.presentation") !== -1) {
      return "odp";
    }
    if (type.indexOf("opendocument.spreadsheet") !== -1) {
      return "ods";
    }
  }

  const office = await openPackage(buffer);
  if (office.has("word/document.xml")) {
    return "docx";
  }
  if (office.has("ppt/presentation.xml")) {
    return "pptx";
  }
  if (office.has("xl/workbook.xml")) {
    return "xlsx";
  }

  throw new FileNotCompatibleError("Unknown zip package type.");
}

function detectCompoundType(buffer: Buffer): FileTypes {
  let compoundFile;
  try {
    compoundFile = openCompoundFile(buffer);
  } catch (error) {
    throw new FileNotCompatibleError();
  }

  if (compoundFile.hasStream("WordDocument")) {
    return "doc";
  }
  if (compoundFile.hasStream("PowerPoint Document")) {
    return "ppt";
  }
  if (compoundFile.hasStream("Workbook") || compoundFile.hasStream("Book")) {
    throw new FileNotCompatibleError(
      "Excel 97-2003 workbooks (.xls) store no page count; convert the file to .xlsx."
    );
  }

  throw new FileNotCompatibleError("Unknown compound file type.");
}

export async function detectFileType(buffer: Uint8Array | Buffer): Promise<FileTypes> {
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (startsWith(data, "%PDF")) {
    return "pdf";
  }
  if (startsWith(data, "{\\rtf")) {
    return "rtf";
  }
  if (isZip(data)) {
    return detectPackageType(data);
  }
  if (isCompoundFile(data)) {
    return detectCompoundType(data);
  }

  throw new FileNotCompatibleError("Unsupported file type.");
}
