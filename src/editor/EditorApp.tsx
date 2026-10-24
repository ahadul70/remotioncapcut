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
import { createClipFromAsset, extractMediaMetadata } from "./utils/mediaUtils";

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
    const curFrame = playerRef.current ? playerRef.current.getCurrentFrame() : state.currentFrame;
    dispatch({ type: "SPLIT_CLIP_AT_PLAYHEAD", frame: curFrame });
  }, [recordSnapshot, playerRef, state.currentFrame]);

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

  // Track management handlers with undo/redo
  const handleAddTrack = useCallback(
    (trackType: "video" | "audio") => {
      recordSnapshot();
      dispatch({ type: "ADD_TRACK", trackType });
    },
    [recordSnapshot]
  );

  const handleDeleteTrack = useCallback(
    (trackId: string) => {
      recordSnapshot();
      dispatch({ type: "DELETE_TRACK", trackId });
    },
    [recordSnapshot]
  );

  const handleToggleTrackMute = useCallback(
    (trackId: string) => {
      recordSnapshot();
      dispatch({ type: "TOGGLE_TRACK_MUTE", trackId });
    },
    [recordSnapshot]
  );

  const handleToggleTrackLock = useCallback(
    (trackId: string) => {
      recordSnapshot();
      dispatch({ type: "TOGGLE_TRACK_LOCK", trackId });
    },
    [recordSnapshot]
  );

  const handleToggleTrackVisible = useCallback(
    (trackId: string) => {
      recordSnapshot();
      dispatch({ type: "TOGGLE_TRACK_VISIBLE", trackId });
    },
    [recordSnapshot]
  );

  // Add asset to timeline (supports target track and frame from drag-and-drop)
  const handleAddAssetToTimeline = useCallback(
    (asset: MediaAsset, targetTrackId?: string, targetStartFrame?: number) => {
      recordSnapshot();

      // Find compatible track
      let targetTrack =
        (targetTrackId && state.tracks.find((t) => t.id === targetTrackId)) ||
        state.tracks.find((t) => (asset.type === "audio" ? t.type === "audio" : t.type === "video")) ||
        state.tracks[0];

      let startFrame: number;
      if (targetStartFrame !== undefined) {
        startFrame = targetStartFrame;
      } else {
        const playhead = playerRef.current ? playerRef.current.getCurrentFrame() : state.currentFrame;
        const existingClipsOnTrack = state.clips.filter((c) => c.trackId === targetTrack.id);
        const overlapsAtPlayhead = existingClipsOnTrack.some(
          (c) => playhead >= c.timelineStartFrame && playhead < c.timelineStartFrame + c.durationInFrames
        );

        if (overlapsAtPlayhead) {
          // If another unlocked track of same type exists, use it so it overlays on top
          const otherCompatibleTrack = state.tracks.find(
            (t) => t.type === targetTrack.type && t.id !== targetTrack.id && !t.locked
          );
          if (otherCompatibleTrack) {
            targetTrack = otherCompatibleTrack;
            startFrame = playhead;
          } else {
            // Append after existing clips on track
            const maxEnd = Math.max(0, ...existingClipsOnTrack.map((c) => c.timelineStartFrame + c.durationInFrames));
            startFrame = maxEnd;
          }
        } else {
          startFrame = playhead;
        }
      }

      const newClip = createClipFromAsset(asset, targetTrack.id, startFrame);

      dispatch({
        type: "RESTORE_SNAPSHOT",
        snapshot: {
          clips: [...state.clips, newClip],
          tracks: state.tracks,
          selectedClipId: newClip.id,
          totalDurationInFrames: Math.max(
            state.totalDurationInFrames,
            startFrame + asset.durationInFrames + 30
          ),
        },
      });

      // Jump playhead to the new clip start so user immediately sees preview
      handleSeek(startFrame);
    },
    [recordSnapshot, state.tracks, playerRef, state.currentFrame, state.clips, state.totalDurationInFrames, handleSeek]
  );

  // Bulk import assets into state and auto-place on timeline
  const handleImportAssets = useCallback(
    (newAssets: MediaAsset[]) => {
      dispatch({ type: "ADD_ASSETS", assets: newAssets });
      if (newAssets.length > 0) {
        handleAddAssetToTimeline(newAssets[0]);
      }
    },
    [handleAddAssetToTimeline]
  );

  // Dropping an asset onto a timeline track
  const handleDropAsset = useCallback(
    (trackId: string, frame: number, asset: MediaAsset) => {
      handleAddAssetToTimeline(asset, trackId, frame);
    },
    [handleAddAssetToTimeline]
  );

  // Dropping external files onto a timeline track
  const handleDropFiles = useCallback(
    async (trackId: string, frame: number, fileList: FileList) => {
      const files = Array.from(fileList);
      let currentDropFrame = frame;
      const importedAssets: MediaAsset[] = [];
      const newClips: Clip[] = [];

      for (const file of files) {
        try {
          const metadata = await extractMediaMetadata(file, state.fps);
          const objectUrl = URL.createObjectURL(file);
          const rand = Math.random().toString(36).substring(2, 6);
          const assetId = `asset-${Date.now().toString(36)}-${rand}`;
          const asset: MediaAsset = {
            id: assetId,
            name: file.name,
            type: metadata.type,
            src: objectUrl,
            durationInSeconds: metadata.durationInSeconds,
            durationInFrames: metadata.durationInFrames,
            width: metadata.width,
            height: metadata.height,
            fps: state.fps,
            thumbnail: metadata.thumbnail,
          };
          importedAssets.push(asset);

          // Route to compatible track
          const targetTrack =
            state.tracks.find((t) => t.id === trackId && t.type === asset.type) ||
            state.tracks.find((t) => t.type === asset.type && !t.locked) ||
            state.tracks[0];

          const clip = createClipFromAsset(asset, targetTrack.id, currentDropFrame);
          newClips.push(clip);
          currentDropFrame += asset.durationInFrames;
        } catch (err) {
          console.error("Failed to import dropped file:", file.name, err);
        }
      }

      if (importedAssets.length > 0) {
        recordSnapshot();
        dispatch({ type: "ADD_ASSETS", assets: importedAssets });
        dispatch({
          type: "RESTORE_SNAPSHOT",
          snapshot: {
            clips: [...state.clips, ...newClips],
            tracks: state.tracks,
            selectedClipId: newClips[0]?.id || state.selectedClipId,
            totalDurationInFrames: Math.max(
              state.totalDurationInFrames,
              currentDropFrame + 30
            ),
          },
        });
        if (newClips[0]) {
          handleSeek(newClips[0].timelineStartFrame);
        }
      }
    },
    [state.fps, state.tracks, state.clips, state.selectedClipId, state.totalDurationInFrames, recordSnapshot, handleSeek]
  );

  // Window-level drag & drop for dropping files anywhere in the editor window
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const target = e.target as HTMLElement | null;
        // Let track lane or media panel local handlers take precedence
        if (target && (target.closest(".track-lane") || target.closest(".sidebar-content-pane"))) {
          return;
        }
        e.preventDefault();
        const primaryTrackId = state.tracks.find((t) => t.type === "video")?.id || state.tracks[0]?.id || "track-v1";
        handleDropFiles(primaryTrackId, state.currentFrame, e.dataTransfer.files);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [state.tracks, state.currentFrame, handleDropFiles]);

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
        if (state.selectedClipId) {
          handleSplit();
        }
      }

      // Left Arrow: Step back 1 frame
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        const cur = playerRef.current ? playerRef.current.getCurrentFrame() : state.currentFrame;
        handleSeek(Math.max(0, cur - 1));
      }

      // Right Arrow: Step forward 1 frame
      if (e.code === "ArrowRight") {
        e.preventDefault();
        const cur = playerRef.current ? playerRef.current.getCurrentFrame() : state.currentFrame;
        handleSeek(Math.min(state.totalDurationInFrames, cur + 1));
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

      // Ctrl+= / Ctrl++: Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === "=" || e.key === "+" || e.code === "NumpadAdd")) {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", zoom: Math.min(40, +(state.zoom * 1.3).toFixed(2)) });
      }

      // Ctrl+-: Zoom Out
      if ((e.ctrlKey || e.metaKey) && (e.key === "-" || e.code === "NumpadSubtract")) {
        e.preventDefault();
        dispatch({ type: "SET_ZOOM", zoom: Math.max(0.1, +(state.zoom / 1.3).toFixed(2)) });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDelete, handleSplit, handleSeek, handleUndo, handleRedo, state.currentFrame, state.totalDurationInFrames, state.zoom]);

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
          fps={state.fps}
          onImportAssets={handleImportAssets}
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
          tracks={state.tracks}
          fps={state.fps}
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
        onMoveClip={(clipId, newStartFrame, targetTrackId) =>
          dispatch({ type: "MOVE_CLIP", clipId, newStartFrame, targetTrackId })
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
        onToggleMute={handleToggleTrackMute}
        onToggleLock={handleToggleTrackLock}
        onToggleVisible={handleToggleTrackVisible}
        onAddTrack={handleAddTrack}
        onDeleteTrack={handleDeleteTrack}
        onDropAsset={handleDropAsset}
        onDropFiles={handleDropFiles}
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
