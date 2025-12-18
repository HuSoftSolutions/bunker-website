"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactCanvasConfetti from "react-canvas-confetti";
import type { CreateTypes as ConfettiInstance } from "canvas-confetti";
import { GrClose } from "react-icons/gr";
import clsx from "clsx";
import { Button } from "@/components/ui/Button";

type InfoModalData = {
  alertMsg?: string;
  title?: string;
  msg?: string;
  link?: string;
  linkText?: string;
  link2?: string;
  linkText2?: string;
};

type InfoModalProps = {
  show: boolean;
  hide: () => void;
  data?: InfoModalData;
  showConfetti?: boolean;
};

const canvasStyles: React.CSSProperties = {
  position: "fixed",
  pointerEvents: "none",
  width: "100%",
  height: "100%",
  top: 0,
  left: 0,
  zIndex: 1000,
};

const randomInRange = (min: number, max: number) =>
  Math.random() * (max - min) + min;

const getAnimationSettings = (angle: number, originX: number) => ({
  particleCount: 3,
  angle,
  spread: 55,
  origin: { x: originX },
  colors: ["#C12126", "#ffffff"],
});

export function InfoModal({
  show,
  hide,
  data,
  showConfetti = true,
}: InfoModalProps) {
  const refAnimationInstance = useRef<ConfettiInstance | null>(null);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const getInstance = useCallback((instance: ConfettiInstance) => {
    refAnimationInstance.current = instance;
  }, []);

  const nextTickAnimation = useCallback(() => {
    if (refAnimationInstance.current) {
      refAnimationInstance.current(getAnimationSettings(60, 0));
      refAnimationInstance.current(getAnimationSettings(120, 1));
      refAnimationInstance.current({
        particleCount: 5,
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: {
          x: Math.random(),
          y: Math.random() - 0.2,
        } as { x: number; y: number },
      });
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (!intervalId) {
      setIntervalId(setInterval(nextTickAnimation, 16));
    }
  }, [intervalId, nextTickAnimation]);

  const stopAnimation = useCallback(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (refAnimationInstance.current) {
      refAnimationInstance.current.reset();
    }
  }, [intervalId]);

  useEffect(() => {
    if (show) {
      startAnimation();
    } else {
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [show, startAnimation, stopAnimation]);

  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-zinc-900/95 p-6 shadow-2xl shadow-black/50">
        <div className="flex w-full justify-end">
          <button
            type="button"
            onClick={() => {
              hide();
              stopAnimation();
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-700 transition hover:bg-white/80"
            aria-label="Close notice"
          >
            <GrClose />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 px-4 pb-2 pt-4 text-center">
          {data?.alertMsg ? (
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {data.alertMsg}
            </p>
          ) : null}
          {data?.title ? (
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              {data.title}
            </h2>
          ) : null}
          {data?.msg ? (
            <p className="text-lg text-white/90">{data.msg}</p>
          ) : null}

          <div className="flex flex-col gap-3 pt-2">
            {data?.link ? (
              <Button
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
              >
                {data.linkText || "Click Here"}
              </Button>
            ) : null}
            {data?.link2 ? (
              <Button
                href={data.link2}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
              >
                {data.linkText2 || "Click Here"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {showConfetti ? (
        <ReactCanvasConfetti
          onInit={({ confetti }) => getInstance(confetti)}
          style={canvasStyles}
        />
      ) : null}
    </div>
  );
}
