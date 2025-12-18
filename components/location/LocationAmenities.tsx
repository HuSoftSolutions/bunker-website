import Image from "next/image";
import clsx from "clsx";

type LocationAmenity = {
  icon: string;
  title: string;
};

type LocationAmenitiesProps = {
  amenities?: LocationAmenity[] | null;
  heading?: string;
  className?: string;
};

export function LocationAmenities({
  amenities,
  heading = "Amenities",
  className,
}: LocationAmenitiesProps) {
  if (!amenities || amenities.length === 0) {
    return null;
  }

  return (
    <section className={clsx("space-y-4", className)}>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/80">
        {heading}
      </h3>
      <ul className="grid grid-cols-2 gap-4 text-white sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {amenities.map((amenity) => (
          <li
            key={`${amenity.title}-${amenity.icon}`}
            className="group relative flex items-center justify-center"
            aria-label={amenity.title}
            tabIndex={0}
          >
            <Image
              src={amenity.icon}
              alt={amenity.title}
              width={32}
              height={32}
              title={amenity.title}
              className="h-8 w-8 filter brightness-0 invert object-contain"
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-3 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-900 shadow-lg group-focus-visible:block group-hover:block">
              {amenity.title}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
