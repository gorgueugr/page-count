import { FileNotCompatibleError } from "../errors/FileNotCompatibleError";
import { ICounter } from "./base.count";

// \page and \pagebb are the hard page breaks of RTF. Control words are
// matched with a word boundary check so \pagebreakstyle-like tokens are not
// counted twice.
const PAGE_BREAK = /\\(page|pagebb)(?![A-Za-z])/g;
const RTF_SIGNATURE = "{\\rtf";
// A destination we must skip: group destinations such as {\*\...}.
const DESTINATIONS = /\{\\\*[\s\S]*?\}/g;

function stripDestinations(rtf: string): string {
  let previous = "";
  let current = rtf;
  // Destinations can nest, iterate until nothing changes (bounded).
  for (let index = 0; index < 8 && previous !== current; index++) {
    previous = current;
    current = current.replace(DESTINATIONS, "");
  }
  return current;
}

/**
 * RTF has no stored page count: pages are only known after layout. Explicit
 * page breaks give a lower bound, so the counter returns 1 + breaks.
 */
export class RtfCounter implements ICounter {
  static async count(buffer: Uint8Array | Buffer): Promise<number> {
    const rtf = Buffer.isBuffer(buffer) ? buffer.toString("latin1") : Buffer.from(buffer).toString("latin1");

    if (rtf.indexOf(RTF_SIGNATURE) !== 0) {
      throw new FileNotCompatibleError();
    }

    const body = stripDestinations(rtf);
    const matches = body.match(PAGE_BREAK);

    return 1 + (matches ? matches.length : 0);
  }

  /** The explicit breaks are a lower bound, never an estimate above it. */
  static async estimate(
    buffer: Uint8Array | Buffer
  ): Promise<{ pages: number; estimated: boolean; method: "breaks" }> {
    return { pages: await RtfCounter.count(buffer), estimated: true, method: "breaks" };
  }
}
