/**
 * Reader for the OLE property set streams that Office writes for the legacy
 * binary formats ("\x05SummaryInformation" and
 * "\x05DocumentSummaryInformation").
 *
 * The interesting properties for page counting are:
 *   SummaryInformation         14 = page count, 15 = word count
 *   DocumentSummaryInformation  7 = slide count, 5 = line count,
 *                               6 = paragraph count
 */

export type PropertyValue = number | string | undefined;

const VT_I2 = 2;
const VT_I4 = 3;
const VT_BOOL = 11;
const VT_UI4 = 19;
const VT_LPSTR = 30;
const VT_LPWSTR = 31;
const VT_FILETIME = 64;

export class PropertySet {
  private readonly sections: Array<Map<number, PropertyValue>> = [];

  constructor(buffer: Buffer) {
    if (buffer.length < 28 || buffer.readUInt16LE(0) !== 0xfffe) {
      return;
    }

    const sectionCount = buffer.readUInt32LE(24);

    for (let index = 0; index < sectionCount; index++) {
      const descriptorOffset = 28 + index * 20;
      if (descriptorOffset + 20 > buffer.length) {
        break;
      }

      const sectionOffset = buffer.readUInt32LE(descriptorOffset + 16);
      this.sections.push(this.readSection(buffer, sectionOffset));
    }
  }

  /** Value of the property with that id in the first section that has it. */
  get(propertyId: number): PropertyValue {
    for (const section of this.sections) {
      if (section.has(propertyId)) {
        return section.get(propertyId);
      }
    }
    return undefined;
  }

  /** Numeric value of the property, only when it is a positive integer. */
  getNumber(propertyId: number): number | undefined {
    const value = this.get(propertyId);
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return undefined;
    }
    return Math.round(value);
  }

  getString(propertyId: number): string | undefined {
    const value = this.get(propertyId);
    return typeof value === "string" ? value : undefined;
  }

  private readSection(buffer: Buffer, sectionOffset: number): Map<number, PropertyValue> {
    const properties = new Map<number, PropertyValue>();

    if (sectionOffset + 8 > buffer.length) {
      return properties;
    }

    const propertyCount = buffer.readUInt32LE(sectionOffset + 4);

    for (let index = 0; index < propertyCount; index++) {
      const entryOffset = sectionOffset + 8 + index * 8;
      if (entryOffset + 8 > buffer.length) {
        break;
      }

      const propertyId = buffer.readUInt32LE(entryOffset);
      const valueOffset = sectionOffset + buffer.readUInt32LE(entryOffset + 4);
      if (valueOffset + 4 > buffer.length) {
        continue;
      }

      const value = this.readValue(buffer, valueOffset);
      if (value !== undefined) {
        properties.set(propertyId, value);
      }
    }

    return properties;
  }

  private readValue(buffer: Buffer, offset: number): PropertyValue {
    const type = buffer.readUInt32LE(offset);
    const dataOffset = offset + 4;

    switch (type) {
      case VT_I2:
        return dataOffset + 2 <= buffer.length ? buffer.readInt16LE(dataOffset) : undefined;
      case VT_I4:
      case VT_UI4:
        return dataOffset + 4 <= buffer.length ? buffer.readInt32LE(dataOffset) : undefined;
      case VT_BOOL:
        return dataOffset + 2 <= buffer.length ? buffer.readInt16LE(dataOffset) : undefined;
      case VT_FILETIME:
        return dataOffset + 8 <= buffer.length
          ? buffer.readUInt32LE(dataOffset) + buffer.readUInt32LE(dataOffset + 4) * 0x100000000
          : undefined;
      case VT_LPSTR: {
        if (dataOffset + 4 > buffer.length) {
          return undefined;
        }
        const length = buffer.readUInt32LE(dataOffset);
        const start = dataOffset + 4;
        const end = Math.min(start + length, buffer.length);
        return buffer.slice(start, end).toString("latin1").replace(/\0.*$/, "");
      }
      case VT_LPWSTR: {
        if (dataOffset + 4 > buffer.length) {
          return undefined;
        }
        const length = buffer.readUInt32LE(dataOffset);
        const start = dataOffset + 4;
        const end = Math.min(start + length * 2, buffer.length);
        return buffer.slice(start, end).toString("utf16le").replace(/\0.*$/, "");
      }
      default:
        return undefined;
    }
  }
}

export function readPropertySet(buffer: Buffer): PropertySet {
  return new PropertySet(buffer);
}
