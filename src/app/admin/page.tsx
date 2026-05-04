import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Music, Film, MapPin, FileText, ArrowRight, Users, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: songsCount },
    { count: videosCount },
    { count: tourCount },
    { count: subscribersCount },
    { count: campaignsCount },
  ] = await Promise.all([
    supabase.from("songs").select("*", { count: "exact", head: true }),
    supabase.from("videos").select("*", { count: "exact", head: true }),
    supabase.from("tour_dates").select("*", { count: "exact", head: true }),
    supabase.from("subscribers").select("*", { count: "exact", head: true }),
    supabase.from("email_campaigns").select("*", { count: "exact", head: true }),
  ]);

  const tiles = [
    { href: "/admin/sections",    label: "sections",    desc: "edit hero, single, about, marquee, footer", icon: FileText, count: undefined        },
    { href: "/admin/songs",       label: "songs",       desc: "tracks with audio uploads",                  icon: Music,    count: songsCount       },
    { href: "/admin/videos",      label: "visuals",     desc: "music videos and visuals",                   icon: Film,     count: videosCount      },
    { href: "/admin/tour",        label: "tour",        desc: "show dates and ticket links",                icon: MapPin,   count: tourCount        },
    { href: "/admin/subscribers", label: "subscribers", desc: "newsletter signups · export csv",            icon: Users,    count: subscribersCount },
    { href: "/admin/messaging",   label: "messaging",   desc: "compose emails to your subscribers",         icon: Mail,     count: campaignsCount   },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display lowercase text-cream text-3xl sm:text-4xl">dashboard</h1>
        <p className="mt-2 text-sm text-cream-dim">manage every section of the public site.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {tiles.map(({ href, label, desc, icon: Icon, count }, i) => {
          const index = (i + 1).toString().padStart(2, "0");
          const descWithCount =
            typeof count === "number" ? `${desc} · ${count} item${count === 1 ? "" : "s"}` : desc;
          return (
            <Link
              key={href}
              href={href}
              className="group flex flex-col justify-between rounded-sm border border-white/10 bg-steel/30 hover:bg-steel/60 hover:border-cream/30 transition p-6 min-h-40"
            >
              <div className="flex items-start justify-between">
                <Icon className="size-5 text-cream-dim group-hover:text-cream transition" />
                <span className="font-display text-cream text-2xl tracking-[0.1em]">{index}</span>
              </div>
              <div className="mt-4">
                <p className="font-display lowercase text-cream text-2xl">{label}</p>
                <p className="text-xs text-cream-dim mt-1">{descWithCount}</p>
              </div>
              <span className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-cream-dim group-hover:text-cream transition">
                open
                <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
