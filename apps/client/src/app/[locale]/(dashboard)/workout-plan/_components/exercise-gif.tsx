"use client";

import { useState } from "react";
import Image from "next/image";

interface ExerciseGifProps {
  url: string;
  alt: string;
}

export function ExerciseGif({ url, alt }: ExerciseGifProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (error || !/^https:\/\/.+/.test(url)) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      {!loaded && (
        <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-700" />
      )}
      <Image
        src={url}
        alt={alt}
        width={512}
        height={384}
        sizes="(max-width: 640px) 100vw, 400px"
        className={`h-auto w-full rounded-lg transition-opacity duration-200 ${loaded ? "opacity-100" : "absolute opacity-0"}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        loading="lazy"
        quality={75}
      />
    </div>
  );
}
