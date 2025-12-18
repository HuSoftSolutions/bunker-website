import { useEffect, useState } from "react";

type AsyncCallback<T> = (value: T) => Promise<void> | void;

function useAsyncDebounce<T>(callback: AsyncCallback<T>, delay: number) {
  const [debouncing, setDebouncing] = useState(false);

  useEffect(() => {
    if (!debouncing) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setDebouncing(false);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [debouncing, delay]);

  const debouncedCallback = async (value: T) => {
    if (debouncing) {
      return;
    }

    setDebouncing(true);
    await callback(value);
  };

  return debouncedCallback;
}

export default useAsyncDebounce;
