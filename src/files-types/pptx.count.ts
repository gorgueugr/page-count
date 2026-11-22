import * as unzip from 'unzipper';
import { parseString } from 'xml2js';
import { FileNotCompatibleError } from '../errors/FileNotCompatibleError';
import { ICounter } from './base.count';

export class PptxCounter extends ICounter {

    private static _slidesFromProps(xmlStr: string): Promise<number | undefined> {
        return new Promise((resolve) => {
            try {
                parseString(xmlStr, { explicitArray: true }, (err, result) => {
                    if (err || !result || typeof result !== 'object') {
                        return resolve(undefined);
                    }

                    // Namespace prefixes are not guaranteed, compare on the local name.
                    const propertiesKey = Object.keys(result).find((key) => /(^|:)Properties$/.test(key));
                    const properties = propertiesKey ? result[propertiesKey] : undefined;
                    if (!properties || typeof properties !== 'object') {
                        return resolve(undefined);
                    }

                    const slidesKey = Object.keys(properties).find((key) => /(^|:)Slides$/.test(key));
                    const rawSlides = slidesKey ? properties[slidesKey] : undefined;
                    const slides = parseInt(String(Array.isArray(rawSlides) ? rawSlides[0] : rawSlides), 10);

                    resolve(Number.isFinite(slides) && slides > 0 ? slides : undefined);
                });
            } catch (error) {
                resolve(undefined);
            }
        });
    }

    static async count(buffer: Uint8Array | Buffer): Promise<number> {
        let directory: any;

        try {
            directory = await unzip.Open.buffer(Buffer.from(buffer));
        } catch (error) {
            throw new FileNotCompatibleError();
        }

        const files = (directory && directory.files) || [];
        const propsFile = files.find((file: any) => file.path === 'docProps/app.xml');
        const slides = files.filter((file: any) => /^ppt\/slides\/slide\d+\.xml$/.test(file.path));

        if (propsFile) {
            try {
                const fromProps = await PptxCounter._slidesFromProps((await propsFile.buffer()).toString('utf8'));
                if (fromProps) {
                    return fromProps;
                }
            } catch (error) {
                // fall back to counting the slide files below
            }
        }

        if (slides.length > 0) {
            return slides.length;
        }

        throw new FileNotCompatibleError();
    }
}
