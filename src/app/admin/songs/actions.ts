"use server";

import { createClient } from "@/lib/supabase/server";
import { removeStorageFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

type SongInput = {
  title: string;
  year: string | null;
  duration: string | null;
  sort_order: number;
  /** Pre-uploaded by the browser. undefined = keep existing, null = explicit clear. */
  audio_url?: string | null;
  cover_url?: string | null;
};

export async function createSong(input: SongInput) {
  const supabase = await createClient();
  if (!input.title?.trim()) throw new Error("Title is required.");

  const row = {
    title: input.title.trim(),
    year: input.year?.trim() || null,
    duration: input.duration?.trim() || null,
    sort_order: input.sort_order || 0,
    audio_url: input.audio_url || null,
    cover_url: input.cover_url || null,
  };

  const { error } = await supabase.from("songs").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/songs");
  revalidatePath("/");
}

export async function updateSong(id: string, input: SongInput) {
  const supabase = await createClient();
  if (!input.title?.trim()) throw new Error("Title is required.");

  // Capture previous URLs so we can clean up replaced files.
  const { data: previous } = await supabase
    .from("songs")
    .select("audio_url, cover_url")
    .eq("id", id)
    .maybeSingle();

  const updates: Record<string, unknown> = {
    title: input.title.trim(),
    year: input.year?.trim() || null,
    duration: input.duration?.trim() || null,
    sort_order: input.sort_order || 0,
  };
  if (input.audio_url) updates.audio_url = input.audio_url;
  if (input.cover_url) updates.cover_url = input.cover_url;

  const { error } = await supabase.from("songs").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  // Drop the orphaned files when replaced.
  if (input.audio_url && previous?.audio_url && previous.audio_url !== input.audio_url) {
    await removeStorageFile(previous.audio_url);
  }
  if (input.cover_url && previous?.cover_url && previous.cover_url !== input.cover_url) {
    await removeStorageFile(previous.cover_url);
  }

  revalidatePath("/admin/songs");
  revalidatePath("/");
}

export async function deleteSong(id: string) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("songs")
    .select("audio_url, cover_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await removeStorageFile(existing?.audio_url);
  await removeStorageFile(existing?.cover_url);

  revalidatePath("/admin/songs");
  revalidatePath("/");
}
