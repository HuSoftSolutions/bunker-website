"use client";

import clsx from "clsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import useWindowDimensions from "@/hooks/useWindowDimensions";

type SignTvTickerProps = {
  text: string;
  speed?: number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  theme?: "light" | "dark" | "red" | "blue";
};

const themeClasses: Record<NonNullable<SignTvTickerProps["theme"]>, string> = {
  light: "bg-white text-black",
  dark: "bg-black text-white",
  red: "bg-red-800 text-white",
  blue: "bg-slate-800 text-white",
};

const sizeClasses: Record<NonNullable<SignTvTickerProps["size"]>, string> = {
  xs: "text-[16px] py-1",
  sm: "text-[28px] py-2",
  md: "text-[50px] py-5",
  lg: "text-[72px] py-8",
  xl: "text-[100px] py-12",
};

export function SignTvTicker({
  text,
  speed = 60,
  size = "lg",
  theme = "blue",
}: SignTvTickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);
  const [animation, setAnimation] = useState("");
  const { width } = useWindowDimensions();
  const rawId = useId();
  const animationName = useMemo(
    () => `sign-tv-ticker-${rawId.replace(/[:]/g, "")}`,
    [rawId],
  );

  useEffect(() => {
    const container = containerRef.current;
    const ticker = tickerRef.current;

    if (!container || !ticker) {
      return undefined;
    }

    const tickerWidth = ticker.offsetWidth;
    const containerWidth = container.offsetWidth;

    if (!tickerWidth || !containerWidth) {
      return undefined;
    }

    const duration = (tickerWidth + containerWidth) / speed;
    const keyframes = `@keyframes ${animationName} {\n` +
      `0% { transform: translate3d(${containerWidth}px, 0, 0); }\n` +
      `100% { transform: translate3d(-${tickerWidth}px, 0, 0); }\n` +
      `}`;

    const style = document.createElement("style");
    style.setAttribute("data-sign-tv-ticker", animationName);
    style.innerHTML = keyframes;
    document.head.appendChild(style);
    setAnimation(`${animationName} ${duration}s linear infinite`);

    return () => {
      document.head.removeChild(style);
    };
  }, [animationName, speed, text, width]);

  const resolvedTheme = themeClasses[theme] ?? themeClasses.blue;
  const resolvedSize = sizeClasses[size] ?? sizeClasses.lg;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex w-full items-center overflow-hidden font-semibold",
        resolvedTheme,
        resolvedSize,
      )}
    >
      <div
        ref={tickerRef}
        style={{ animation, willChange: "transform" }}
        className="inline-block whitespace-nowrap px-4"
      >
        {text}
      </div>
    </div>
  );
}
