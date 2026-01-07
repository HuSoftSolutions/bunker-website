"use client";

import { BookEventsButton } from "@/components/buttons/BookEventsButton";
import { BookLessonsButton } from "@/components/buttons/BookLessonsButton";
import { BookNowButton } from "@/components/buttons/BookNowButton";
import { ExternalLinkButton } from "@/components/buttons/ExternalLinkButton";
import { EventTicker } from "@/components/event/EventTicker";
import { InfoModal } from "@/components/landing/InfoModal";
import { NoticeBanner } from "@/components/landing/NoticeBanner";
import { LocationSelector } from "@/components/location/LocationSelector";
import useNoticeInfo from "@/hooks/useNoticeInfo";
import useWindowDimensions from "@/hooks/useWindowDimensions";
import { useFirebase } from "@/providers/FirebaseProvider";
import { useEffect, useState } from "react";
import { getDocs, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";

const DESKTOP_VIDEO = "/assets/Bunker_Homepage_Video_1920x1080.mp4";
const MOBILE_VIDEO = "/assets/Bunker_Homepage_Video_Mobile.mp4";

type TourVideo = {
  src: string;
  cta?: {
    title: string;
    url: string;
  };
};

const TOUR_VIDEOS: TourVideo[] = [
  {
    src: "https://mpembed.com/show/?m=u9BpmnnH69C&mpu=1854",
  },
  {
    src: "https://mpembed.com/show/?m=fma1tdkHirm&mpu=1854",
  },
  {
    src: "https://mpembed.com/show/?m=uzLoCgELmYD&mpu=1854",
    // cta: {
    //   title: "Order Takeout/Delivery",
    //   url: "https://order.getinthebunker.menu/r/67290",
    // },
  },
  {
    src: "https://mpembed.com/show/?m=EycycPF8DQT&mpu=1854",
    // cta: {
    //   title: "Order Takeout/Delivery",
    //   url: "https://order.getinthebunker.menu/r/67282",
    // },
  },
  {
    src: "https://mpembed.com/show/?m=A8QBTuwjiYY&mpu=1854",
  },
  {
    src: "https://mpembed.com/show/?m=WV5KC6JHdfV&mpu=1854",
  },
  {
    src: "https://mpembed.com/show/?m=AyNVXroMWhK&mpu=1854",
  },
];

const TRACKMAN_FEATURES = [
  {
    title: "Breathtaking Game Experience",
    image: "https://storage.googleapis.com/thebunker-assets/thebunker/Holzhausern Driving Range.jpg",
  },
  {
    title: "Second-To-None Functionality",
    image: "https://storage.googleapis.com/thebunker-assets/thebunker/trackman.jpg",
  },
  {
    title: "A Global Golf Experience",
    image: "https://storage.googleapis.com/thebunker-assets/thebunker/Golf Sim Patron 2.jpg",
  },
];

const CTA_TEXTURE = "https://storage.googleapis.com/thebunker-assets/thebunker/bunker-web-golf-texture.jpg";

const UPCOMING_IMAGE = "https://storage.googleapis.com/thebunker-assets/thebunker/CP_VIP_League.jpg";

const HERO_TAGLINE = "Luxury Sports Bar ● Indoor Golf ● Food ● Music ● Lounge";

export type CalendarFeedEvent = {
  title?: string;
  description?: string;
  locationName?: string;
  showOnFeed?: boolean;
  timestamp: {
    seconds: number;
  };
};

export default function LandingPage() {
  const firebase = useFirebase();
  const { noticeInfo, setShowInfoModal } = useNoticeInfo(firebase);
  const { width } = useWindowDimensions();
  const [events, setEvents] = useState<CalendarFeedEvent[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const snapshot = await getDocs(firebase.calendarEventsAllRef());
        const allEvents: CalendarFeedEvent[] = [];
        snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data() as Record<string, unknown>;
          const calendarEventsRaw = (data as { calendarEvents?: unknown })
            .calendarEvents;
          const calendarEvents = Array.isArray(calendarEventsRaw)
            ? (calendarEventsRaw as CalendarFeedEvent[])
            : [];
          const filtered = calendarEvents.filter(
            (event: CalendarFeedEvent) => event.showOnFeed,
          );
          allEvents.push(...filtered);
        });
        allEvents.sort(
          (a, b) => a.timestamp.seconds - b.timestamp.seconds,
        );
        setEvents(allEvents);
      } catch (error) {
        console.error("Failed to load events", error);
      }
    };

    fetchEvents();
  }, [firebase]);

  const videoSource = width < 768 && width !== 0 ? MOBILE_VIDEO : DESKTOP_VIDEO;

  const noticeBanner = noticeInfo?.noticeMsg;
  const infoModal = noticeInfo?.infoModal;

  return (
    <div className="flex flex-col">
      {noticeBanner?.showNoticeMsg ? (
        <NoticeBanner
          title={noticeBanner.title}
          message={noticeBanner.message}
          link={noticeBanner.link}
          linkText={noticeBanner.linkText}
        />
      ) : null}

      <EventTicker
        items={events}
        speed={80}
        width={width}
        className="border-t border-white/10"
      />

      <section className="relative overflow-hidden">
        <video
          key={videoSource}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={videoSource} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        <div className="relative mx-auto flex min-h-[70vh] w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-20 text-center md:gap-8">
          <h1 className="text-4xl font-bold uppercase tracking-[0.2em] text-white drop-shadow md:text-5xl font-sans">
            Get in the Bunker!
          </h1>
          <p className="max-w-3xl text-sm font-semibold uppercase tracking-[0.35em] text-white/80 md:text-base">
            {HERO_TAGLINE}
          </p>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BookNowButton className="w-full" />
            <BookEventsButton className="w-full" />
            <BookLessonsButton className="w-full" />
            <LocationSelector className="w-full" />
          </div>
        </div>
      </section>

			      <section className="bg-zinc-950 py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 md:grid-cols-[1fr,1fr] md:items-center">
          <div className="space-y-6 text-left">
            <h2 className="text-3xl font-bold uppercase text-white md:text-4xl">
              Why Trackman?
            </h2>
            <h3 className="text-2xl font-semibold uppercase text-primary">
              It&apos;s not like the game, it is the game.
            </h3>
            <p className="text-sm leading-relaxed text-white/70">
              The Bunker uses the world&apos;s foremost golf simulator: TRACKMAN. Used by virtually all PGA professionals, Trackman provides the same tools that help elite golfers improve their game — now available to you.
            </p>
            <p className="text-sm leading-relaxed text-white/70">
              Whether you&apos;re practicing, competing with friends, or planning a private event, Trackman delivers unmatched realism and data to elevate every swing.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/60 p-4 shadow-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={UPCOMING_IMAGE}
              alt="Trackman Bay"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
        </div>

        <div className="mx-auto mt-12 grid w-full max-w-6xl gap-6 px-4 md:grid-cols-3">
          {TRACKMAN_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={feature.image}
                alt={feature.title}
                className="h-64 w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-left">
                <p className="text-sm font-semibold uppercase tracking-wide text-white">
                  {feature.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-black py-16">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 text-center">
          <h2 className="text-3xl font-bold uppercase tracking-wide text-white">
            Take a Tour
          </h2>
          <p className="text-sm text-white/70">
            Click the <strong>play</strong> button, then click the <strong>person</strong> icon to begin your tour!
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {TOUR_VIDEOS.map((tour) => (
              <div
                key={tour.src}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/60 shadow-xl"
              >
                <iframe
                  className="h-72 w-full md:h-[28rem]"
                  src={tour.src}
                  allowFullScreen
                  allow="xr-spatial-tracking"
                  loading="lazy"
                />
                {tour.cta ? (
                  <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/80 to-transparent p-4">
                    <ExternalLinkButton
                      title={tour.cta.title}
                      url={tour.cta.url}
                      className="shadow-lg"
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>



      <section className="relative overflow-hidden" aria-label="Let\'s play">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CTA_TEXTURE}
          alt="Golf texture"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-white/70" />
        <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center">
          <h2 className="text-4xl font-black uppercase tracking-widest text-black">
            Let&apos;s Play!
          </h2>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-black/70">
            Book your tee time now at one of our locations.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <BookNowButton />
            <BookEventsButton />
          </div>
        </div>
      </section>

      {infoModal?.showInfoModal ? (
        <InfoModal
          show={infoModal.showInfoModal}
          hide={() => setShowInfoModal(false)}
          data={infoModal}
          showConfetti={infoModal?.showConfetti === true}
        />
      ) : null}
    </div>
  );
}
