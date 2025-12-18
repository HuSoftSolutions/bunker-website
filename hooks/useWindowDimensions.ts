"use client";

import { useEffect, useState } from "react";

type WindowDimensions = {
  width: number;
  height: number;
};

const defaultDimensions: WindowDimensions = {
  width: 0,
  height: 0,
};

export default function useWindowDimensions() {
  const [windowSize, setWindowSize] = useState<WindowDimensions>(() => {
    if (typeof window === "undefined") {
      return defaultDimensions;
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return windowSize;
}
