/**
 * Seed script.
 *
 * Writes the item catalogue, the four crews, the quote-reference counter, and
 * the fixture jobs and reviews that make every state in the portal reachable.
 *
 * Idempotent: catalogue, crews and the counter are upserted, so re-running
 * against a database that already has them is safe. Jobs and reviews are
 * skipped entirely if any job already exists — re-seeding a database someone
 * has been clicking around in would otherwise silently duplicate their work.
 * Pass `--force` to clear and rewrite them.
 *
 *   npm run db:seed
 *   npm run db:seed -- --force
 */

// Next loads `.env` for the app; a bare script does not, so it is loaded here.
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { migrationDatabaseUrl } from "../src/lib/db-url";
import { CATALOG, ROOMS } from "../src/lib/pricing";
import { seedData } from "../src/lib/seed";

const STAGE_TO_DB = {
  New: "New",
  "Survey set": "SurveySet",
  Quoted: "Quoted",
  Booked: "Booked",
  Complete: "Complete",
} as const;

// The direct URL, same as migrations: seeding runs alongside `db:deploy` at
// release time, and pinning both to one connection string means a deploy
// cannot half-succeed because the two steps reached different endpoints.
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: migrationDatabaseUrl() }),
});

async function main() {
  const force = process.argv.includes("--force");
  const data = seedData();

  // ── Catalogue ────────────────────────────────────────────────────────────
  // The engine's `CATALOG` stays the source of truth; this mirrors it into the
  // database so the office can eventually edit handling notes and surcharges
  // without a deploy. Volume units are still engine-owned — they are tuned
  // against the published bands and must not drift.
  let position = 0;
  for (const room of ROOMS) {
    for (const item of CATALOG[room]) {
      const row = {
        room,
        volumeUnits: item.volumeUnits,
        handling: item.handling,
        surcharge: item.surcharge ?? null,
        surchargeLabel: item.surchargeLabel ?? null,
        position: position++,
      };
      await prisma.catalogItem.upsert({
        where: { name: item.name },
        create: { name: item.name, ...row },
        update: row,
      });
    }
  }
  console.log(`catalogue: ${position} items`);

  // ── Crews ────────────────────────────────────────────────────────────────
  for (const crew of data.crews) {
    await prisma.crew.upsert({
      where: { name: crew.name },
      create: { name: crew.name, roster: crew.roster, size: crew.size },
      update: { roster: crew.roster, size: crew.size },
    });
  }
  console.log(`crews: ${data.crews.length}`);

  // ── Reference counter ────────────────────────────────────────────────────
  // Only created, never reset: rewinding it would re-issue references that
  // customers already have on a confirmation.
  await prisma.counter.upsert({
    where: { name: "quote_ref" },
    create: { name: "quote_ref", value: data.sequence },
    update: {},
  });
  console.log(`counter: next reference FM-${data.sequence}`);

  // ── Fixture jobs and reviews ─────────────────────────────────────────────
  const existing = await prisma.job.count();
  if (existing && !force) {
    console.log(`jobs: ${existing} already present, skipping (--force to replace)`);
    return;
  }
  if (existing) {
    // Children cascade from the job; reviews are cleared separately because
    // theirs is a nullable link, not a cascade.
    await prisma.review.deleteMany({});
    await prisma.job.deleteMany({});
    console.log(`jobs: cleared ${existing}`);
  }

  const crewIds = new Map(
    (await prisma.crew.findMany()).map((c) => [c.name, c.id]),
  );

  for (const job of data.jobs) {
    await prisma.job.create({
      data: {
        id: job.id,
        customer: job.customer,
        phone: job.phone,
        email: job.email,
        size: job.size,
        fromAddress: job.from,
        toAddress: job.to,
        date: job.date,
        window: job.window,
        movers: job.movers,
        crewId: job.crew ? (crewIds.get(job.crew) ?? null) : null,
        status: job.status,
        stage: STAGE_TO_DB[job.stage],
        low: job.low,
        high: job.high,
        counts: job.counts,
        fromFloor: job.fromFloor,
        toFloor: job.toFloor,
        elevator: job.elevator,
        packing: job.packing,
        clockIn: job.clockIn ? new Date(job.clockIn) : null,
        hours: job.hours,
        photos: job.photos,
        paid: job.paid,
        reviewed: job.reviewed,
        late: job.late,
        cardLast4: job.cardLast4,
        createdAt: new Date(job.createdAt),
        items: {
          create: job.items.map((item, i) => ({ ...item, position: i })),
        },
        tasks: {
          create: job.tasks.map((task, i) => ({ ...task, position: i })),
        },
        messages: {
          create: job.messages.map((m) => ({
            who: m.who,
            text: m.text,
            mine: m.mine,
            at: new Date(m.at),
          })),
        },
      },
    });
  }
  console.log(`jobs: ${data.jobs.length}`);

  // Written oldest first so `createdAt` ordering puts the newest on top of
  // /reviews, which is where a customer's fresh review has to land.
  for (const review of [...data.reviews].reverse()) {
    await prisma.review.create({
      data: {
        id: review.id,
        who: review.who,
        place: review.where,
        stars: review.stars,
        text: review.text,
        date: review.date,
        crew: review.crew,
      },
    });
  }
  console.log(`reviews: ${data.reviews.length}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
