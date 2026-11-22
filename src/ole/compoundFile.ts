/**
 * Minimal reader for the Compound File Binary format (OLE2), the container
 * used by the legacy binary Office formats (.doc, .ppt, .xls).
 *
 * Only what page counting needs is implemented: enumerating streams of the
 * root storage and reading a whole stream either from the regular FAT chain
 * or from the mini stream used for small entries.
 */

export interface CompoundFileEntry {
  name: string;
  type: number; // 1 storage, 2 stream, 5 root
  startSector: number;
  size: number;
}

const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;
const MAX_REGULAR_SECTOR = 0xfffffffa;

export class FileNotCompoundFileError extends Error {
  constructor(message = "Not a compound file.") {
    super(message);
  }
}

export class CompoundFile {
  private readonly buffer: Buffer;
  private readonly sectorSize: number;
  private readonly miniSectorSize: number;
  private readonly miniStreamCutoff: number;
  private readonly fat: number[];
  private readonly miniFat: number[];
  private readonly entries: CompoundFileEntry[] = [];
  private readonly miniStream: Buffer;

  constructor(buffer: Buffer) {
    this.buffer = buffer;

    if (buffer.length < 512) {
      throw new FileNotCompoundFileError();
    }
    for (let index = 0; index < SIGNATURE.length; index++) {
      if (buffer[index] !== SIGNATURE[index]) {
        throw new FileNotCompoundFileError();
      }
    }

    this.sectorSize = 1 << buffer.readUInt16LE(0x1e);
    this.miniSectorSize = 1 << buffer.readUInt16LE(0x20);
    this.miniStreamCutoff = buffer.readUInt32LE(0x38);

    if (this.sectorSize !== 512 && this.sectorSize !== 4096) {
      throw new FileNotCompoundFileError();
    }

    this.fat = this.readFat();
    this.miniFat = this.readMiniFat(buffer.readUInt32LE(0x3c), buffer.readUInt32LE(0x40));
    this.readDirectory(buffer.readUInt32LE(0x30));

    const root = this.entries.find((entry) => entry.type === 5);
    this.miniStream = root ? this.readRegularStream(root.startSector, root.size) : Buffer.alloc(0);
  }

  /** Stream names of the root storage, without the hierarchy below it. */
  listStreams(): string[] {
    return this.entries.filter((entry) => entry.type === 2).map((entry) => entry.name);
  }

  hasStream(name: string): boolean {
    return this.entries.some((entry) => entry.type === 2 && entry.name === name);
  }

  getStream(name: string): Buffer | undefined {
    const entry = this.entries.find((item) => item.type === 2 && item.name === name);
    if (!entry) {
      return undefined;
    }
    if (entry.size < this.miniStreamCutoff) {
      return this.readMiniStream(entry.startSector, entry.size);
    }
    return this.readRegularStream(entry.startSector, entry.size);
  }

  private readFat(): number[] {
    const fatSectorCount = this.buffer.readUInt32LE(0x2c);
    const fatSectors: number[] = [];

    for (let index = 0; index < 109 && fatSectors.length < fatSectorCount; index++) {
      const sector = this.buffer.readUInt32LE(0x4c + index * 4);
      if (sector > MAX_REGULAR_SECTOR) {
        break;
      }
      fatSectors.push(sector);
    }

    const difatStart = this.buffer.readUInt32LE(0x44);
    const difatCount = this.buffer.readUInt32LE(0x48);
    const entriesPerDifatSector = this.sectorSize / 4 - 1;
    let difatSector = difatStart;

    for (let index = 0; index < difatCount && difatSector <= MAX_REGULAR_SECTOR; index++) {
      const offset = this.sectorOffset(difatSector);
      for (let entry = 0; entry < entriesPerDifatSector; entry++) {
        if (fatSectors.length >= fatSectorCount) {
          break;
        }
        const sector = this.buffer.readUInt32LE(offset + entry * 4);
        if (sector > MAX_REGULAR_SECTOR) {
          continue;
        }
        fatSectors.push(sector);
      }
      difatSector = this.buffer.readUInt32LE(offset + entriesPerDifatSector * 4);
    }

    const fat: number[] = [];
    const entriesPerSector = this.sectorSize / 4;
    for (const sector of fatSectors) {
      const offset = this.sectorOffset(sector);
      for (let entry = 0; entry < entriesPerSector; entry++) {
        fat.push(this.buffer.readUInt32LE(offset + entry * 4));
      }
    }

    return fat;
  }

