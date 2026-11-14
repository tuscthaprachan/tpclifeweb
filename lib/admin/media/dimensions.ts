export interface Dimensions {
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, o: number) => (b[o]! << 8) | b[o + 1]!;
const u32be = (b: Uint8Array, o: number) => ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
const u24le = (b: Uint8Array, o: number) => b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);

function png(b: Uint8Array): Dimensions | null {
  if (b.length < 24) return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

function jpeg(b: Uint8Array): Dimensions | null {
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) {
      o++;
      continue;
    }
    const marker = b[o + 1]!;
    if (marker === 0xff) {
      o++;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      o += 2;
      continue;
    }
    const length = u16be(b, o + 2);
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) return { height: u16be(b, o + 5), width: u16be(b, o + 7) };
    o += 2 + length;
  }
  return null;
}

function webp(b: Uint8Array): Dimensions | null {
  if (b.length < 30) return null;
  const chunk = String.fromCharCode(b[12]!, b[13]!, b[14]!, b[15]!);
  if (chunk === "VP8X") return { width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
  if (chunk === "VP8L") {
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") return { width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
  return null;
}

/** Pixel size read from the file header of a sniffed JPEG, PNG or WebP. Null for anything else or a damaged header. */
export function readImageDimensions(bytes: Uint8Array, contentType: string): Dimensions | null {
  const found = contentType === "image/png" ? png(bytes) : contentType === "image/jpeg" ? jpeg(bytes) : contentType === "image/webp" ? webp(bytes) : null;
  return found && found.width > 0 && found.height > 0 && found.width < 65536 && found.height < 65536 ? found : null;
}
