"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Disc3 } from "lucide-react";

export type Song = {
  title: string;
  year: string;
  duration: string;
  audio: string;
  cover?: string | null;
};

export default function SongList({ songs }: { songs: Song[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      if (a.duration) setProgress(a.currentTime / a.duration);
    };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = (idx: number) => {
    const a = audioRef.current;
    if (!a) return;
    const song = songs[idx];

    if (activeIdx === idx) {
      if (playing) { a.pause(); setPlaying(false); }
      else { a.play().then(() => setPlaying(true)).catch(() => {}); }
      return;
    }

    a.src = song.audio;
    a.currentTime = 0;
    setActiveIdx(idx);
    setProgress(0);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <>
      <ul className="mt-16 divide-y divide-white/10 border-y border-white/10">
        {songs.map((song, i) => {
          const isActive = activeIdx === i;
          const isPlayingThis = isActive && playing;
          return (
            <li key={song.title} className="group">
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`relative w-full text-left grid grid-cols-12 gap-3 sm:gap-4 items-center py-5 px-2 transition cursor-pointer ${
                  isActive ? "bg-cream/[0.04]" : "hover:bg-cream/5"
                }`}
              >
                {/* progress bar at bottom of active row */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 h-px bg-gold/80"
                    style={{ width: `${progress * 100}%` }}
                  />
                )}

                {/* track number / play indicator */}
                <span className="col-span-1 flex items-center font-display text-sm tracking-[0.2em]">
                  <span className={`inline-flex items-center justify-center transition ${
                    isActive ? "text-cream" : "text-cream-dim group-hover:text-cream"
                  }`}>
                    {isPlayingThis ? (
                      <Pause className="size-4 fill-current" />
                    ) : isActive ? (
                      <Play className="size-4 fill-current translate-x-[1px]" />
                    ) : (
                      <>
                        <span className="group-hover:hidden">{(i + 1).toString().padStart(2, "0")}</span>
                        <Play className="hidden group-hover:inline size-4 fill-current translate-x-[1px]" />
                      </>
                    )}
                  </span>
                </span>

                {/* 3D vinyl with cover art at center */}
                <span className="col-span-2 sm:col-span-1 flex items-center justify-center">
                  <Vinyl coverUrl={song.cover ?? null} spinning={isPlayingThis} />
                </span>

                {/* title */}
                <span className="col-span-4 sm:col-span-4 font-display lowercase text-cream text-xl sm:text-3xl truncate">
                  {song.title}
                </span>

                <span className="col-span-2 hidden sm:block text-cream-dim text-sm tracking-wide">
                  {song.year}
                </span>
                <span className="col-span-2 hidden sm:block text-cream-dim text-sm tracking-wide">
                  {song.duration}
                </span>

                <span className={`col-span-5 sm:col-span-2 flex justify-end items-center gap-2 text-xs uppercase tracking-[0.2em] transition ${
                  isPlayingThis ? "text-gold" : "text-cream-dim group-hover:text-cream"
                }`}>
                  {isPlayingThis ? (
                    <>
                      <span className="size-1.5 rounded-full bg-gold animate-pulse" />
                      playing
                    </>
                  ) : (
                    <>
                      <Play className="size-3 fill-current" />
                      listen
                    </>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <audio ref={audioRef} preload="metadata" />
    </>
  );
}

/* ──────────────────────────────────────────────────────
 * 3D vinyl record with cover art at the center label.
 * Tilted slightly for a 3D feel; spins continuously while
 * the parent row's track is the one currently playing.
 * Pure CSS — no images other than the cover prop.
 * ────────────────────────────────────────────────────── */
function Vinyl({ coverUrl, spinning }: { coverUrl: string | null; spinning: boolean }) {
  return (
    <span
      className="relative inline-block size-12 sm:size-14"
      style={{ perspective: "200px" }}
      aria-hidden
    >
      <span
        className={`absolute inset-0 rounded-full ${spinning ? "animate-vinyl-spin" : ""}`}
        style={{
          transform: "rotateX(14deg) rotateZ(-12deg)",
          transformStyle: "preserve-3d",
          background: `
            repeating-radial-gradient(circle at center,
              rgba(255,255,255,0.045) 0px,
              rgba(255,255,255,0.045) 1px,
              rgba(0,0,0,0.7) 1px,
              rgba(0,0,0,0.7) 2px),
            radial-gradient(circle at 40% 35%, #1d1d1d 0%, #050505 70%)
          `,
          boxShadow:
            "0 6px 14px -4px rgba(0,0,0,0.7), inset 0 0 8px rgba(0,0,0,0.6), inset 1px 2px 4px rgba(255,255,255,0.05)",
        }}
      >
        {/* Center label with the cover art */}
        <span className="absolute inset-[28%] rounded-full overflow-hidden border border-cream/15 bg-ink">
          {coverUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-cream-dim/60">
              <Disc3 className="size-3" />
            </span>
          )}
        </span>

        {/* Spindle hole */}
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[3px] rounded-full bg-gold/80" />
      </span>
    </span>
  );
}
