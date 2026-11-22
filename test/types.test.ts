import { readFileSync } from "fs";
import countPages, {
  DocCounter,
  DocxCounter,
  estimatePages,
  FileNotCompatibleError,
  OdsCounter,
  OdpCounter,
  PptCounter,
  RtfCounter,
  XlsxCounter,
  detectFileType,
} from "../src/index";

const read = (name: string) => readFileSync("test/files/" + name);

describe("Binary Word documents", () => {
  it("reads the page count from the summary information", async () => {
    expect(await countPages(read("test-2pages.doc"))).toBe(2);
  });

  it("rejects a file that is not a compound file", async () => {
    await expect(DocCounter.count(read("test-1.docx"))).rejects.toThrow(
      FileNotCompatibleError
    );
  });

  it("rejects a compound file that is not a Word document", async () => {
    await expect(DocCounter.count(read("test-1slide.ppt"))).rejects.toThrow(
      FileNotCompatibleError
    );
  });
});

describe("Binary PowerPoint presentations", () => {
  it("reads the slide count from the document summary information", async () => {
    expect(await PptCounter.count(read("test-1slide.ppt"))).toBe(1);
  });

  it("rejects a compound file that is not a presentation", async () => {
    await expect(PptCounter.count(read("test-2pages.doc"))).rejects.toThrow(
      FileNotCompatibleError
    );
  });
});

describe("Spreadsheets", () => {
  it("reads the printed page count stored by the editor", async () => {
    expect(await XlsxCounter.count(read("test-7pages.xlsx"))).toBe(7);
  });

  it("falls back to the number of worksheets", async () => {
    expect(await XlsxCounter.count(read("test-3sheets.xlsx"))).toBe(3);
  });

  it("counts the sheets of an ods", async () => {
    expect(await OdsCounter.count(read("test-2sheets.ods"))).toBe(2);
  });

  it("labels the sheet count as an estimate", async () => {
    const result = await estimatePages(read("test-2sheets.ods"));
    expect(result).toEqual({ pages: 2, estimated: true, method: "sheets" });
  });
});

describe("RTF", () => {
  it("counts one page plus the explicit page breaks", async () => {
    expect(await RtfCounter.count(read("test-3pages.rtf"))).toBe(3);
  });

  it("rejects a buffer that is not rtf", async () => {
    await expect(RtfCounter.count(read("test-1.pdf"))).rejects.toThrow(
      FileNotCompatibleError
    );
  });
});

describe("OpenDocument presentations", () => {
  it("counts the slides", async () => {
    expect(await OdpCounter.count(read("test-1.odp"))).toBe(1);
    expect(await OdpCounter.count(read("test-10.odp"))).toBe(10);
  });

  it("rejects a text document", async () => {
    await expect(OdpCounter.count(read("test-1.odt"))).rejects.toThrow(
      FileNotCompatibleError
    );
  });
});

describe("File type aliases", () => {
  it("counts macro enabled and template variants with their base counter", async () => {
    expect(await countPages(read("test-1.docx"), "docm")).toBe(1);
    expect(await countPages(read("test-10.docx"), "dotx")).toBe(10);
    expect(await countPages(read("test-10.pptx"), "pptm")).toBe(10);
    expect(await countPages(read("test-10.odt"), "ott")).toBe(10);
    expect(await countPages(read("test-3sheets.xlsx"), "xlsm")).toBe(3);
  });
});

describe("File type detection", () => {
  const fixtures: Array<[string, string]> = [
    ["test-10.pdf", "pdf"],
    ["test-10.docx", "docx"],
    ["test-10.pptx", "pptx"],
    ["test-7pages.xlsx", "xlsx"],
    ["test-10.odt", "odt"],
    ["test-10.odp", "odp"],
    ["test-2sheets.ods", "ods"],
    ["test-2pages.doc", "doc"],
    ["test-1slide.ppt", "ppt"],
    ["test-3pages.rtf", "rtf"],
  ];

  for (const [file, expected] of fixtures) {
    it(`detects ${expected} from the content of ${file}`, async () => {
      expect(await detectFileType(read(file))).toBe(expected);
    });

    it(`counts ${file} without being told the type`, async () => {
      expect(await countPages(read(file))).toBeGreaterThan(0);
    });
  }

  it("rejects an unsupported file", async () => {
    await expect(detectFileType(Buffer.from("no soy un documento"))).rejects.toThrow(
      FileNotCompatibleError
    );
  });

  it("rejects an unknown file type name", async () => {
    await expect(countPages(read("test-1.pdf"), "txt" as any)).rejects.toThrow(
      /File type not accepted/
    );
  });
});

describe("Robustness", () => {
  const truncated: string[] = [
    "test-10.pdf",
    "test-10.docx",
    "test-10.pptx",
    "test-7pages.xlsx",
    "test-10.odt",
    "test-10.odp",
    "test-2pages.doc",
  ];

  for (const file of truncated) {
    it(`rejects a truncated ${file} with a counting error`, async () => {
      const buffer = read(file).slice(0, Math.floor(read(file).length / 2));
      await expect(countPages(buffer)).rejects.toThrow(FileNotCompatibleError);
    });
  }

  it("rejects random bytes", async () => {
    const buffer = Buffer.alloc(4096);
    for (let index = 0; index < buffer.length; index++) {
      buffer[index] = (index * 37 + 11) % 256;
    }
    await expect(countPages(buffer)).rejects.toThrow(FileNotCompatibleError);
  });

  it("rejects an empty buffer", async () => {
    await expect(countPages(Buffer.alloc(0))).rejects.toThrow(FileNotCompatibleError);
  });
});

describe("Estimation", () => {
  it("estimates a plain text docx from its layout", async () => {
    const result = await DocxCounter.estimate(read("test-docx-plain-text.docx"));

    expect(result.estimated).toBe(true);
    expect(result.method).toBe("content");
    expect(result.pages).toBeGreaterThan(1);
    expect(result.pages).toBeLessThan(15);
    expect(result.layout && result.layout.charactersPerLine).toBeGreaterThan(40);
  });

  it("keeps a short plain text docx on one page", async () => {
    const result = await estimatePages(read("test-docx-one-paragraph.docx"));
    expect(result).toMatchObject({ pages: 1, estimated: true, method: "content" });
  });

  it("does not estimate when the file stores its pagination", async () => {
    const result = await estimatePages(read("test-10.docx"));
    expect(result).toEqual({ pages: 10, estimated: false, method: "stored" });
  });

  it("does not estimate for presentations", async () => {
    const result = await estimatePages(read("test-10.pptx"));
    expect(result.estimated).toBe(false);
    expect(result.pages).toBe(10);
  });
});
