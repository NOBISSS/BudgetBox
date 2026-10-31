import { useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "./useDebounce";

type SaveState = "saved" | "saving";

export function useAutoSave<T>(
  value: T,
  onSave: (value: T) => Promise<unknown>,
  delay = 400,
): SaveState {
  const debounced = useDebounce(value, delay);
  const latest = useRef(value);
  const onSaveRef = useRef(onSave);
  const savedValue = useRef(JSON.stringify(value));
  const [state, setState] = useState<SaveState>("saved");
  latest.current = value;
  onSaveRef.current = onSave;

  const flush = useCallback(
    async (candidate: T, announce: boolean): Promise<void> => {
      const serialized = JSON.stringify(candidate);
      if (serialized === savedValue.current) return;
      if (announce) setState("saving");
      try {
        await onSaveRef.current(candidate);
        savedValue.current = serialized;
        if (announce) setState("saved");
      } catch {
        if (announce) setState("saving");
      }
    },
    [],
  );

  useEffect(() => {
    const serialized = JSON.stringify(debounced);
    if (serialized === savedValue.current) {
      setState("saved");
      return;
    }
    setState("saving");
    const timer = window.setTimeout(() => {
      void flush(debounced, true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [debounced, flush]);

  useEffect(() => {
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden")
        void flush(latest.current, false);
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", saveWhenHidden);
      void flush(latest.current, false);
    };
  }, [flush]);

  return state;
}
