import { LayoutGrid, Music, MapPin, Film, FileText, Users, Mail, Plug } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminLink = { href: string; label: string; icon: LucideIcon };

export const MAIN_LINKS: AdminLink[] = [
  { href: "/admin",             label: "dashboard",   icon: LayoutGrid },
  { href: "/admin/sections",    label: "sections",    icon: FileText  },
  { href: "/admin/songs",       label: "songs",       icon: Music     },
  { href: "/admin/videos",      label: "visuals",     icon: Film      },
  { href: "/admin/tour",        label: "tour",        icon: MapPin    },
  { href: "/admin/subscribers", label: "subscribers", icon: Users     },
  { href: "/admin/messaging",   label: "messaging",   icon: Mail      },
];

export const SETTINGS_LINKS: AdminLink[] = [
  { href: "/admin/connections", label: "connections", icon: Plug },
];
