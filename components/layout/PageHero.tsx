const DEFAULT_PAGE_HERO_IMAGE = "/assets/Bunker_Trademarked_Desktop.png";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  align?: "center" | "left";
};

export function PageHero({
  title,
  subtitle,
  description,
  imageUrl,
  imageAlt = "",
  align = "center",
}: PageHeroProps) {
  const heroImage = imageUrl?.trim() || DEFAULT_PAGE_HERO_IMAGE;

  return (
    <section className="relative h-56 w-full overflow-hidden bg-black md:h-72">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={heroImage}
        alt={imageAlt || title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative flex h-full w-full items-center">
        <div
          className={`mx-auto max-w-4xl px-6 text-white ${
            align === "left" ? "text-left md:pl-24 lg:ml-12" : "text-center"
          }`}
        >
          {subtitle ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
              {subtitle}
            </p>
          ) : null}
          <h1 className="text-4xl font-black uppercase tracking-[0.4em] md:text-5xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-4 max-w-3xl text-sm font-normal text-white/80 md:text-base">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
