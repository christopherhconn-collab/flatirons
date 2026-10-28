import type { Metadata } from "next";

import { LogoLockup } from "@/components/logo";
import { fetchNativePhotos, type NativePhoto } from "@/lib/native-photos";
import {
  CATEGORIES,
  NATIVES,
  NATIVES_INTRO,
  NATIVES_ORIGIN,
  NATIVES_SOURCES,
  type Native,
  wikiUrl,
} from "@/lib/natives";
import { SHELL } from "@/lib/site";
import { CANONICAL_ORIGIN } from "@/lib/site-url";

/**
 * Colorado Plant Select Natives — drought-tolerant Front Range plants, from
 * `denver-native-drought-plants.xlsx`.
 *
 * Served at the root of its own subdomain (the host rewrite is in
 * `next.config.ts`), so it carries its own light chrome rather than the
 * marketing nav: relative links from here would land on the subdomain, not
 * on the main site. Every link back is absolute.
 */

export const metadata: Metadata = {
  title: "Colorado Plant Select Natives — Flatirons Movers",
  description:
    "27 drought-tolerant Colorado native wildflowers, grasses, shrubs and trees for Denver and Front Range yards, with photos, bloom times and growing notes.",
  alternates: { canonical: NATIVES_ORIGIN },
};

export default async function NativesPage() {
  const photos = await fetchNativePhotos(NATIVES.map((plant) => plant.wiki));

  return (
    <>
      <header className="border-line border-b">
        <div className={`${SHELL} flex flex-wrap items-center justify-between gap-4 py-[18px]`}>
          <a href={CANONICAL_ORIGIN} className="flex-none" aria-label="Flatirons Movers, home">
            <LogoLockup markWidth={40} wordSize={19} subSize={9.5} />
          </a>
          <a
            href={CANONICAL_ORIGIN}
            className="text-ink-muted hover:text-ink text-[12px] leading-none font-medium tracking-[0.1em] uppercase"
          >
            flatironsmoves.com →
          </a>
        </div>
      </header>

      <main className="flex-1">
        <section className="topo border-line border-b">
          <div className={`${SHELL} pt-[46px] pb-10`}>
            <p className="text-olive mb-4 text-[11px] leading-none font-medium tracking-[0.22em] uppercase">
              Drought-tolerant natives · Denver / Front Range
            </p>
            <h1 className="text-h1-sm mb-4 max-md:text-[42px]">
              Colorado Plant Select Natives
            </h1>
            <p className="text-body-lg text-ink-lede max-w-[760px]">{NATIVES_INTRO}</p>

            <nav
              aria-label="Plant categories"
              className="mt-7 flex flex-wrap gap-2 text-[12px] leading-none font-medium tracking-[0.1em] uppercase"
            >
              {CATEGORIES.map((category) => (
                <a
                  key={category.id}
                  href={`#${category.id}`}
                  className="border-line-strong bg-paper interactive hover:border-olive border px-3.5 py-2.5"
                >
                  {category.plural}{" "}
                  <span className="text-ink-quiet">
                    {NATIVES.filter((plant) => plant.category === category.id).length}
                  </span>
                </a>
              ))}
              <span className="bg-olive-wash text-olive-dark flex items-center gap-2 px-3.5 py-2.5">
                <PlantSelectMark /> Plant Select pick
              </span>
            </nav>
          </div>
        </section>

        {CATEGORIES.map((category) => (
          <section
            key={category.id}
            id={category.id}
            className={`${SHELL} scroll-mt-4 pt-12`}
            aria-labelledby={`${category.id}-h`}
          >
            <h2 id={`${category.id}-h`} className="text-h2 mb-5">
              {category.plural}
            </h2>
            <ul className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {NATIVES.filter((plant) => plant.category === category.id).map((plant) => (
                <PlantCard key={plant.wiki} plant={plant} photo={photos.get(plant.wiki)} />
              ))}
            </ul>
          </section>
        ))}

        <section className={`${SHELL} pt-12 pb-14`}>
          <div className="bg-surface border-line border px-6 py-5">
            <p className="text-kicker text-olive-dark mb-3 uppercase">Sources to verify / buy</p>
            <ul className="text-body-sm flex flex-wrap gap-x-6 gap-y-2">
              {NATIVES_SOURCES.map((source) => (
                <li key={source.label}>
                  <a href={source.href} className="text-ink underline decoration-[rgb(22_40_63/0.3)] underline-offset-4 hover:decoration-current">
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-meta text-ink-muted mt-4">
              Photos from Wikipedia / Wikimedia Commons — select any photo for its
              photographer and licence.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-ink mt-auto">
        <div
          className={`${SHELL} text-cream-muted flex flex-wrap items-center justify-between gap-4 py-6 text-[11.5px] leading-none`}
        >
          <span>Colorado Plant Select Natives · a Flatirons Movers guide</span>
          <a href={CANONICAL_ORIGIN} className="hover:text-olive-pale">
            Moving in the Denver metro? flatironsmoves.com
          </a>
        </div>
      </footer>
    </>
  );
}

function PlantCard({ plant, photo }: { plant: Native; photo?: NativePhoto }) {
  return (
    <li className="bg-paper border-line flex flex-col border">
      <div className="bg-surface relative aspect-[4/3] overflow-hidden">
        {photo ? (
          <a href={photo.credit} title="Photo credit and licence">
            {/* Wikimedia already serves a sized thumbnail; routing it through
                the image optimiser would only re-encode someone else's CDN. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              width={photo.width}
              height={photo.height}
              alt={`${plant.common} (${plant.botanical})`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </a>
        ) : (
          <a
            href={wikiUrl(plant.wiki)}
            className="text-ink-muted hover:text-ink flex h-full items-center justify-center text-[12px] font-medium tracking-[0.1em] uppercase"
          >
            View photo →
          </a>
        )}
        {plant.plantSelect && (
          <span className="bg-olive absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] leading-none font-semibold tracking-[0.12em] text-[#f7f6f2] uppercase">
            <PlantSelectMark /> Plant Select
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
        <p className="text-kicker-sm text-olive-dark mb-2 uppercase">
          {CATEGORIES.find((category) => category.id === plant.category)?.label}
        </p>
        <h3 className="text-card-title-sm">{plant.common}</h3>
        <p className="text-ink-body mb-4 text-[14px] italic">{plant.botanical}</p>

        <dl className="text-body-sm grid gap-3">
          <div>
            <dt className="text-label text-ink-muted mb-1 uppercase">Look / bloom</dt>
            <dd>{plant.look}</dd>
          </div>
          <div>
            <dt className="text-label text-ink-muted mb-1 uppercase">Notes</dt>
            <dd>{plant.notes}</dd>
          </div>
        </dl>

        <a
          href={wikiUrl(plant.wiki)}
          className="text-olive-dark hover:text-ink mt-auto pt-4 text-[12px] leading-none font-semibold tracking-[0.1em] uppercase"
        >
          More on Wikipedia →
        </a>
      </div>
    </li>
  );
}

/** A four-petal sprig — the Plant Select marker. */
function PlantSelectMark() {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
      <path
        d="M6 0 C7.6 2.2 7.6 3.8 6 6 C4.4 3.8 4.4 2.2 6 0 Z M6 12 C4.4 9.8 4.4 8.2 6 6 C7.6 8.2 7.6 9.8 6 12 Z M0 6 C2.2 4.4 3.8 4.4 6 6 C3.8 7.6 2.2 7.6 0 6 Z M12 6 C9.8 7.6 8.2 7.6 6 6 C8.2 4.4 9.8 4.4 12 6 Z"
        fill="currentColor"
      />
    </svg>
  );
}
