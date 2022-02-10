import { Readable, Stream } from "stream";



export function bufferToStream(buffer: Buffer) { 
    var stream = new Readable();
    stream.push(buffer);
    stream.push(null);
  
    return stream;
}

export function streamToString(stream: Stream) {
  const chunks = [];
  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}