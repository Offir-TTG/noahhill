"use server";

import { createClient } from "@/lib/supabase/server";
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

  let video_url: string | null = externalVideoUrl;
  if (video && video.size > 0) video_url = await uploadFile("videos", video);

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

  const updates: Record<string, unknown> = { title, year, duration, sort_order };
  if (thumb && thumb.size > 0) updates.thumbnail_url = await uploadFile("images", thumb);
  if (video && video.size > 0) updates.video_url = await uploadFile("videos", video);
  else if (externalVideoUrl) updates.video_url = externalVideoUrl;

  const { error } = await supabase.from("videos").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/videos");
  revalidatePath("/");
}

export async function deleteVideo(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/videos");
  revalidatePath("/");
}
