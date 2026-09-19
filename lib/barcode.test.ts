import { describe, it, expect } from "vitest";
import { isProductBarcode } from "./barcode";

describe("isProductBarcode", () => {
  it("accepts real retail codes", () => {
    // Published GS1 examples: EAN-13, UPC-A, EAN-8, GTIN-14.
    expect(isProductBarcode("4006381333931")).toBe(true);
    expect(isProductBarcode("036000291452")).toBe(true);
    expect(isProductBarcode("96385074")).toBe(true);
    expect(isProductBarcode("10614141000415")).toBe(true);
  });

  it("rejects a wrong check digit", () => {
    // One digit off a valid code — this is what a half-covered barcode or a
    // neighbouring bottle on the shelf tends to produce.
    expect(isProductBarcode("4006381333932")).toBe(false);
    expect(isProductBarcode("036000291453")).toBe(false);
  });

  it("rejects anything that isn't a plain retail-length number", () => {
    expect(isProductBarcode("")).toBe(false);
    expect(isProductBarcode("400638133393")).toBe(false); // 12 digits, bad sum
    expect(isProductBarcode("40063813339")).toBe(false); // 11 digits, never valid
    expect(isProductBarcode("4006381 333931")).toBe(false);
    expect(isProductBarcode("HAIR-CARE-01")).toBe(false);
  });
});
