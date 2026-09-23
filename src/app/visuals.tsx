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
 * Every other card sits lower on wide screens so the row reads as a layout
 * rather than a table of thumbnails.
 */
/** Repeating rhythm of shapes: tall, square, short. */
const ASPECTS = ["aspect-[4/5]", "aspect-square", "aspect-[5/4]"] as const;

export default function Visuals({ items, fallbackImg }: { items: Visual[]; fallbackImg: string }) {
  if (items.length === 0) return null;

  return (
    <div className="mt-14 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-6">
      {items.map((v, i) => (
        <div key={v.title + i} className={i % 3 === 1 ? "lg:mt-10" : i % 3 === 2 ? "lg:mt-4" : ""}>
          <VisualCard
            visual={v}
            index={i + 1}
            aspect={ASPECTS[i % ASPECTS.length]}
            fallbackImg={i === 0 ? fallbackImg : null}
          />
        </div>
      ))}
    </div>
  );
}

function VisualCard({
  visual, index, aspect, fallbackImg,
}: {
  visual: Visual;
  index: number;
  aspect: string;
  fallbackImg: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const kind = visualKind(visual);
  const poster = visualPoster(visual) ?? fallbackImg;
  const meta = [visual.year, kind === "image" ? null : visual.duration]
    .filter(Boolean)
    .join(" \u00b7 ");

  const frame = `group relative block w-full ${aspect} overflow-hidden rounded-sm bg-steel`;

  // Hosted video: swap the still for a real player in place.
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
          className="absolute inset-0 size-full object-cover opacity-70 saturate-[0.65] transition-all duration-[900ms] ease-out group-hover:scale-[1.07] group-hover:opacity-100 group-hover:saturate-100"
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-[900ms] group-hover:scale-105"
          style={{ background: "linear-gradient(160deg, #0c1419 0%, #16242c 50%, #c8b27f 140%)" }}
        />
      )}

      {/* Deep at the base so the type stays readable over any image. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/45 to-ink/10 transition-opacity duration-700 group-hover:via-ink/30" />

      {/* Hairline that lights up on hover. */}
      <div className="absolute inset-0 rounded-sm ring-1 ring-inset ring-cream/10 transition duration-500 group-hover:ring-cream/35" />

      {/* Oversized index, echoing the numbered section labels. */}
      <span
        aria-hidden
        className="absolute left-5 top-3 font-display text-5xl leading-none text-cream/10 transition-colors duration-500 group-hover:text-gold/25"
      >
        {String(index).padStart(2, "0")}
      </span>

      {kind !== "image" && (
        <div className="absolute right-5 top-5 flex size-12 items-center justify-center rounded-full border border-cream/25 bg-ink/30 backdrop-blur-sm transition duration-500 group-hover:scale-110 group-hover:border-cream group-hover:bg-cream">
          {kind === "external" ? (
            <ArrowUpRight className="size-4 text-cream transition group-hover:text-ink" />
          ) : (
            <Play className="size-4 fill-cream text-cream transition group-hover:fill-ink group-hover:text-ink" />
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-5">
        {/* Rule sweeps out from the left on hover. */}
        <span className="block h-px w-0 bg-gold/70 transition-all duration-700 ease-out group-hover:w-14" />
        <h3 className="mt-3 font-display text-2xl font-medium lowercase leading-none text-cream transition-transform duration-500 ease-out group-hover:-translate-y-0.5">
          {visual.title}
        </h3>
        {meta && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.4em] text-cream-dim transition-colors duration-500 group-hover:text-cream/80">
            {meta}
          </p>
        )}
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
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`play ${visual.title}`}
        className={`${frame} text-left`}
      >
        {body}
      </button>
    );
  }

  // A photo is not interactive: no link, no button, no play badge.
  return <figure className={frame}>{body}</figure>;
}
