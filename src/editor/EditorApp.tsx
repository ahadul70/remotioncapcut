import React, { useCallback, useEffect, useReducer, useRef } from "react";
import { PlayerRef } from "@remotion/player";
import { staticFile } from "remotion";
import { Input, ALL_FORMATS, UrlSource } from "mediabunny";

import { Clip, EditorState, HistorySnapshot, MediaAsset } from "./state/editorTypes";
import { editorReducer } from "./state/editorReducer";
import { HistoryManager } from "./state/history";

import { TopBar } from "./components/TopBar";
import { MediaPanel } from "./components/MediaPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Timeline } from "./components/Timeline";
import { ExportDialog } from "./components/ExportDialog";

import "./styles/editor.css";

const INITIAL_STATE: EditorState = {
  projectName: "Untitled Project",
  fps: 30,
  width: 1080,
  height: 1920,
  totalDurationInFrames: 2319, // 2289 frames (76.3s) + 30f padding
  currentFrame: 0,
  isPlaying: false,
  selectedClipId: "clip-test-1",
  activeTool: "select",
  snappingEnabled: true,
  zoom: 0.8, // 0.8 px per frame gives ~1830px timeline, comfortable for desktop scrolling/fit
  tracks: [
    { id: "track-v1", type: "video", name: "V1 Video", visible: true, locked: false },
    { id: "track-a1", type: "audio", name: "A1 Audio", muted: false, locked: false },
  ],
  clips: [
    {
      id: "clip-test-1",
      assetId: "asset-test-mp4",
      name: "TEST.mp4",
      type: "video",
      trackId: "track-v1",
      timelineStartFrame: 0,
      sourceStartFrame: 0,
      durationInFrames: 2289,
      sourceDurationInFrames: 2289,
      src: staticFile("TEST.mp4"),
      positionX: 0,
      positionY: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      volume: 1,
      muted: false,
    },
  ],
  assets: [
    {
      id: "asset-test-mp4",
      name: "TEST.mp4",
      type: "video",
      src: staticFile("TEST.mp4"),
      durationInFrames: 2289,
      durationInSeconds: 76.29,
      fps: 30,
    },
  ],
  activeSidebarTab: "media",
  isExportDialogOpen: false,
  saveStatus: "saved",
};

