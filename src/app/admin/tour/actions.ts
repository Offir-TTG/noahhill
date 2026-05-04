"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function read(formData: FormData) {
  const show_date  = String(formData.get("show_date") ?? "").trim();
  const city       = String(formData.get("city")      ?? "").trim();
  const venue      = String(formData.get("venue")     ?? "").trim() || null;
  const country    = String(formData.get("country")   ?? "").trim() || null;
  const ticket_url = String(formData.get("ticket_url")?? "").trim() || null;
  const sort_order = Number(formData.get("sort_order") ?? 0) || 0;
  if (!show_date || !city) throw new Error("Date and city are required.");
  return { show_date, city, venue, country, ticket_url, sort_order };
}

export async function createTourDate(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("tour_dates").insert(read(formData));
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tour");
  revalidatePath("/");
}

export async function updateTourDate(id: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("tour_dates").update(read(formData)).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tour");
  revalidatePath("/");
}

export async function deleteTourDate(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tour_dates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/tour");
  revalidatePath("/");
}
