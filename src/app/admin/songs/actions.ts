"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "track";

async function uploadAudio(file: File): Promise<string> {
  const supabase = await createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() || "wav";
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;

  const { error } = await supabase.storage.from("music").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from("music").getPublicUrl(path);
  return data.publicUrl;
}

export async function createSong(formData: FormData) {
  const supabase = await createClient();

  const title    = String(formData.get("title")    ?? "").trim();
  const year     = String(formData.get("year")     ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "").trim() || null;
  const sortRaw  = formData.get("sort_order");
  const sort_order = sortRaw ? Number(sortRaw) : 0;
  const audio = formData.get("audio") as File | null;

  if (!title) throw new Error("Title is required.");

  let audio_url: string | null = null;
  if (audio && audio.size > 0) audio_url = await uploadAudio(audio);

  const { error } = await supabase.from("songs").insert({ title, year, duration, audio_url, sort_order });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/songs");
  revalidatePath("/");
}

export async function updateSong(id: string, formData: FormData) {
  const supabase = await createClient();

  const title    = String(formData.get("title")    ?? "").trim();
  const year     = String(formData.get("year")     ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "").trim() || null;
  const sortRaw  = formData.get("sort_order");
  const sort_order = sortRaw ? Number(sortRaw) : 0;
  const audio = formData.get("audio") as File | null;

  if (!title) throw new Error("Title is required.");

  const updates: Record<string, unknown> = { title, year, duration, sort_order };
  if (audio && audio.size > 0) updates.audio_url = await uploadAudio(audio);

  const { error } = await supabase.from("songs").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/songs");
  revalidatePath("/");
}

export async function deleteSong(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/songs");
  revalidatePath("/");
}
