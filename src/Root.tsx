import React from "react";
import { MyComposition } from "./Composition";

/**
 * Root composition for Remotion Studio and CLI rendering.
 * Keeps video output 100% clean and free of editor UI.
 */
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
    </>
  );
};
