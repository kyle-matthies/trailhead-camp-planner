import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Camera,
  CheckSquare,
  CornerDownRight,
  Download,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Maximize2,
  MessageSquare,
  Save,
  Send,
  Share2,
  Smartphone,
  Square,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/useAuth";
import { useTrip } from "@/context/useTrip";
import { useBoardPresence } from "@/hooks/useBoardPresence";
import { useTripRealtime } from "@/hooks/useTripRealtime";
import { PageSpinner } from "@/components/ui/Spinner";
import PermissionGate from "@/components/ui/PermissionGate";
import CamperAvatar from "@/components/ui/CamperAvatar";
import { typingSummary } from "@/lib/boardPresence";
import {
  deleteBoardPhoto,
  downloadPhoto,
  downloadPhotoZip,
  formatFileSize,
  MAX_PHOTOS_PER_POST,
  signBoardPhotos,
  sharePhotoFiles,
  uploadBoardPhotos,
  validatePhotoFiles,
  type SignedBoardPhoto,
  type UploadProgress,
} from "@/lib/photos";
import { roleAtLeast, type BoardPost, type BoardReply } from "@/lib/types";

/** Compact relative timestamp, falling back to a short date for older items. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function photoTakenLabel(photo: SignedBoardPhoto): string {
  const iso = photo.taken_at ?? photo.created_at;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function photoDimensions(photo: SignedBoardPhoto): string {
  return photo.width && photo.height ? `${photo.width} x ${photo.height}` : "";
}

function AttachedPhotoPreview({
  file,
  index,
  onRemove,
}: {
  file: File;
  index: number;
  onRemove: (index: number) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-white">
      <div className="aspect-square bg-stone-100">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={`Preview of ${file.name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-300">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-stone-600 shadow-sm hover:text-red-600"
        aria-label={`Remove ${file.name}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="truncate px-2 py-1 text-[11px] text-stone-500">{file.name}</p>
    </div>
  );
}

export default function TripBoard() {
  const { trip, tripId, myRole, nameFor } = useTrip();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [newPost, setNewPost] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [activePhoto, setActivePhoto] = useState<SignedBoardPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [photoAction, setPhotoAction] = useState<"download" | "share" | "zip" | null>(null);

  // Keep posts, replies, and photos live for everyone viewing the board.
  useTripRealtime(tripId, ["board_posts", "board_replies", "board_photos"]);
  const presence = useBoardPresence({
    tripId,
    userId: user?.id,
    name: nameFor(user?.id),
    typing: isTyping,
  });
  const typingText = typingSummary(presence, user?.id);

  const canModerate = roleAtLeast(myRole, "counselor");

  const postsKey = ["trip", tripId, "board-posts"];
  const repliesKey = ["trip", tripId, "board-replies"];
  const photosKey = ["trip", tripId, "board-photos"];

  const postsQ = useQuery({
    queryKey: postsKey,
    queryFn: async (): Promise<BoardPost[]> => {
      const { data, error } = await supabase
        .from("board_posts")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const repliesQ = useQuery({
    queryKey: repliesKey,
    queryFn: async (): Promise<BoardReply[]> => {
      const { data, error } = await supabase
        .from("board_replies")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const photosQ = useQuery({
    queryKey: photosKey,
    queryFn: async (): Promise<SignedBoardPhoto[]> => {
      const { data, error } = await supabase
        .from("board_photos")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return signBoardPhotos(data ?? []);
    },
  });

  const createPost = useMutation({
    mutationFn: async ({ body, files }: { body: string; files: File[] }) => {
      const postBody = body.trim() || (files.length ? "Shared photos" : "");
      const { data, error } = await supabase
        .from("board_posts")
        .insert({ trip_id: tripId, author_id: user!.id, body: postBody })
        .select("id")
        .single();
      if (error) throw error;

      if (files.length > 0) {
        await uploadBoardPhotos({
          tripId,
          postId: data.id,
          userId: user!.id,
          files,
          caption: body.trim() || null,
          onProgress: setUploadProgress,
        });
      }
    },
    onSuccess: () => {
      setNewPost("");
      setAttachedFiles([]);
      setFileError(null);
      setUploadProgress(null);
      stopTyping();
      qc.invalidateQueries({ queryKey: postsKey });
      qc.invalidateQueries({ queryKey: photosKey });
    },
    onError: () => setUploadProgress(null),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_posts").delete().eq("id", id);
      if (error) throw error;
    },
    // Deleting a post cascades its replies/photos in the DB; refresh all lists.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postsKey });
      qc.invalidateQueries({ queryKey: repliesKey });
      qc.invalidateQueries({ queryKey: photosKey });
    },
  });

  const createReply = useMutation({
    mutationFn: async ({ postId, body }: { postId: string; body: string }) => {
      const { error } = await supabase
        .from("board_replies")
        .insert({ post_id: postId, trip_id: tripId, author_id: user!.id, body });
      if (error) throw error;
    },
    onSuccess: (_data, { postId }) => {
      setReplyDrafts((d) => ({ ...d, [postId]: "" }));
      stopTyping();
      qc.invalidateQueries({ queryKey: repliesKey });
    },
  });

  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("board_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: repliesKey }),
  });

  const deletePhoto = useMutation({
    mutationFn: deleteBoardPhoto,
    onSuccess: (_data, photo) => {
      setSelectedPhotoIds((ids) => {
        const next = new Set(ids);
        next.delete(photo.id);
        return next;
      });
      setActivePhoto((photoInLightbox) => (photoInLightbox?.id === photo.id ? null : photoInLightbox));
      qc.invalidateQueries({ queryKey: photosKey });
    },
  });

  const updatePhotoCaption = useMutation({
    mutationFn: async ({ photo, caption }: { photo: SignedBoardPhoto; caption: string }) => {
      const cleaned = caption.trim();
      const { data, error } = await supabase
        .from("board_photos")
        .update({ caption: cleaned || null })
        .eq("id", photo.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActivePhoto((photo) => (photo?.id === data.id ? { ...photo, ...data } : photo));
      qc.invalidateQueries({ queryKey: photosKey });
    },
  });

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    setCaptionDraft(activePhoto?.caption ?? "");
  }, [activePhoto?.caption, activePhoto?.id]);

  function stopTyping() {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
    setIsTyping(false);
  }

  function markTyping(value: string) {
    if (!value.trim()) {
      stopTyping();
      return;
    }
    setIsTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setIsTyping(false), 2500);
  }

  function addFiles(files: File[]) {
    const combined = [...attachedFiles, ...files];
    const next = combined.slice(0, MAX_PHOTOS_PER_POST);
    const validation = validatePhotoFiles(next);
    if (validation) {
      setFileError(validation);
      return;
    }
    setAttachedFiles(next);
    setFileError(combined.length > MAX_PHOTOS_PER_POST ? `Attach up to ${MAX_PHOTOS_PER_POST} photos.` : null);
  }

  function removeAttachedFile(index: number) {
    setAttachedFiles((files) => files.filter((_, i) => i !== index));
    setFileError(null);
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotoIds((ids) => {
      const next = new Set(ids);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function exportZip(photos: SignedBoardPhoto[]) {
    if (photos.length === 0 || photoAction) return;
    setExportMessage(null);
    setPhotoAction("zip");
    try {
      await downloadPhotoZip(photos, trip?.name ?? "camp");
      setExportMessage(`${photos.length} ${photos.length === 1 ? "photo" : "photos"} prepared as a ZIP.`);
    } finally {
      setPhotoAction(null);
    }
  }

  async function shareToPhone(photos: SignedBoardPhoto[]) {
    if (photos.length === 0 || photoAction) return;
    setExportMessage(null);
    setPhotoAction("share");
    try {
      const shared = await sharePhotoFiles(photos);
      if (shared) {
        setExportMessage("Native share sheet opened. On iPhone, choose Save Image or Save to Photos.");
        return;
      }
      await downloadPhotoZip(photos, trip?.name ?? "camp");
      setExportMessage(
        "This browser cannot hand photos directly to the iPhone Photos picker, so a ZIP download was prepared."
      );
    } finally {
      setPhotoAction(null);
    }
  }

  async function downloadSinglePhoto(photo: SignedBoardPhoto) {
    if (photoAction) return;
    setExportMessage(null);
    setPhotoAction("download");
    try {
      await downloadPhoto(photo);
      setExportMessage("Photo download prepared.");
    } finally {
      setPhotoAction(null);
    }
  }

  const posts = postsQ.data ?? [];
  const replies = repliesQ.data ?? [];
  const photos = useMemo(() => photosQ.data ?? [], [photosQ.data]);

  const photosByPost = useMemo(() => {
    const byPost = new Map<string, SignedBoardPhoto[]>();
    for (const photo of photos) {
      if (!photo.post_id) continue;
      const current = byPost.get(photo.post_id) ?? [];
      current.push(photo);
      byPost.set(photo.post_id, current);
    }
    return byPost;
  }, [photos]);

  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedPhotoIds.has(photo.id)),
    [photos, selectedPhotoIds]
  );

  const loadError = postsQ.error || repliesQ.error || photosQ.error;
  const mutationError =
    (createPost.error as Error | null)?.message ||
    (createReply.error as Error | null)?.message ||
    (deletePost.error as Error | null)?.message ||
    (deleteReply.error as Error | null)?.message ||
    (deletePhoto.error as Error | null)?.message ||
    (updatePhotoCaption.error as Error | null)?.message ||
    null;

  if (postsQ.isLoading || repliesQ.isLoading || photosQ.isLoading) return <PageSpinner />;

  function canDeletePost(post: BoardPost) {
    return canModerate || post.author_id === user?.id;
  }
  function canDeleteReply(reply: BoardReply) {
    return canModerate || reply.author_id === user?.id;
  }
  function canDeletePhoto(photo: SignedBoardPhoto) {
    return canModerate || photo.uploaded_by === user?.id;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-forest-100 rounded-lg">
            <MessageSquare className="w-6 h-6 text-forest-600" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-stone-900">Camp Board</h1>
            <p className="text-sm text-stone-500">
              {posts.length} {posts.length === 1 ? "post" : "posts"} · {photos.length}{" "}
              {photos.length === 1 ? "photo" : "photos"} from the crew
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              {presence.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {presence.length} online
                </span>
              )}
              {typingText && (
                <span className="text-forest-600" aria-live="polite">
                  {typingText}
                </span>
              )}
            </div>
          </div>
        </div>

        {photos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedPhotoIds(new Set(photos.map((photo) => photo.id)))}
              disabled={!!photoAction}
              className="btn-outline px-3 py-2 text-sm"
            >
              <CheckSquare className="w-4 h-4 mr-1" />
              Select all
            </button>
            <button
              type="button"
              onClick={() => exportZip(selectedPhotos.length ? selectedPhotos : photos)}
              disabled={!!photoAction}
              className="btn-outline px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {photoAction === "zip" ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Archive className="w-4 h-4 mr-1" />
              )}
              Download {selectedPhotos.length || "all"}
            </button>
            <button
              type="button"
              onClick={() => shareToPhone(selectedPhotos.length ? selectedPhotos : photos)}
              disabled={!!photoAction}
              className="btn-primary px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {photoAction === "share" ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Smartphone className="w-4 h-4 mr-1" />
              )}
              Save to iPhone
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div className="card p-4 text-sm text-red-600">Failed to load the board.</div>
      )}
      {(mutationError || fileError) && (
        <div className="card p-4 text-sm text-red-600">{mutationError || fileError}</div>
      )}
      {exportMessage && (
        <div className="card p-4 text-sm text-forest-700 bg-forest-50 border-forest-100">
          {exportMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <main className="space-y-4">
          <PermissionGate role={myRole} min="cit">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const body = newPost.trim();
                if ((!body && attachedFiles.length === 0) || createPost.isPending) return;
                createPost.mutate({ body, files: attachedFiles });
              }}
              className="card p-4"
            >
              <textarea
                value={newPost}
                onChange={(e) => {
                  setNewPost(e.target.value);
                  markTyping(e.target.value);
                }}
                rows={3}
                placeholder="Share an update, then attach camp photos..."
                className="w-full resize-none px-3 py-2 border-2 border-stone-200 rounded-lg text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
              />

              <div
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                onDragOver={(e) => e.preventDefault()}
                className="mt-3 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50/70 p-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(Array.from(e.target.files ?? []));
                    e.currentTarget.value = "";
                  }}
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-forest-600 shadow-sm">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-900">Drop photos here</p>
                      <p className="text-xs text-stone-500">
                        JPG, PNG, WebP, HEIC · up to {MAX_PHOTOS_PER_POST} photos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-outline px-3 py-2 text-sm"
                  >
                    <ImagePlus className="w-4 h-4 mr-1" />
                    Attach
                  </button>
                </div>

                {attachedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {attachedFiles.map((file, index) => (
                      <AttachedPhotoPreview
                        key={`${file.name}-${file.lastModified}-${index}`}
                        file={file}
                        index={index}
                        onRemove={removeAttachedFile}
                      />
                    ))}
                  </div>
                )}
              </div>

              {uploadProgress && (
                <div className="mt-3 flex items-center gap-2 text-xs text-forest-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {uploadProgress.stage.replace("-", " ")} · {uploadProgress.fileName} (
                  {uploadProgress.index + 1}/{uploadProgress.total})
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={(!newPost.trim() && attachedFiles.length === 0) || createPost.isPending}
                  className="btn-primary px-5 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createPost.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : attachedFiles.length ? (
                    <Camera className="w-4 h-4 mr-1" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  {attachedFiles.length ? "Share photos" : "Post"}
                </button>
              </div>
            </form>
          </PermissionGate>

          {posts.length === 0 ? (
            <div className="card p-12 text-center">
              <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-sm text-stone-500">No posts yet. Share the first camp update.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const postReplies = replies.filter((r) => r.post_id === post.id);
                const postPhotos = photosByPost.get(post.id) ?? [];
                const authorName = nameFor(post.author_id);
                const draft = replyDrafts[post.id] ?? "";
                return (
                  <article key={post.id} className="card p-4">
                    <header className="flex items-start gap-3">
                      <CamperAvatar name={authorName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-stone-900 truncate">{authorName}</span>
                          <span className="text-xs text-stone-400 whitespace-nowrap">
                            {timeAgo(post.created_at)}
                            {post.edited ? " · edited" : ""}
                          </span>
                        </div>
                      </div>
                      {canDeletePost(post) && (
                        <button
                          type="button"
                          onClick={() => deletePost.mutate(post.id)}
                          disabled={deletePost.isPending}
                          className="p-1.5 -mr-1 hover:bg-red-50 rounded-lg text-stone-400 hover:text-red-600 disabled:opacity-50"
                          aria-label="Delete post"
                          title="Delete post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </header>

                    <p className="mt-2 text-sm text-stone-700 whitespace-pre-wrap break-words">
                      {post.body}
                    </p>

                    {postPhotos.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {postPhotos.slice(0, 6).map((photo) => (
                          <button
                            type="button"
                            key={photo.id}
                            onClick={() => setActivePhoto(photo)}
                            className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100 text-left"
                          >
                            {photo.displayUrl ? (
                              <img
                                src={photo.displayUrl}
                                alt={photo.caption || photo.original_name || "Camp photo"}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-stone-300">
                                <ImageIcon className="w-8 h-8" />
                              </div>
                            )}
                            <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                              Open
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {postReplies.length > 0 && (
                      <div className="mt-4 space-y-3 border-l-2 border-stone-100 pl-4">
                        {postReplies.map((reply) => {
                          const replyName = nameFor(reply.author_id);
                          return (
                            <div key={reply.id} className="flex items-start gap-2.5 group">
                              <CamperAvatar name={replyName} className="w-6 h-6 text-[10px]" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-stone-800 truncate">
                                    {replyName}
                                  </span>
                                  <span className="text-xs text-stone-400 whitespace-nowrap">
                                    {timeAgo(reply.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-stone-600 whitespace-pre-wrap break-words">
                                  {reply.body}
                                </p>
                              </div>
                              {canDeleteReply(reply) && (
                                <button
                                  type="button"
                                  onClick={() => deleteReply.mutate(reply.id)}
                                  disabled={deleteReply.isPending}
                                  className="p-1 hover:bg-red-50 rounded-lg text-stone-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                                  aria-label="Delete reply"
                                  title="Delete reply"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <PermissionGate role={myRole} min="cit">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const body = draft.trim();
                          if (!body || createReply.isPending) return;
                          createReply.mutate({ postId: post.id, body });
                        }}
                        className="mt-3 flex items-center gap-2"
                      >
                        <CornerDownRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                        <input
                          value={draft}
                          onChange={(e) => {
                            setReplyDrafts((d) => ({ ...d, [post.id]: e.target.value }));
                            markTyping(e.target.value);
                          }}
                          placeholder="Reply..."
                          className="flex-1 px-3 py-1.5 border-2 border-stone-200 rounded-lg text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                        />
                        <button
                          type="submit"
                          disabled={!draft.trim() || createReply.isPending}
                          className="btn-outline px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reply
                        </button>
                      </form>
                    </PermissionGate>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        <aside className="space-y-4">
          <section className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading font-semibold text-stone-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-forest-600" />
                  Photo roll
                </h2>
                <p className="text-xs text-stone-500">
                  Select photos for ZIP export or iPhone sharing.
                </p>
              </div>
              {selectedPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIds(new Set())}
                  className="text-xs font-medium text-stone-500 hover:text-stone-900"
                >
                  Clear
                </button>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="mt-4 rounded-lg bg-stone-50 p-6 text-center">
                <ImageIcon className="mx-auto h-9 w-9 text-stone-300" />
                <p className="mt-2 text-sm text-stone-500">No camp photos yet.</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {photos.map((photo) => {
                  const selected = selectedPhotoIds.has(photo.id);
                  return (
                    <div key={photo.id} className="group relative overflow-hidden rounded-lg bg-stone-100">
                      <button
                        type="button"
                        onClick={() => setActivePhoto(photo)}
                        className="block aspect-square w-full"
                        aria-label={`Open ${photo.original_name ?? "photo"}`}
                      >
                        {photo.displayUrl ? (
                          <img
                            src={photo.displayUrl}
                            alt={photo.caption || photo.original_name || "Camp photo"}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-stone-300">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePhotoSelection(photo.id)}
                        className="absolute left-1.5 top-1.5 rounded bg-white/90 p-1 text-forest-700 shadow-sm"
                        aria-label={selected ? "Deselect photo" : "Select photo"}
                      >
                        {selected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivePhoto(photo)}
                        className="absolute right-1.5 top-1.5 rounded bg-white/90 p-1 text-stone-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                        aria-label="Preview photo"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-5 text-[11px] text-white">
                        <p className="truncate">{nameFor(photo.uploaded_by)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedPhotos.length > 0 && (
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => exportZip(selectedPhotos)}
                  disabled={!!photoAction}
                  className="btn-outline justify-center px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {photoAction === "zip" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4 mr-1" />
                  )}
                  ZIP selected ({selectedPhotos.length})
                </button>
                <button
                  type="button"
                  onClick={() => shareToPhone(selectedPhotos)}
                  disabled={!!photoAction}
                  className="btn-primary justify-center px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {photoAction === "share" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Smartphone className="w-4 h-4 mr-1" />
                  )}
                  Share to iPhone
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>

      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {activePhoto.original_name ?? "Camp photo"}
                </p>
                <p className="text-xs text-stone-500">
                  {nameFor(activePhoto.uploaded_by)} · {photoTakenLabel(activePhoto)}
                  {photoDimensions(activePhoto) ? ` · ${photoDimensions(activePhoto)}` : ""}
                  {activePhoto.size_bytes ? ` · ${formatFileSize(activePhoto.size_bytes)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                aria-label="Close photo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-57px)] lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex min-h-[320px] items-center justify-center bg-stone-950">
                {activePhoto.fullUrl ?? activePhoto.displayUrl ? (
                  <img
                    src={activePhoto.fullUrl ?? activePhoto.displayUrl ?? ""}
                    alt={activePhoto.caption || activePhoto.original_name || "Camp photo"}
                    className="max-h-[calc(92vh-90px)] w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-16 w-16 text-stone-600" />
                )}
              </div>

              <div className="space-y-3 overflow-y-auto p-4">
                {canDeletePhoto(activePhoto) ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      updatePhotoCaption.mutate({ photo: activePhoto, caption: captionDraft });
                    }}
                    className="rounded-lg bg-stone-50 p-3"
                  >
                    <label htmlFor="photo-caption" className="text-xs font-medium text-stone-500">
                      Caption
                    </label>
                    <textarea
                      id="photo-caption"
                      value={captionDraft}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      rows={3}
                      maxLength={220}
                      placeholder="Add a caption..."
                      className="mt-1 w-full resize-none rounded-lg border-2 border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                    />
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-stone-400">{captionDraft.length}/220</span>
                      <button
                        type="submit"
                        disabled={
                          updatePhotoCaption.isPending ||
                          captionDraft.trim() === (activePhoto.caption ?? "").trim()
                        }
                        className="btn-outline px-3 py-1.5 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updatePhotoCaption.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5 mr-1" />
                        )}
                        Save caption
                      </button>
                    </div>
                  </form>
                ) : activePhoto.caption ? (
                  <p className="rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
                    {activePhoto.caption}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => downloadSinglePhoto(activePhoto)}
                  disabled={!!photoAction}
                  className="btn-outline w-full justify-center px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {photoAction === "download" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  Download photo
                </button>
                <button
                  type="button"
                  onClick={() => shareToPhone([activePhoto])}
                  disabled={!!photoAction}
                  className="btn-primary w-full justify-center px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {photoAction === "share" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-1" />
                  )}
                  Save / share
                </button>
                <button
                  type="button"
                  onClick={() => exportZip([activePhoto])}
                  disabled={!!photoAction}
                  className="btn-outline w-full justify-center px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {photoAction === "zip" ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Archive className="w-4 h-4 mr-1" />
                  )}
                  ZIP this photo
                </button>
                {canDeletePhoto(activePhoto) && (
                  <button
                    type="button"
                    onClick={() => deletePhoto.mutate(activePhoto)}
                    disabled={deletePhoto.isPending}
                    className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1 inline" />
                    Delete photo
                  </button>
                )}
                <div className="rounded-lg bg-sand-50 p-3 text-xs text-stone-600">
                  On iPhone, the share sheet can save individual images directly to
                  Photos when the browser supports file sharing. Batch exports fall back
                  to a ZIP file when native multi-file sharing is unavailable.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
