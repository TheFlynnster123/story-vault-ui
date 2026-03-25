import { useRef, useCallback } from "react";

const LONG_PRESS_DURATION_MS = 500;

export const useLongPress = (onLongPress: () => void) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);

  const start = useCallback(() => {
    isLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, LONG_PRESS_DURATION_MS);
  }, [onLongPress]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const wasLongPress = useCallback(() => {
    const result = isLongPressRef.current;
    isLongPressRef.current = false;
    return result;
  }, []);

  return { start, cancel, wasLongPress };
};
