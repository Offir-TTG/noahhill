"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

export type Song = {
  title: string;
  year: string;
  duration: string;
  audio: string;
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
                className={`relative w-full text-left grid grid-cols-12 gap-4 items-center py-6 px-2 transition cursor-pointer ${
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

                <span className={`col-span-6 sm:col-span-5 font-display lowercase text-2xl sm:text-3xl transition ${
                  isActive ? "text-cream" : "text-cream"
                }`}>
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
