/**
 * Generate a minimal valid PNG buffer in-memory for upload tests.
 * This creates a 1x1 pixel red PNG (~68 bytes) — no filesystem needed.
 */
export function createFakeScreenshot(): {
  name: string;
  mimeType: string;
  buffer: Buffer;
} {
  // Minimal valid PNG: 1x1 pixel, RGBA red
  // PNG signature + IHDR + IDAT + IEND chunks
  const png = Buffer.from(
    "89504e470d0a1a0a" + // PNG signature
      "0000000d49484452" + // IHDR length + type
      "00000001" + // width: 1
      "00000001" + // height: 1
      "08" + // bit depth: 8
      "02" + // color type: RGB
      "0000003e" + // compression, filter, interlace + CRC placeholder
      "0000000c49444154" + // IDAT length + type
      "789c626060600000000400012706e7" + // compressed data (approx)
      "0000000049454e44ae426082", // IEND
    "hex",
  );

  // Use a simpler approach: build a proper tiny PNG
  return {
    name: "payment-screenshot.png",
    mimeType: "image/png",
    buffer: buildMinimalPng(),
  };
}

function buildMinimalPng(): Buffer {
  // PNG file signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: 1x1 pixel, 8-bit RGB
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0); // width
  ihdrData.writeUInt32BE(1, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // IDAT chunk: minimal compressed image data
  // Raw row: filter byte (0) + R G B = [0, 255, 0, 0] (red pixel)
  // We use zlib deflate of this tiny payload
  const zlib = require("zlib");
  const rawData = Buffer.from([0, 255, 0, 0]); // filter=none, R=255, G=0, B=0
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk("IDAT", compressed);

  // IEND chunk
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
