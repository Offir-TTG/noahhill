"use server";

import { createClient } from "@/lib/supabase/server";
import { removeStorageFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "video";

async function uploadFile(bucket: "images" | "videos", file: File): Promise<string> {
  const supabase = await createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export async function createVideo(formData: FormData) {
  const supabase = await createClient();
  const title    = String(formData.get("title")    ?? "").trim();
  const year     = String(formData.get("year")     ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0) || 0;
  const externalVideoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const thumb = formData.get("thumbnail") as File | null;
  const video = formData.get("video") as File | null;

  if (!title) throw new Error("Title is required.");

  let thumbnail_url: string | null = null;
  if (thumb && thumb.size > 0) thumbnail_url = await uploadFile("images", thumb);

  const kind = String(formData.get("kind") ?? "video");
  let video_url: string | null = kind === "photo" ? null : externalVideoUrl;
  if (kind !== "photo" && video && video.size > 0) video_url = await uploadFile("videos", video);

  const { error } = await supabase
    .from("videos")
    .insert({ title, year, duration, sort_order, thumbnail_url, video_url });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/videos");
  revalidatePath("/");
}

export async function updateVideo(id: string, formData: FormData) {
  const supabase = await createClient();
  const title    = String(formData.get("title")    ?? "").trim();
  const year     = String(formData.get("year")     ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0) || 0;
  const externalVideoUrl = String(formData.get("video_url") ?? "").trim() || null;
  const thumb = formData.get("thumbnail") as File | null;
  const video = formData.get("video") as File | null;

  if (!title) throw new Error("Title is required.");

  // Capture previous URLs so we can clean up replaced files.
  const { data: previous } = await supabase
    .from("videos")
    .select("thumbnail_url, video_url")
    .eq("id", id)
    .maybeSingle();

  const kind = String(formData.get("kind") ?? "video");
  const updates: Record<string, unknown> = { title, year, duration, sort_order };
  if (thumb && thumb.size > 0) updates.thumbnail_url = await uploadFile("images", thumb);

  if (kind === "photo") {
    // Switching a video to a photo has to null the column. Leaving it unset
    // would keep the old url and the row would still render as a video.
    updates.video_url = null;
  } else if (video && video.size > 0) {
    updates.video_url = await uploadFile("videos", video);
  } else if (externalVideoUrl) {
    updates.video_url = externalVideoUrl;
  }

  const { error } = await supabase.from("videos").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  // Drop the orphaned files when they were replaced.
  if (updates.thumbnail_url && previous?.thumbnail_url && previous.thumbnail_url !== updates.thumbnail_url) {
    await removeStorageFile(previous.thumbnail_url);
  }
  if ("video_url" in updates && previous?.video_url && previous.video_url !== updates.video_url) {
    await removeStorageFile(previous.video_url);
  }

  revalidatePath("/admin/videos");
  revalidatePath("/");
}

export async function deleteVideo(id: string) {
  const supabase = await createClient();

  // Read URLs first so we can clean up after the row is gone.
  const { data: existing } = await supabase
    .from("videos")
    .select("thumbnail_url, video_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await removeStorageFile(existing?.thumbnail_url);
  await removeStorageFile(existing?.video_url);

  revalidatePath("/admin/videos");
  revalidatePath("/");
}
