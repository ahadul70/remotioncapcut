import React from "react";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { EditorApp } from "./editor/EditorApp";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Pristine video composition for export and clean rendering */}
      <MyComposition />

      {/* CapCut-style desktop video editor workspace */}
      <Composition
        id="Editor"
        component={EditorApp}
        durationInFrames={300}
        fps={30}
        width={1440}
        height={900}
      />
    </>
  );
};
