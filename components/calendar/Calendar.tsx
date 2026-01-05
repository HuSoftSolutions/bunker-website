"use client";

import {
  add,
  addMonths,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  format,
  getDay,
  isPast,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  sub,
  parse,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Firebase from "@/lib/firebase/client";
import { onSnapshot, type DocumentData, type DocumentSnapshot } from "firebase/firestore";

type CalendarEvent = {
  date: string;
  timestamp: { toDate: () => Date } | { seconds: number };
  parsedDate: Date;
  timestampDate: Date;
  [key: string]: unknown;
};

type CalendarProps = {
  location: Record<string, unknown> | null;
  firebase: Firebase;
};

const resolveStringValue = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

function toDateFromTimestamp(timestamp: CalendarEvent["timestamp"]) {
  if (!timestamp) {
    return new Date();
  }
  if ("toDate" in timestamp && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  if ("seconds" in timestamp) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date();
}

export function Calendar({ location, firebase }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const locationId = resolveStringValue(location?.id);
    if (!locationId) {
      return;
    }

    const docRef = firebase.calendarEventsRef(locationId);
    const unsubscribe = onSnapshot(
      docRef,
      (docSnapshot: DocumentSnapshot<DocumentData>) => {
        if (docSnapshot.exists()) {
          const parsedEvents: CalendarEvent[] = (docSnapshot
            .data()
            ?.calendarEvents || []).map((event: CalendarEvent) => ({
            ...event,
            date: event.date,
            timestamp: event.timestamp,
          }));

          const filteredEvents = parsedEvents
            .map((event) => ({
              ...event,
              parsedDate: parse(event.date, "yyyy-MM-dd", new Date()),
              timestampDate: toDateFromTimestamp(event.timestamp),
            }))
            .filter(
              (event) =>
                isSameMonth(event.parsedDate, currentDate) ||
                !isPast(endOfDay(event.parsedDate)),
            )
            .sort(
              (a, b) =>
                eventTime(a.timestampDate) - eventTime(b.timestampDate),
            );

          setEvents(filteredEvents);
          setError(null);
        } else {
          setError("Data not found");
        }
      },
      (err: unknown) => {
        console.error("Error fetching calendar data: ", err);
        setError("Error fetching calendar data");
      },
    );

    return () => {
      unsubscribe();
    };
  }, [firebase, location, currentDate]);

  const daysOfWeek = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        format(add(startOfWeek(currentDate), { days: i }), "EEE"),
      ),
    [currentDate],
  );

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = startOfMonth(currentDate);
    const startDay = sub(firstDayOfMonth, {
      days: getDay(firstDayOfMonth),
    });

    const endOfCurrentMonth = endOfMonth(currentDate);
    const remainingDaysInWeek = 6 - getDay(endOfCurrentMonth);
    const endDay = add(endOfCurrentMonth, {
      days: remainingDaysInWeek,
    });

    return eachDayOfInterval({
      start: startDay,
      end: endDay,
    });
  }, [currentDate]);

  const handleNextMonth = () => {
    setCurrentDate((prev) => addMonths(prev, 1));
  };

  const handlePrevMonth = () => {
    setCurrentDate((prev) => addMonths(prev, -1));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="hidden items-center justify-between md:flex">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-white hover:bg-white/10"
        >
          Prev
        </button>
        <span className="text-lg font-semibold text-white">
          {format(currentDate, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="rounded-full border border-white/10 px-3 py-1 text-sm font-semibold text-white hover:bg-white/10"
        >
          Next
        </button>
      </div>

      <div className="hidden grid-cols-7 gap-px rounded-2xl border border-white/10 bg-white/10 p-px text-xs font-semibold uppercase tracking-wide text-white md:grid">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="bg-black/70 py-2 text-center text-[0.7rem] md:text-xs"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const dayEvents = events.filter((event) => isSameDay(event.parsedDate, day));
          const isCurrentMonth = isSameMonth(day, currentDate);
          return (
            <div
              key={day.toISOString()}
              className={clsx(
                "min-h-[92px] bg-black/60 p-2 text-xs text-white/80",
                !isCurrentMonth && "bg-black/30 text-white/40",
              )}
            >
              <div className="flex justify-between text-[0.65rem] font-semibold uppercase tracking-tight">
                <span>{format(day, "d")}</span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {dayEvents.map((event) => (
                  (() => {
                    const eventTitle = resolveStringValue(event.title, "Event");

                    return (
                      <div
                        key={`${event.date}-${eventTitle}`}
                        className="rounded-md bg-primary/20 px-2 py-1 text-[0.65rem] text-primary"
                      >
                        {eventTitle}
                      </div>
                    );
                  })()
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/50 p-4 text-sm text-white/80">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
          Upcoming Events
        </h3>
        <ul className="flex flex-col gap-3 text-white/70">
          {events.slice(0, 8).map((event) => (
            <li
              key={`${event.date}-${resolveStringValue(event.title, "Event")}`}
              className="flex flex-col gap-0.5 rounded-xl bg-white/5 px-3 py-2"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-primary/90">
                {format(event.parsedDate, "EEEE, MMMM do")}
              </span>
              <span className="text-sm font-semibold text-white">
                {resolveStringValue(event.title, "Event")}
              </span>
              {resolveStringValue(event.description) ? (
                <span className="text-xs text-white/70">
                  {resolveStringValue(event.description)}
                </span>
              ) : null}
            </li>
          ))}
          {!events.length ? (
            <li className="text-xs text-white/50">
              No upcoming events for this month.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

function eventTime(date: Date) {
  return date.getTime();
}