export const EditorApp: React.FC = () => {
  const [state, dispatch] = useReducer(editorReducer, INITIAL_STATE);
  const playerRef = useRef<PlayerRef | null>(null);
  const historyRef = useRef<HistoryManager>(new HistoryManager());
  const pendingSnapshotRef = useRef<HistorySnapshot | null>(null);

  // Helper to capture a deep snapshot of current state
  const captureSnapshot = useCallback((): HistorySnapshot => ({
    clips: JSON.parse(JSON.stringify(state.clips)),
    tracks: JSON.parse(JSON.stringify(state.tracks)),
    selectedClipId: state.selectedClipId,
    totalDurationInFrames: state.totalDurationInFrames,
  }), [state.clips, state.tracks, state.selectedClipId, state.totalDurationInFrames]);

  // Capture snapshot for undo stack (discrete actions)
  const recordSnapshot = useCallback(() => {
    historyRef.current.push(captureSnapshot());
  }, [captureSnapshot]);

  // Pre-action handlers for drag interactions: capture state before modification occurs
  const handleMoveStart = useCallback(() => {
    pendingSnapshotRef.current = captureSnapshot();
  }, [captureSnapshot]);

  const handleCommitMove = useCallback(() => {
    if (pendingSnapshotRef.current) {
      historyRef.current.push(pendingSnapshotRef.current);
      pendingSnapshotRef.current = null;
    }
  }, []);

  const handleCancelMove = useCallback(() => {
    pendingSnapshotRef.current = null;
  }, []);

  const handleTrimBegin = useCallback(() => {
    pendingSnapshotRef.current = captureSnapshot();
  }, [captureSnapshot]);

  const handleCommitTrim = useCallback(() => {
    if (pendingSnapshotRef.current) {
      historyRef.current.push(pendingSnapshotRef.current);
      pendingSnapshotRef.current = null;
    }
  }, []);

  const handleCancelTrim = useCallback(() => {
    pendingSnapshotRef.current = null;
  }, []);

  // Compute actual duration of TEST.mp4 on mount using mediabunny (if dynamic update needed)
  useEffect(() => {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(staticFile("TEST.mp4")),
    });

    input
      .computeDuration()
      .then((durationSec) => {
        const frames = Math.max(Math.ceil(durationSec * 30), 60);

        // Update asset and initial clip if different
        dispatch({
          type: "UPDATE_CLIP_PROPERTIES",
          clipId: "clip-test-1",
          properties: {
            durationInFrames: frames,
            sourceDurationInFrames: frames,
          },
        });

        dispatch({
          type: "SET_TOTAL_DURATION",
          duration: frames + 30,
        });
      })
      .catch((err) => {
        console.warn("Could not compute TEST.mp4 duration automatically:", err);
      })
      .finally(() => {
        input.dispose();
      });
  }, []);

  // Synchronize external playhead seeks to Remotion Player
  const handleSeek = useCallback(
    (frame: number) => {
      if (playerRef.current?.isPlaying()) {
        playerRef.current.pause();
      }
      const clamped = Math.max(0, Math.min(state.totalDurationInFrames, frame));
      dispatch({ type: "SET_PLAYHEAD", frame: clamped });
      if (playerRef.current) {
        playerRef.current.seekTo(clamped);
      }
    },
    [playerRef, state.totalDurationInFrames]
  );

  // Undo / Redo handlers
  const handleUndo = useCallback(() => {
    const prev = historyRef.current.undo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });
    if (prev) {
      dispatch({ type: "RESTORE_SNAPSHOT", snapshot: prev });
    }
  }, [state.clips, state.tracks, state.selectedClipId, state.totalDurationInFrames]);

  const handleRedo = useCallback(() => {
    const next = historyRef.current.redo({
      clips: state.clips,
      tracks: state.tracks,
      selectedClipId: state.selectedClipId,
      totalDurationInFrames: state.totalDurationInFrames,
    });
    if (next) {
      dispatch({ type: "RESTORE_SNAPSHOT", snapshot: next });
    }
  }, [state.clips, state.tracks, state.selectedClipId, state.totalDurationInFrames]);

  // Split operation with history
  const handleSplit = useCallback(() => {
    recordSnapshot();
    dispatch({ type: "SPLIT_CLIP_AT_PLAYHEAD" });
  }, [recordSnapshot]);

  // Delete operation with history
  const handleDelete = useCallback(() => {
    if (!state.selectedClipId) return;
    recordSnapshot();
    dispatch({ type: "DELETE_CLIP" });
  }, [recordSnapshot, state.selectedClipId]);

  // Property update with history
  const handleUpdateProperties = useCallback(
    (properties: Partial<Clip>) => {
      if (!state.selectedClipId) return;
      recordSnapshot();
      dispatch({
        type: "UPDATE_CLIP_PROPERTIES",
        clipId: state.selectedClipId,
        properties,
      });
    },
    [recordSnapshot, state.selectedClipId]
  );

  // Add asset to timeline
  const handleAddAssetToTimeline = useCallback(
    (asset: MediaAsset) => {
      recordSnapshot();
      const newClipId = `clip-${Date.now().toString(36)}`;
      const newClip: Clip = {
        id: newClipId,
        assetId: asset.id,
        name: asset.name,
        type: asset.type,
        trackId: "track-v1",
        timelineStartFrame: state.currentFrame,
        sourceStartFrame: 0,
        durationInFrames: asset.durationInFrames,
        sourceDurationInFrames: asset.durationInFrames,
        src: asset.src,
        scale: 1,
        positionX: 0,
        positionY: 0,
        rotation: 0,
        opacity: 1,
        volume: 1,
      };

      dispatch({
        type: "RESTORE_SNAPSHOT",
        snapshot: {
          clips: [...state.clips, newClip],
          tracks: state.tracks,
          selectedClipId: newClipId,
          totalDurationInFrames: Math.max(
            state.totalDurationInFrames,
            state.currentFrame + asset.durationInFrames + 30
          ),
        },
      });
    },
    [recordSnapshot, state.clips, state.tracks, state.currentFrame, state.totalDurationInFrames]
  );

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);
      if (isInputFocused) {
        return;
      }

      // Space: Play / Pause
      if (e.code === "Space") {
        e.preventDefault();
        if (playerRef.current) {
          if (playerRef.current.isPlaying()) {
            playerRef.current.pause();
          } else {
            playerRef.current.play();
          }
        }
      }

      // Delete / Backspace: Delete selected clip
      if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        handleDelete();
      }

      // S: Split selected clip at playhead
      if (e.code === "KeyS" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplit();
      }

      // Left Arrow: Step back 1 frame
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        handleSeek(Math.max(0, state.currentFrame - 1));
      }

      // Right Arrow: Step forward 1 frame
      if (e.code === "ArrowRight") {
        e.preventDefault();
        handleSeek(Math.min(state.totalDurationInFrames, state.currentFrame + 1));
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.code === "KeyZ") {
        e.preventDefault();
        handleUndo();
      }

      // Ctrl+Shift+Z or Ctrl+Y: Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyZ") ||
        ((e.ctrlKey || e.metaKey) && e.code === "KeyY")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDelete, handleSplit, handleSeek, handleUndo, handleRedo, state.currentFrame, state.totalDurationInFrames]);

  const selectedClip = state.clips.find((c) => c.id === state.selectedClipId) || null;

  return (
    <div className="editor-layout">
      {/* Top Application Bar */}
      <TopBar
        state={state}
        canUndo={historyRef.current.canUndo()}
        canRedo={historyRef.current.canRedo()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenExport={() => dispatch({ type: "SET_EXPORT_DIALOG_OPEN", isOpen: true })}
        onOpenAI={() => dispatch({ type: "SET_SIDEBAR_TAB", tab: "ai" })}
        onRenameProject={(name) => {
          recordSnapshot();
          dispatch({ type: "RENAME_PROJECT", name });
        }}
      />

      {/* Main Workspace Middle (Left Sidebar, Central Preview, Right Inspector) */}
      <main className="editor-workspace-middle">
        <MediaPanel
          activeTab={state.activeSidebarTab}
          onTabChange={(tab) => dispatch({ type: "SET_SIDEBAR_TAB", tab })}
          assets={state.assets}
          onImportAsset={(asset) => {
            dispatch({ type: "ADD_ASSET", asset });
          }}
          onAddAssetToTimeline={handleAddAssetToTimeline}
        />

        <PreviewPanel
          state={state}
          onFrameChange={(frame) => dispatch({ type: "SET_PLAYHEAD", frame })}
          onPlayingChange={(isPlaying) => dispatch({ type: "SET_IS_PLAYING", isPlaying })}
          playerRef={playerRef}
        />

        <PropertiesPanel
          selectedClip={selectedClip}
          onUpdateProperties={handleUpdateProperties}
          onDeleteClip={handleDelete}
          onSplitClip={handleSplit}
          currentFrame={state.currentFrame}
        />
      </main>

      {/* Bottom Multitrack Timeline */}
      <Timeline
        state={state}
        playerRef={playerRef}
        onSeek={handleSeek}
        onSelectClip={(id) => dispatch({ type: "SELECT_CLIP", id })}
        onMoveStart={handleMoveStart}
        onMoveClip={(clipId, newStartFrame) =>
          dispatch({ type: "MOVE_CLIP", clipId, newStartFrame })
        }
        onCommitMove={handleCommitMove}
        onCancelMove={handleCancelMove}
        onTrimBegin={handleTrimBegin}
        onTrimStart={(clipId, newStartFrame) =>
          dispatch({ type: "TRIM_CLIP_START", clipId, newStartFrame })
        }
        onTrimEnd={(clipId, newDurationInFrames) =>
          dispatch({ type: "TRIM_CLIP_END", clipId, newDurationInFrames })
        }
        onCommitTrim={handleCommitTrim}
        onCancelTrim={handleCancelTrim}
        onSplit={handleSplit}
        onDelete={handleDelete}
        onToggleSnapping={() => dispatch({ type: "TOGGLE_SNAPPING" })}
        onZoomChange={(zoom) => dispatch({ type: "SET_ZOOM", zoom })}
        onToggleMute={(trackId) => dispatch({ type: "TOGGLE_TRACK_MUTE", trackId })}
        onToggleLock={(trackId) => dispatch({ type: "TOGGLE_TRACK_LOCK", trackId })}
        onToggleVisible={(trackId) => dispatch({ type: "TOGGLE_TRACK_VISIBLE", trackId })}
      />

      {/* Export Dialog */}
      {state.isExportDialogOpen && (
        <ExportDialog
          state={state}
          onClose={() => dispatch({ type: "SET_EXPORT_DIALOG_OPEN", isOpen: false })}
        />
      )}
    </div>
  );
};
