"use client";

import { useState } from "react";
import { Play, ArrowUpRight } from "lucide-react";
import { visualKind, visualPoster, type VisualLike } from "@/lib/media";

export type Visual = VisualLike & {
  title: string;
  year: string | null;
  duration: string | null;
};

/**
 * The visuals grid renders three different things:
 *
 *   photo     a still, with no play affordance and nothing to click
 *   file      a hosted video, played inline where it sits
 *   external  a YouTube/Vimeo link, opened in a new tab
 *
 * Previously every row was drawn as a video, so a photo showed a play button
 * that linked nowhere.
 */
export default function Visuals({ items, fallbackImg }: { items: Visual[]; fallbackImg: string }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-16 grid gap-6 md:grid-cols-3">
      {items.map((v, i) => (
        <VisualCard key={v.title + i} visual={v} fallbackImg={i === 0 ? fallbackImg : null} />
      ))}
    </div>
  );
}

function VisualCard({ visual, fallbackImg }: { visual: Visual; fallbackImg: string | null }) {
  const [playing, setPlaying] = useState(false);
  const kind = visualKind(visual);
  const poster = visualPoster(visual) ?? fallbackImg;
  const meta = [visual.year, visual.duration].filter(Boolean).join(" · ");

  const frame = "group relative aspect-[4/5] overflow-hidden rounded-sm bg-steel";

  // Hosted video: swap the still for a real player on click.
  if (kind === "file" && playing) {
    return (
      <div className={frame}>
        <video
          src={visual.video_url!}
          poster={poster ?? undefined}
          controls
          autoPlay
          playsInline
          className="absolute inset-0 size-full bg-ink object-cover"
        />
      </div>
    );
  }

  const body = (
    <>
      {poster ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={poster}
          alt={visual.title}
          className="absolute inset-0 size-full object-cover opacity-80 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
          style={{ background: "linear-gradient(160deg, #0c1419 0%, #16242c 50%, #c8b27f 140%)" }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />

      {/* Only offer play when there is something to play. */}
      {kind !== "image" && (
        <div className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-full border border-cream/30 backdrop-blur-sm transition group-hover:border-cream group-hover:bg-cream">
          {kind === "external" ? (
            <ArrowUpRight className="size-4 text-cream transition group-hover:text-ink" />
          ) : (
            <Play className="size-4 fill-cream text-cream transition group-hover:fill-ink group-hover:text-ink" />
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-6">
        {meta && (
          <p className="text-[10px] uppercase tracking-[0.4em] text-cream-dim">{meta}</p>
        )}
        <h3 className="mt-2 font-display text-3xl font-medium lowercase text-cream">
          {visual.title}
        </h3>
      </div>
    </>
  );

  if (kind === "external") {
    return (
      <a href={visual.video_url!} target="_blank" rel="noopener noreferrer" className={frame}>
        {body}
      </a>
    );
  }

  if (kind === "file") {
    return (
      <button type="button" onClick={() => setPlaying(true)} aria-label={`play ${visual.title}`} className={`${frame} text-left`}>
        {body}
      </button>
    );
  }

  // A photo is not interactive: no link, no button, no play badge.
  return <figure className={frame}>{body}</figure>;
}
