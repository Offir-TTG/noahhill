"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SiteContent } from "@/lib/site-content";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "image";

async function uploadImage(file: File): Promise<string> {
  const supabase = await createClient();
  const ext  = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
}

export async function saveSiteContent(
  content: SiteContent,
  uploads: { hero?: File | null; single?: File | null; about?: File | null },
) {
  const supabase = await createClient();

  if (uploads.hero   && uploads.hero.size   > 0) content.hero.photo_url    = await uploadImage(uploads.hero);
  if (uploads.single && uploads.single.size > 0) content.single.cover_url  = await uploadImage(uploads.single);
  if (uploads.about  && uploads.about.size  > 0) content.about.portrait_url = await uploadImage(uploads.about);

  const { error } = await supabase
    .from("site_content")
    .upsert({ id: 1, data: content }, { onConflict: "id" });

  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/admin/sections");
}
