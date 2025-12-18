"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import clsx from "clsx";

type EventItem = {
  title?: string;
  description?: string;
  locationName?: string;
  timestamp: {
    seconds: number;
  };
};

type EventTickerProps = {
  items?: EventItem[];
  speed?: number;
  width?: number;
  className?: string;
};

export function EventTicker({
  items = [],
  speed = 50,
  width = 0,
  className,
}: EventTickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [translateX, setTranslateX] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const dragStartX = useRef(0);
  const totalWidthRef = useRef(0);
  const containerWidthRef = useRef(0);
  const isPaused = useRef(false);
  const isMounted = useRef(false);

  const calculateWidths = useCallback(() => {
    if (trackRef.current && containerRef.current) {
      const children = Array.from(trackRef.current.children) as HTMLElement[];
      const totalWidth = children.reduce((acc, child) => {
        const style = window.getComputedStyle(child);
        const marginRight = parseFloat(style.marginRight) || 0;
        return acc + child.offsetWidth + marginRight;
      }, 0);

      totalWidthRef.current = totalWidth;
      containerWidthRef.current = containerRef.current.offsetWidth;
      setTranslateX(containerWidthRef.current);
      setIsInitialized(true);
    }
  }, []);

  const animate = useCallback(
    (time: number) => {
      if (
        previousTimeRef.current !== undefined &&
        !isPaused.current &&
        isMounted.current
      ) {
        const deltaTime = time - previousTimeRef.current;
        const distance = (speed * deltaTime) / 1000;

        setTranslateX((prev) => {
          let next = prev - distance;
          if (next <= -totalWidthRef.current) {
            next = containerWidthRef.current;
          }
          return next;
        });
      }

      previousTimeRef.current = time;
      if (isMounted.current) {
        requestRef.current = requestAnimationFrame(animate);
      }
    },
    [speed],
  );

  useEffect(() => {
    isMounted.current = true;
    calculateWidths();

    const handleResize = () => {
      const prevWidth = containerWidthRef.current;
      calculateWidths();
      setTranslateX((prev) => prev + (containerWidthRef.current - prevWidth));
    };

    window.addEventListener("resize", handleResize);
    previousTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      isMounted.current = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [animate, calculateWidths, items, width]);

  const handleDragStart = useCallback((clientX: number) => {
    isPaused.current = true;
    setIsDragging(true);
    dragStartX.current = clientX;
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    const dx = clientX - dragStartX.current;
    dragStartX.current = clientX;
    setTranslateX((prev) => prev + dx);
  }, []);

  const handleDragEnd = useCallback(() => {
    isPaused.current = false;
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleMouseDown = (event: MouseEvent) => {
      handleDragStart(event.clientX);
      const handleMouseMove = (moveEvent: MouseEvent) => {
        handleDragMove(moveEvent.clientX);
      };
      const handleMouseUp = () => {
        handleDragEnd();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      event.preventDefault();
    };

    const handleTouchStart = (event: TouchEvent) => {
      handleDragStart(event.touches[0].clientX);
      const handleTouchMove = (moveEvent: TouchEvent) => {
        handleDragMove(moveEvent.touches[0].clientX);
        moveEvent.preventDefault();
      };
      const handleTouchEnd = () => {
        handleDragEnd();
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("touchstart", handleTouchStart);
    };
  }, [handleDragEnd, handleDragMove, handleDragStart]);

  const computedMaxWidth =
    width > 992 ? Math.max(width - 300, 0) : Math.max(width, 0);
  const clampedMaxWidth =
    computedMaxWidth > 0 ? computedMaxWidth : undefined;

  return (
    <div
      ref={containerRef}
      className={clsx(
        "overflow-hidden border-y border-white/10 bg-black/80 text-white",
        isDragging && "cursor-grabbing",
        className,
      )}
      style={{ width: "100%", maxWidth: clampedMaxWidth }}
    >
      <div
        ref={trackRef}
        className="flex items-center space-x-6 px-6 py-3"
        style={{
          transform: `translateX(${translateX}px)`,
          visibility: isInitialized ? "visible" : "hidden",
        }}
      >
        {items.map((item, index) => (
          <div
            key={`${item.title ?? "event"}-${index}`}
            className="flex min-w-[240px] flex-col gap-1 rounded-lg bg-black/60 px-4 py-3 shadow-lg shadow-black/30"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">
              {format(new Date(item.timestamp.seconds * 1000), "EEEE, MMMM do")}
            </div>
            <div className="text-sm font-semibold text-white">
              {item.title ?? "Untitled Event"}
            </div>
            {item.description ? (
              <div className="text-xs text-zinc-300 overflow-hidden text-ellipsis">
                {item.description}
              </div>
            ) : null}
            {item.locationName ? (
              <div className="text-xs font-medium uppercase text-zinc-400">
                {item.locationName}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
