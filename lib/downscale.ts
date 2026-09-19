/**
 * Longest edge we send for OCR. A phone camera shoots 4000px and 4-8 MB, almost
 * all of which is spent on detail Vision doesn't use — the upload is the single
 * biggest part of the wait on a phone. 2048px keeps small print comfortably
 * legible while cutting the file by roughly an order of magnitude.
 */
const MAX_EDGE = 2048;
const QUALITY = 0.85;

/**
 * Shrink a camera photo before uploading it.
 *
 * Every failure path returns the original file rather than throwing: a scan that
 * is slow is much better than a scan that doesn't happen, so nothing here is
 * allowed to be fatal.
 */
export const downscaleImage = async (file: File): Promise<File> => {
  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);

    if (longest <= MAX_EDGE) {
      bitmap.close();
      return file;
    }

    const scale = MAX_EDGE / longest;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );

    return blob ? new File([blob], "label.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
};
