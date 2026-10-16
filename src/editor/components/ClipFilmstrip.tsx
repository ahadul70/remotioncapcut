import React, { useEffect, useMemo, useRef, useState } from "react";
import { Clip } from "../state/editorTypes";
import { calculateThumbnailSlots, thumbnailCache, ThumbnailSlot } from "../utils/thumbnailCache";

interface ClipFilmstripProps {
  clip: Clip;
  zoom: number;
}

export const ClipFilmstrip: React.FC<ClipFilmstripProps> = ({ clip, zoom }) => {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const activeClipIdRef = useRef(clip.id);
  activeClipIdRef.current = clip.id;

  // Calculate needed slots based on clip trim and zoom
  const slots: ThumbnailSlot[] = useMemo(() => {
    return calculateThumbnailSlots(
      clip.sourceStartFrame,
      clip.durationInFrames,
      zoom,
      30,
      68
    );
  }, [clip.sourceStartFrame, clip.durationInFrames, zoom]);

  // Asynchronously fetch thumbnails for slots
  useEffect(() => {
    let isMounted = true;
    const currentClipId = clip.id;
    const src = clip.src;

    if (!src || slots.length === 0) return;

    // First load any already-cached thumbnails synchronously
    const initialCached: Record<string, string> = {};
    const slotsToFetch: ThumbnailSlot[] = [];

    for (const slot of slots) {
      const cached = thumbnailCache.getCached(src, slot.sourceFrame);
      if (cached) {
        initialCached[slot.cacheKey] = cached;
      } else {
        slotsToFetch.push(slot);
      }
    }

    if (Object.keys(initialCached).length > 0) {
      setThumbnails((prev) => ({ ...prev, ...initialCached }));
    }

    // Progressively extract missing thumbnails
    slotsToFetch.forEach((slot) => {
      thumbnailCache
        .getThumbnail(src, slot.sourceFrame, 30)
        .then((dataUrl) => {
          if (!isMounted || activeClipIdRef.current !== currentClipId) return;
          if (dataUrl) {
            setThumbnails((prev) => ({
              ...prev,
              [slot.cacheKey]: dataUrl,
            }));
          }
        })
        .catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [clip.id, clip.src, slots]);

  return (
    <div className="clip-filmstrip-track" aria-hidden="true">
      {slots.map((slot) => {
        const thumbUrl = thumbnails[slot.cacheKey];
        return (
          <div
            key={slot.index}
            className="filmstrip-slot"
            style={{
              width: `${slot.width}px`,
            }}
          >
            {thumbUrl ? (
              // eslint-disable-next-line @remotion/warn-native-media-tag
              <img
                src={thumbUrl}
                alt=""
                className="filmstrip-img"
                draggable={false}
              />
            ) : (
              <div className="filmstrip-placeholder" />
            )}
          </div>
        );
      })}
    </div>
  );
};