  private readMiniFat(firstSector: number, sectorCount: number): number[] {
    const miniFat: number[] = [];
    const entriesPerSector = this.sectorSize / 4;
    let sector = firstSector;

    for (let index = 0; index < sectorCount && sector <= MAX_REGULAR_SECTOR; index++) {
      const offset = this.sectorOffset(sector);
      for (let entry = 0; entry < entriesPerSector; entry++) {
        miniFat.push(this.buffer.readUInt32LE(offset + entry * 4));
      }
      sector = this.fat[sector];
    }

    return miniFat;
  }

  private readDirectory(firstSector: number): void {
    const directory = this.readChain(firstSector, this.fat, this.sectorSize, Infinity);

    for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
      const nameLength = directory.readUInt16LE(offset + 64);
      const type = directory.readUInt8(offset + 66);

      if (type !== 1 && type !== 2 && type !== 5) {
        continue;
      }

      const rawName =
        nameLength >= 2
          ? directory.slice(offset, offset + Math.min(nameLength, 64) - 2)
          : Buffer.alloc(0);

      this.entries.push({
        name: rawName.toString("utf16le"),
        type,
        startSector: directory.readUInt32LE(offset + 116),
        size: this.readEntrySize(directory, offset),
      });
    }
  }

  private readEntrySize(directory: Buffer, offset: number): number {
    const low = directory.readUInt32LE(offset + 120);
    const high = directory.readUInt32LE(offset + 124);
    // Version 3 files (512 byte sectors) use the high dword for something else,
    // it only carries the real size in version 4 files (4096 byte sectors).
    return this.sectorSize === 4096 ? low + high * 0x100000000 : low;
  }

  private sectorOffset(sector: number): number {
    return (sector + 1) * this.sectorSize;
  }

  private readRegularStream(startSector: number, size: number): Buffer {
    const chunks = this.readChain(startSector, this.fat, this.sectorSize, size);
    return chunks.slice(0, size);
  }

  private readMiniStream(startSector: number, size: number): Buffer {
    const chunks = this.readChain(
      startSector,
      this.miniFat,
      this.miniSectorSize,
      size,
      this.miniStream
    );
    return chunks.slice(0, size);
  }

  private readChain(
    startSector: number,
    allocationTable: number[],
    unitSize: number,
    size: number,
    source: Buffer = this.buffer
  ): Buffer {
    const chunks: Buffer[] = [];
    const visited = new Set<number>();
    let sector = startSector;
    let remaining = size;

    while (sector <= MAX_REGULAR_SECTOR && !visited.has(sector)) {
      visited.add(sector);

      const start = allocationTable === this.miniFat ? sector * unitSize : this.sectorOffset(sector);
      const end = Math.min(start + unitSize, source.length);
      if (start >= source.length || end <= start) {
        break;
      }

      const chunk = source.slice(start, end);
      if (remaining !== Infinity) {
        chunks.push(chunk.slice(0, remaining));
        remaining -= chunk.length;
        if (remaining <= 0) {
          break;
        }
      } else {
        chunks.push(chunk);
      }

      const next = allocationTable[sector];
      if (next === undefined || next === END_OF_CHAIN || next === FREE_SECTOR) {
        break;
      }
      sector = next;
    }

    return Buffer.concat(chunks);
  }
}

export function openCompoundFile(buffer: Uint8Array | Buffer): CompoundFile {
  return new CompoundFile(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
}
