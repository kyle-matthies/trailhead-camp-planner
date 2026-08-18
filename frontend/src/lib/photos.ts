import JSZip from "jszip";
import { supabase } from "@/lib/supabase";
import type { BoardPhoto } from "@/lib/types";

export const PHOTO_BUCKET = "trip-photos";
export const MAX_PHOTOS_PER_POST = 12;
export const MAX_PHOTO_SIZE_BYTES = 25 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const SUPPORTED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "heic", "heif"]);

export interface SignedBoardPhoto extends BoardPhoto {
  displayUrl: string | null;
  fullUrl: string | null;
  thumbnailUrl: string | null;
}

export interface UploadProgress {
  fileName: string;
  index: number;
  total: number;
  stage: "thumbnail" | "original" | "thumbnail-upload" | "database" | "done";
}

export interface UploadBoardPhotosInput {
  tripId: string;
  postId: string;
  userId: string;
  files: File[];
  caption?: string | null;
  onProgress?: (progress: UploadProgress) => void;
}

interface ThumbnailResult {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

function extensionFromName(name: string): string | null {
  const ext = name.split(".").pop()?.toLowerCase();
  return ext && SUPPORTED_IMAGE_EXTENSIONS.has(ext) ? ext : null;
}

function extensionForFile(file: File): string {
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  if (file.type === "image/heif") return "heif";
  return extensionFromName(file.name) ?? "jpg";
}

function mimeTypeForFile(file: File): string {
  if (SUPPORTED_IMAGE_TYPES.has(file.type)) return file.type;

  switch (extensionFromName(file.name)) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

export function cleanPhotoFileName(name: string): string {
  const ext = extensionFromName(name);
  const stem = name
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${stem || "camp-photo"}${ext ? `.${ext}` : ""}`;
}

export function isSupportedPhotoFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type) || !!extensionFromName(file.name);
}

export function validatePhotoFiles(files: File[]): string | null {
  if (files.length > MAX_PHOTOS_PER_POST) {
    return `Attach up to ${MAX_PHOTOS_PER_POST} photos at once.`;
  }

  for (const file of files) {
    if (!isSupportedPhotoFile(file)) {
      return `${file.name} is not a supported image file.`;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      return `${file.name} is larger than 25 MB.`;
    }
  }

  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function photoDisplayName(photo: Pick<BoardPhoto, "original_name" | "created_at" | "id">): string {
  const day = new Date(photo.created_at).toISOString().slice(0, 10);
  if (!photo.original_name) return `camp-photo-${day}-${photo.id.slice(0, 8)}.jpg`;

  const base = cleanPhotoFileName(photo.original_name);
  if (base.includes(".")) return base;
  return `${base || `camp-photo-${day}-${photo.id.slice(0, 8)}`}.jpg`;
}

export function buildPhotoStoragePaths({
  tripId,
  userId,
  photoId,
  file,
}: {
  tripId: string;
  userId: string;
  photoId: string;
  file: File;
}) {
  const ext = extensionForFile(file);
  const root = `trips/${tripId}/board/${userId}/${photoId}`;
  return {
    originalPath: `${root}/original.${ext}`,
    thumbnailPath: `${root}/thumb.webp`,
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name} as an image.`));
    };
    image.src = url;
  });
}

async function blobFromCanvas(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
}

