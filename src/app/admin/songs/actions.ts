"use server";

import { createClient } from "@/lib/supabase/server";
import { removeStorageFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

type SongInput = {
  title: string;
  year: string | null;
  duration: string | null;
  sort_order: number;
  audio_url?: string | null;   // pre-uploaded by the browser
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
  };

  const { error } = await supabase.from("songs").insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/songs");
  revalidatePath("/");
}

export async function updateSong(id: string, input: SongInput) {
  const supabase = await createClient();
  if (!input.title?.trim()) throw new Error("Title is required.");

  // Capture the previous audio URL so we can clean up the old file when it's replaced.
  let previousAudioUrl: string | null = null;
  if (input.audio_url) {
    const { data: existing } = await supabase
      .from("songs")
      .select("audio_url")
      .eq("id", id)
      .maybeSingle();
    previousAudioUrl = existing?.audio_url ?? null;
  }

  const updates: Record<string, unknown> = {
    title: input.title.trim(),
    year: input.year?.trim() || null,
    duration: input.duration?.trim() || null,
    sort_order: input.sort_order || 0,
  };
  if (input.audio_url) updates.audio_url = input.audio_url;

  const { error } = await supabase.from("songs").update(updates).eq("id", id);
  if (error) throw new Error(error.message);

  // Replace happened — drop the orphaned old file.
  if (previousAudioUrl && previousAudioUrl !== input.audio_url) {
    await removeStorageFile(previousAudioUrl);
  }

  revalidatePath("/admin/songs");
  revalidatePath("/");
}

export async function deleteSong(id: string) {
  const supabase = await createClient();

  // Read audio URL before deleting the row so we know what to remove from storage.
  const { data: existing } = await supabase
    .from("songs")
    .select("audio_url")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("songs").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Best-effort cleanup of the audio file in storage.
  await removeStorageFile(existing?.audio_url);

  revalidatePath("/admin/songs");
  revalidatePath("/");
}
