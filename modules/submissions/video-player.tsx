"use client";
import { useState, forwardRef } from "react";
import { ErrorState } from "@/modules/shared/ui";
export const VideoPlayer = forwardRef<HTMLVideoElement, { src: string }>(
  function VideoPlayer({ src }, ref) {
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    return (
      <div className="space-y-3">
        <video
          key={attempt}
          ref={ref}
          src={src}
          controls
          preload="metadata"
          playsInline
          className="aspect-video w-full rounded-xl bg-black"
          onError={() => setFailed(true)}
          aria-label="Video praktik"
        />
        {failed && (
          <ErrorState
            error={new Error()}
            retry={() => {
              setFailed(false);
              setAttempt(attempt + 1);
            }}
          />
        )}
      </div>
    );
  },
);
