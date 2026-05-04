"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function deleteSubscriber(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subscribers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/subscribers");
}
