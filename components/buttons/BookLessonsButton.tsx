"use client";

import clsx from "clsx";
import { Button } from "@/components/ui/Button";
import * as ROUTES from "@/constants/routes";

type BookLessonsButtonProps = {
  className?: string;
};

export function BookLessonsButton({ className }: BookLessonsButtonProps) {
  return (
    <div className={clsx("flex w-full", className)}>
      <Button className="w-full" href={ROUTES.LESSONS}>
        Book Lesson
      </Button>
    </div>
  );
}
