"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

function Equalizer() {
  return (
    <span className="flex items-end gap-1.5 h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" aria-hidden>
      <span className="block w-1.5 bg-cream rounded-sm animate-eq-bar" style={{ height: "60%", animationDelay: "0ms"  }} />
      <span className="block w-1.5 bg-cream rounded-sm animate-eq-bar" style={{ height: "90%", animationDelay: "120ms" }} />
      <span className="block w-1.5 bg-cream rounded-sm animate-eq-bar" style={{ height: "70%", animationDelay: "60ms"  }} />
      <span className="block w-1.5 bg-cream rounded-sm animate-eq-bar" style={{ height: "95%", animationDelay: "200ms" }} />
    </span>
  );
}

type Props = {
  src: string;        // audio file, e.g. "/hurt-somebody.mp3"
  cover: string;      // image src
  alt: string;
};

export default function CoverPlayer({ src, cover, alt }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);   // 0..1
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      setCurrent(a.currentTime);
      if (a.duration) setProgress(a.currentTime / a.duration);
    };
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => { setPlaying(false); setProgress(0); setCurrent(0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !a.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration;
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause hurt somebody" : "Play hurt somebody"}
        className="group relative aspect-square w-full overflow-hidden rounded-sm shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] cursor-pointer"
      >
        <Image
          src={cover}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-cream/10" />

        {/* Dim overlay when not playing */}
        <div
          className={`absolute inset-0 bg-ink/30 transition-opacity duration-500 ${
            playing ? "opacity-0" : "opacity-100 group-hover:opacity-60"
          }`}
        />

        {/* Wave-style centered play / pause icon — no background */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Pulsing wave rings — only while playing */}
          {playing && (
            <>
              <span className="absolute size-20 rounded-full ring-1 ring-cream/40 animate-wave-ping" />
              <span className="absolute size-20 rounded-full ring-1 ring-cream/30 animate-wave-ping-2" />
            </>
          )}

          <span className="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            {playing ? (
              <Equalizer />
            ) : (
              <Play className="size-16 fill-cream text-cream translate-x-[3px] drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]" />
            )}
          </span>
        </div>

        {/* "now playing" pill — only when playing */}
        {playing && (
          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-ink/70 backdrop-blur px-3 py-1.5 text-[10px] uppercase tracking-[0.3em] text-cream">
            <span className="size-1.5 rounded-full bg-gold animate-pulse" />
            now playing
          </div>
        )}
      </button>

      {/* Scrubber + time */}
      <div className="mt-4 select-none">
        <div
          className="relative h-1 w-full cursor-pointer rounded-full bg-cream/15"
          onClick={seek}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-cream"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-[0.3em] text-cream-dim">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
