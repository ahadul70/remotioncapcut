import { HistorySnapshot } from "./editorTypes";

export class HistoryManager {
  private undoStack: HistorySnapshot[] = [];
  private redoStack: HistorySnapshot[] = [];
  private maxDepth = 50;

  public push(snapshot: HistorySnapshot) {
    // Deep clone snapshot to preserve historical state
    this.undoStack.push(JSON.parse(JSON.stringify(snapshot)));
    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }
    // Any new action clears redo stack
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public undo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canUndo()) return null;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(current)));
    return previous;
  }

  public redo(current: HistorySnapshot): HistorySnapshot | null {
    if (!this.canRedo()) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(current)));
    return next;
  }
}
