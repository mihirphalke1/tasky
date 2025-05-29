import { useEffect } from "react";

type KeyCombo = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
};

export function useKeyboardShortcut(
  keyCombo: KeyCombo,
  callback: () => void,
  deps: any[] = []
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { key, ctrlKey, shiftKey, metaKey } = keyCombo;

      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        e.ctrlKey === !!ctrlKey &&
        e.shiftKey === !!shiftKey &&
        e.metaKey === !!metaKey
      ) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyCombo, callback, ...deps]);
}
