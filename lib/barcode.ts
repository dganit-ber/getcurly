/**
 * Barcode decoding, on the device.
 *
 * Nothing here touches the network. A barcode resolves in milliseconds from the
 * camera stream, which is most of why this path is worth building — no upload,
 * no Vision call, no cost, and an answer before she's finished lining it up.
 *
 * Two readers behind one function: the browser's own `BarcodeDetector` where it
 * exists (Android Chrome), and zxing-wasm everywhere else (iOS Safari, which has
 * no native detector). The wasm is only fetched when it's actually needed.
 */

/** What we look for. Retail barcodes on a bottle are one of these four. */
const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"] as const;

/** The same four, spelled the way zxing wants them. */
const ZXING_FORMATS = ["EAN-13", "EAN-8", "UPC-A", "UPC-E"] as const;

interface NativeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

interface NativeDetectorCtor {
  new (options: { formats: readonly string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

/**
 * The GS1 check digit.
 *
 * A camera pointed at a shelf will happily decode a neighbouring bottle, a
 * half-covered code or a stripe of packaging text. The checksum costs nothing
 * and throws almost all of that away before it becomes a database lookup and a
 * page of confident-looking wrong answers.
 */
export const isProductBarcode = (value: string): boolean => {
  if (!/^\d+$/.test(value)) return false;
  if (![8, 12, 13, 14].includes(value.length)) return false;

  const digits = [...value].map(Number);
  const check = digits.pop() as number;

  // Weights alternate 3/1 from the right, whatever the length.
  const sum = digits
    .reverse()
    .reduce((total, digit, i) => total + digit * (i % 2 === 0 ? 3 : 1), 0);

  return (10 - (sum % 10)) % 10 === check;
};

/** Reads one video frame. Returns null when there's nothing in it yet. */
export type FrameReader = (video: HTMLVideoElement) => Promise<string | null>;

const nativeReader = (): FrameReader | null => {
  const ctor = (window as unknown as { BarcodeDetector?: NativeDetectorCtor })
    .BarcodeDetector;
  if (!ctor) return null;

  const detector = new ctor({ formats: FORMATS });

  return async (video) => {
    const found = await detector.detect(video).catch(() => []);
    return found[0]?.rawValue ?? null;
  };
};

const wasmReader = async (): Promise<FrameReader> => {
  const { readBarcodes, prepareZXingModule } = await import("zxing-wasm/reader");

  // Serve the binary ourselves. Left to itself the module reaches for a CDN,
  // which is a third party in the middle of the one path that is meant to work
  // with no network at all.
  prepareZXingModule({
    overrides: { locateFile: (path: string) => `/${path}` },
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  return async (video) => {
    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height) return null;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);

    const found = await readBarcodes(frame, {
      formats: [...ZXING_FORMATS],
      tryHarder: true,
    }).catch(() => []);

    return found.find((result) => result.isValid)?.text ?? null;
  };
};

/**
 * Pick a reader once, up front.
 *
 * Feature-detect rather than sniff the browser: `BarcodeDetector` exists on
 * Android Chrome, is absent on iOS Safari, and is present-but-useless on a
 * couple of desktop builds that support no retail formats — hence the second
 * check against the formats it actually claims.
 */
export const createFrameReader = async (): Promise<FrameReader> => {
  const native = nativeReader();
  if (!native) return wasmReader();

  const ctor = (window as unknown as { BarcodeDetector: NativeDetectorCtor })
    .BarcodeDetector;
  const supported = await ctor.getSupportedFormats?.().catch(() => []);
  if (supported && !supported.some((format) => FORMATS.includes(format as never))) {
    return wasmReader();
  }

  return native;
};