export async function createPhotoThumbnail(file: File, maxEdge = 960): Promise<ThumbnailResult | null> {
  if (typeof document === "undefined") return null;
  if (!isSupportedPhotoFile(file)) return null;

  const image = await loadImage(file);
  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;
  if (!originalWidth || !originalHeight) return null;

  const scale = Math.min(1, maxEdge / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(image, 0, 0, width, height);

  const webp = await blobFromCanvas(canvas, "image/webp", 0.82);
  if (webp) {
    return { blob: webp, mimeType: "image/webp", width, height, originalWidth, originalHeight };
  }

  const jpeg = await blobFromCanvas(canvas, "image/jpeg", 0.86);
  return jpeg
    ? { blob: jpeg, mimeType: "image/jpeg", width, height, originalWidth, originalHeight }
    : null;
}

export async function signBoardPhotos(
  photos: BoardPhoto[],
  expiresIn = 60 * 60
): Promise<SignedBoardPhoto[]> {
  const paths = Array.from(
    new Set(photos.flatMap((photo) => [photo.storage_path, photo.thumbnail_path]).filter(Boolean))
  ) as string[];

  if (paths.length === 0) {
    return photos.map((photo) => ({
      ...photo,
      displayUrl: null,
      fullUrl: null,
      thumbnailUrl: null,
    }));
  }

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(paths, expiresIn);
  if (error) throw error;

  const byPath = new Map((data ?? []).map((item) => [item.path, item.signedUrl]));
  return photos.map((photo) => {
    const thumbnailUrl = photo.thumbnail_path ? byPath.get(photo.thumbnail_path) ?? null : null;
    const fullUrl = byPath.get(photo.storage_path) ?? null;
    return {
      ...photo,
      thumbnailUrl,
      fullUrl,
      displayUrl: thumbnailUrl ?? fullUrl,
    };
  });
}

export async function uploadBoardPhotos({
  tripId,
  postId,
  userId,
  files,
  caption,
  onProgress,
}: UploadBoardPhotosInput): Promise<BoardPhoto[]> {
  const validation = validatePhotoFiles(files);
  if (validation) throw new Error(validation);

  const uploaded: BoardPhoto[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const photoId = crypto.randomUUID();
    const { originalPath, thumbnailPath } = buildPhotoStoragePaths({ tripId, userId, photoId, file });
    const mimeType = mimeTypeForFile(file);
    let storedThumbnailPath: string | null = null;
    const cleanupPaths: string[] = [];

    try {
      onProgress?.({ fileName: file.name, index, total: files.length, stage: "thumbnail" });
      const thumbnail = await createPhotoThumbnail(file).catch(() => null);

      onProgress?.({ fileName: file.name, index, total: files.length, stage: "original" });
      const originalUpload = await supabase.storage.from(PHOTO_BUCKET).upload(originalPath, file, {
        cacheControl: "31536000",
        contentType: mimeType,
        upsert: false,
      });
      if (originalUpload.error) throw originalUpload.error;
      cleanupPaths.push(originalPath);

      if (thumbnail) {
        onProgress?.({ fileName: file.name, index, total: files.length, stage: "thumbnail-upload" });
        const thumbUpload = await supabase.storage.from(PHOTO_BUCKET).upload(thumbnailPath, thumbnail.blob, {
          cacheControl: "31536000",
          contentType: thumbnail.mimeType,
          upsert: false,
        });
        if (thumbUpload.error) throw thumbUpload.error;
        cleanupPaths.push(thumbnailPath);
        storedThumbnailPath = thumbnailPath;
      }

      onProgress?.({ fileName: file.name, index, total: files.length, stage: "database" });
      const { data, error } = await supabase
        .from("board_photos")
        .insert({
          id: photoId,
          trip_id: tripId,
          post_id: postId,
          storage_path: originalPath,
          thumbnail_path: storedThumbnailPath,
          uploaded_by: userId,
          original_name: file.name,
          mime_type: mimeType,
          size_bytes: file.size,
          width: thumbnail?.originalWidth ?? null,
          height: thumbnail?.originalHeight ?? null,
          caption: caption || null,
          taken_at: file.lastModified ? new Date(file.lastModified).toISOString() : null,
          metadata: {
            cleaned_name: cleanPhotoFileName(file.name),
            thumbnail_mime_type: thumbnail?.mimeType ?? null,
            upload_source: "web",
          },
        })
        .select("*")
        .single();
      if (error) throw error;
      uploaded.push(data);
      onProgress?.({ fileName: file.name, index, total: files.length, stage: "done" });
    } catch (error) {
      if (cleanupPaths.length) {
        await supabase.storage.from(PHOTO_BUCKET).remove(cleanupPaths).catch(() => undefined);
      }
      throw error;
    }
  }

  return uploaded;
}

export async function deleteBoardPhoto(photo: BoardPhoto): Promise<void> {
  const { error } = await supabase.from("board_photos").delete().eq("id", photo.id);
  if (error) throw error;

  const paths = [photo.storage_path, photo.thumbnail_path].filter(Boolean) as string[];
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from(PHOTO_BUCKET).remove(paths);
    if (storageError) throw storageError;
  }
}

async function blobForSignedPhoto(photo: SignedBoardPhoto): Promise<Blob> {
  const url = photo.fullUrl ?? photo.displayUrl;
  if (!url) throw new Error(`No signed URL for ${photo.original_name ?? photo.id}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${photo.original_name ?? "photo"}`);
  return response.blob();
}

function browserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function downloadPhoto(photo: SignedBoardPhoto): Promise<void> {
  const blob = await blobForSignedPhoto(photo);
  browserDownload(blob, photoDisplayName(photo));
}

export async function buildPhotoFiles(photos: SignedBoardPhoto[]): Promise<File[]> {
  return Promise.all(
    photos.map(async (photo) => {
      const blob = await blobForSignedPhoto(photo);
      return new File([blob], photoDisplayName(photo), {
        type: photo.mime_type || blob.type || "image/jpeg",
        lastModified: photo.taken_at ? new Date(photo.taken_at).getTime() : Date.now(),
      });
    })
  );
}

export async function downloadPhotoZip(photos: SignedBoardPhoto[], tripName = "camp-photos") {
  if (photos.length === 0) return;

  const zip = new JSZip();
  const usedNames = new Set<string>();
  for (const photo of photos) {
    const blob = await blobForSignedPhoto(photo);
    const baseName = photoDisplayName(photo);
    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = baseName.replace(/(\.[^.]+)?$/, `-${suffix}$1`);
      suffix += 1;
    }
    usedNames.add(name);
    zip.file(name, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const cleanTrip = tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  browserDownload(zipBlob, `${cleanTrip || "camp"}-photos.zip`);
}

export function canSharePhotoFiles(files: File[]): boolean {
  return typeof navigator !== "undefined" && !!navigator.canShare?.({ files });
}

export async function sharePhotoFiles(photos: SignedBoardPhoto[]): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  const files = await buildPhotoFiles(photos);
  if (!navigator.canShare?.({ files })) return false;

  await navigator.share({
    files,
    title: photos.length === 1 ? "Camp photo" : "Camp photos",
    text:
      photos.length === 1
        ? "Save this camp photo to Photos."
        : "Save these camp photos to Photos or share them with the group.",
  });
  return true;
}
