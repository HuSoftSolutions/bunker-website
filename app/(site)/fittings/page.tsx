"use client";

import { PageHero } from "@/components/layout/PageHero";
import { FittingInquiryForm } from "@/components/fittings/FittingInquiryForm";
import { useFittingsConfig } from "@/hooks/useFittingsConfig";
import { useFirebase } from "@/providers/FirebaseProvider";

export default function FittingsPage() {
  const firebase = useFirebase();
  const { config } = useFittingsConfig(firebase);

  return (
    <div className="flex flex-col">
      <PageHero
        title={config.heroTitle || "Club Fitting"}
        subtitle={config.heroSubtitle ?? undefined}
        description={config.heroDescription ?? undefined}
        imageUrl={config.heroImageUrl ?? undefined}
      />

      <section className="mx-auto w-full max-w-5xl px-4 py-16 text-white/80">
        <div className="space-y-12">
          {config.feeItems.length ? (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">
                Fitting Fees
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                {config.feeItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                  >
                    <h3 className="text-lg font-semibold uppercase tracking-wide text-white">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="mt-3 text-sm text-white/70">{item.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
              {config.feeNote ? (
                <p className="text-sm text-white/70">{config.feeNote}</p>
              ) : null}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/20 bg-black/20 px-6 py-12 text-center text-white/60">
              Fitting information is being updated. Check back soon.
            </div>
          )}

          {firebase ? (
            <FittingInquiryForm firebase={firebase} config={config} />
          ) : null}
        </div>
      </section>
    </div>
  );
}
