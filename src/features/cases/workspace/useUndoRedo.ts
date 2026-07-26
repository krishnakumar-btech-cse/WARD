import { useCallback, useState } from 'react';

export interface UndoableAction {
  label: string;
  undo: () => void;
  redo: () => void;
}

/**
 * Scoped to the two reversible actions investigators actually reach for on
 * a board — moving something and deleting something. Undoing a create/
 * connect would need a stable identity across re-creation that Data Store
 * ROWIDs don't give us, so those aren't in the history stack.
 */
export function useUndoRedo() {
  const [past, setPast] = useState<UndoableAction[]>([]);
  const [future, setFuture] = useState<UndoableAction[]>([]);

  const push = useCallback((action: UndoableAction) => {
    setPast((p) => [...p, action]);
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      const action = p[p.length - 1];
      if (!action) return p;
      action.undo();
      setFuture((f) => [action, ...f]);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      const action = f[0];
      if (!action) return f;
      action.redo();
      setPast((p) => [...p, action]);
      return f.slice(1);
    });
  }, []);

  return { push, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
