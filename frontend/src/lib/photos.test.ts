import { describe, expect, it } from "vitest";
import {
  buildPhotoStoragePaths,
  cleanPhotoFileName,
  formatFileSize,
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTOS_PER_POST,
  photoDisplayName,
  validatePhotoFiles,
} from "./photos";

function file(name: string, type = "image/jpeg", size = 1024) {
  return new File([new Uint8Array(size)], name, { type });
}

describe("photo helpers", () => {
  it("builds owner-scoped private storage paths", () => {
    const paths = buildPhotoStoragePaths({
      tripId: "trip-1",
      userId: "user-1",
      photoId: "photo-1",
      file: file("Camp Fire.JPG", "image/jpeg"),
    });

    expect(paths.originalPath).toBe("trips/trip-1/board/user-1/photo-1/original.jpg");
    expect(paths.thumbnailPath).toBe("trips/trip-1/board/user-1/photo-1/thumb.webp");

    expect(
      buildPhotoStoragePaths({
        tripId: "trip-1",
        userId: "user-1",
        photoId: "photo-2",
        file: file("IMG 0001.HEIC", ""),
      }).originalPath
    ).toBe("trips/trip-1/board/user-1/photo-2/original.heic");
  });

  it("normalizes display-safe filenames", () => {
    expect(cleanPhotoFileName("  Camp Fire!!!.JPG")).toBe("camp-fire.jpg");
    expect(cleanPhotoFileName("IMG 0001.HEIC")).toBe("img-0001.heic");
    expect(cleanPhotoFileName("???")).toBe("camp-photo");
  });

  it("validates count, type, and size limits", () => {
    expect(validatePhotoFiles([file("lake.heic", "")])).toBeNull();
    expect(validatePhotoFiles([file("notes.txt", "text/plain")])).toContain("not a supported");
    expect(validatePhotoFiles([file("huge.jpg", "image/jpeg", MAX_PHOTO_SIZE_BYTES + 1)])).toContain(
      "larger than 25 MB"
    );
    expect(validatePhotoFiles(Array.from({ length: MAX_PHOTOS_PER_POST + 1 }, (_, i) => file(`${i}.jpg`)))).toContain(
      `Attach up to ${MAX_PHOTOS_PER_POST}`
    );
  });

  it("formats file size and fallback download names", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
    expect(
      photoDisplayName({
        id: "abcdef12-0000-4000-8000-000000000000",
        original_name: null,
        created_at: "2026-06-19T12:00:00Z",
      })
    ).toBe("camp-photo-2026-06-19-abcdef12.jpg");
  });
});
