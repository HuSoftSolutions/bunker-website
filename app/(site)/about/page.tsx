import { PageHero } from "@/components/layout/PageHero";

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      <PageHero
        title="About"
        subtitle="The Bunker Story"
        description="The Bunker blends premium indoor golf technology with a lively hospitality experience. Learn how we got started and where we’re headed next."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="space-y-8 text-white/80">
          <p>
            What began as a passion project has grown into the Northeast&apos;s
            premier indoor golf and social lounge. Each Bunker location features
            TrackMan bays, scratch-made food, and curated beverage programs,
            creating an environment where golfers and non-golfers alike can feel
            at home.
          </p>
          <p>
            We host leagues, corporate outings, celebrations, and everyday
            drop-ins—from first swings to competitive practice sessions. Our
            team is committed to hospitality, continuous improvement, and
            delivering memorable experiences for every guest who walks through
            our doors.
          </p>
          <p>
            Have questions about our story or want to work with us? Reach out
            through the contact form and we&apos;ll follow up shortly.
          </p>
        </div>
      </section>
    </div>
  );
}
