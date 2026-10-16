import { CallbackListener, PlayerRef } from "@remotion/player";
import { useCallback, useSyncExternalStore } from "react";

/**
 * High-performance hook for subscribing to Remotion Player frame updates
 * using useSyncExternalStore. Avoids re-rendering parent containers on every frame tick.
 */
export const useCurrentPlayerFrame = (
  playerRef: React.RefObject<PlayerRef | null>,
  fallbackFrame = 0
): number => {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const current = playerRef.current;
      if (!current) {
        return () => undefined;
      }

      const updater: CallbackListener<"frameupdate"> = () => {
        onStoreChange();
      };

      current.addEventListener("frameupdate", updater);
      return () => {
        current.removeEventListener("frameupdate", updater);
      };
    },
    [playerRef]
  );

  return useSyncExternalStore(
    subscribe,
    () => playerRef.current?.getCurrentFrame() ?? fallbackFrame,
    () => fallbackFrame
  );
};
