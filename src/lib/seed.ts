/**
 * Seed data for the job board and the reviews list.
 *
 * Ported from the prototype's `SEED`, `SEED_REVIEWS` and `CREWS`, with two
 * deliberate changes:
 *
 *  - Dates are relative to the moment the store is first seeded rather than
 *    pinned to September 2026, so the live panel in the portal is actually
 *    live whenever someone opens it.
 *  - Every job carries the `counts` map it was priced from, and its inventory
 *    list and quoted range are computed from that map by the pricing engine.
 *    The prototype hand-wrote all three and they drifted apart; deriving them
 *    means the bill of lading can never disagree with the estimate.
 *
 * This is fixture data. Step 3 of the build plan replaces it with a seed
 * script against Postgres.
 */

import {
  type CrewSize,
  type ItemCounts,
  PRESETS,
  inventoryFor,
  quote,
} from "./pricing";
import { arrivalWindow, isoDate } from "./format";
import type { Crew, Job, JobStatus, PipelineStage, Review } from "./jobs";

export const CREWS: Crew[] = [
  { name: "Crew A", roster: "Tovar, Deng, Pike", size: 3 },
  { name: "Crew B", roster: "Ruiz, Hall", size: 2 },
  { name: "Crew C", roster: "Nakai, Bell, Frey", size: 3 },
  { name: "Crew D", roster: "Ostrom, Lail", size: 2 },
];

/** Days from the seed date. Negative is in the past. */
function dateFrom(base: Date, offsetDays: number): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
  return isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

type SeedSpec = {
  id: string;
  customer: string;
  phone: string;
  email: string;
  size: Job["size"];
  from: string;
  to: string;
  /** Days from the seed date. */
  offset: number;
  hour: number;
  movers: CrewSize;
  crew: string | null;
  status: JobStatus;
  stage: PipelineStage;
  counts: ItemCounts;
  /** How many inventory lines the crew has already ticked off. */
  loaded?: number;
  /** Hours before now that the crew clocked in. */
  clockedInHoursAgo?: number;
  hours?: number;
  photos?: number;
  late?: number;
  tasks?: { label: string; note: string; done: boolean }[];
  messages?: { who: string; text: string; mine: boolean; minutesAgo: number }[];
};

const SPECS: SeedSpec[] = [
  {
    id: "FM-8841",
    customer: "Doyle, D.",
    phone: "303.555.0186",
    email: "dana@example.com",
    size: "2 bed",
    from: "1420 Tennyson St, Denver",
    to: "Golden, CO",
    offset: 0,
    hour: 8,
    movers: 3,
    crew: "Crew A",
    status: "onsite",
    stage: "Booked",
    counts: { ...PRESETS["2 bed"], "Upright piano": 1, "Rug, rolled": 1 },
    loaded: 5,
    clockedInHoursAgo: 1.7,
    photos: 6,
    tasks: [
      {
        label: "Reserve the freight elevator",
        note: "Tennyson St. building needs a 2-hour HOA window",
        done: false,
      },
      {
        label: "Empty the filing cabinet",
        note: "We can’t move loaded cabinets safely",
        done: true,
      },
      {
        label: "Set aside anything you’re taking yourself",
        note: "Meds, documents, valuables",
        done: false,
      },
    ],
    messages: [
      {
        who: "Crew A",
        text: "On site and wrapping the sofa now. Piano is next.",
        mine: false,
        minutesAgo: 82,
      },
      {
        who: "You",
        text: "Great — the elevator is held until noon.",
        mine: true,
        minutesAgo: 74,
      },
    ],
  },
  {
    id: "FM-8842",
    customer: "Whitfield, R.",
    phone: "303.555.9021",
    email: "r.whitfield@example.com",
    size: "2 bed",
    from: "Wash Park, Denver",
    to: "Commerce City storage",
    offset: 0,
    hour: 9,
    movers: 3,
    crew: "Crew C",
    status: "onsite",
    stage: "Booked",
    counts: { ...PRESETS["2 bed"], "Bed, king": 1, Desk: 1, "Filing cabinet": 1 },
    loaded: 3,
    clockedInHoursAgo: 2.6,
    photos: 3,
    late: 45,
    tasks: [
      {
        label: "Sign the storage agreement",
        note: "Commerce City unit 114",
        done: true,
      },
    ],
    messages: [
      {
        who: "Crew C",
        text: "Elevator was held by another tenant — we’re about 45 minutes behind.",
        mine: false,
        minutesAgo: 120,
      },
    ],
  },
  {
    id: "FM-8843",
    customer: "Reyes Design",
    phone: "720.555.3390",
    email: "ops@reyes.design",
    size: "Office",
    from: "Commerce City",
    to: "RiNo, Denver",
    offset: 0,
    hour: 8,
    movers: 4,
    crew: "Crew B",
    status: "enroute",
    stage: "Booked",
    counts: {
      Desk: 9,
      "Office chair": 11,
      "Filing cabinet": 4,
      Monitor: 14,
      "Medium boxes": 30,
    },
    photos: 0,
  },
  {
    id: "FM-8844",
    customer: "Kaplan, D.",
    phone: "303.555.4412",
    email: "dkaplan@example.com",
    size: "3+ bed",
    from: "Littleton",
    to: "Parker",
    offset: 0,
    hour: 8,
    movers: 4,
    crew: null,
    status: "unassigned",
    stage: "Quoted",
    counts: { ...PRESETS["3+ bed"], "Upright piano": 1 },
  },
  {
    id: "FM-8845",
    customer: "Okonjo, A.",
    phone: "720.555.1180",
    email: "a.okonjo@example.com",
    size: "Studio",
    from: "Denver",
    to: "Denver",
    offset: 0,
    hour: 13,
    movers: 2,
    crew: null,
    status: "unassigned",
    stage: "Quoted",
    counts: { ...PRESETS.Studio, "Medium boxes": 12 },
  },
  {
    id: "FM-8839",
    customer: "Brenner, D.",
    phone: "303.555.7719",
    email: "d.brenner@example.com",
    size: "1 bed",
    from: "Denver",
    to: "Commerce City",
    offset: -1,
    hour: 7,
    movers: 2,
    crew: "Crew D",
    status: "complete",
    stage: "Complete",
    counts: { ...PRESETS["1 bed"], "Medium boxes": 15 },
    hours: 4,
    photos: 4,
    messages: [
      {
        who: "Crew D",
        text: "All delivered and signed for. Pads and wardrobe boxes collected.",
        mine: false,
        minutesAgo: 900,
      },
    ],
  },
  {
    id: "FM-8846",
    customer: "Nyland, S.",
    phone: "303.555.7734",
    email: "s.nyland@example.com",
    size: "1 bed",
    from: "Aurora",
    to: "Aurora",
    offset: 14,
    hour: 8,
    movers: 2,
    crew: null,
    status: "lead",
    stage: "New",
    counts: {},
  },
  {
    id: "FM-8847",
    customer: "Baumann Dental",
    phone: "303.555.6600",
    email: "office@baumanndental.com",
    size: "Office",
    from: "Denver",
    to: "Arvada",
    offset: 21,
    hour: 8,
    movers: 4,
    crew: null,
    status: "lead",
    stage: "Survey set",
    counts: {},
  },
];

function jobFrom(spec: SeedSpec, base: Date, now: number): Job {
  const priced = quote({ counts: spec.counts, movers: spec.movers });
  const items = inventoryFor(spec.counts).map((line, i) => ({
    ...line,
    done: i < (spec.loaded ?? 0) || spec.status === "complete",
  }));

  return {
    id: spec.id,
    customer: spec.customer,
    phone: spec.phone,
    email: spec.email,
    size: spec.size,
    from: spec.from,
    to: spec.to,
    date: dateFrom(base, spec.offset),
    window: spec.status === "lead" ? "Not set" : arrivalWindow(spec.hour),
    movers: spec.movers,
    crew: spec.crew,
    status: spec.status,
    stage: spec.stage,
    low: priced.low,
    high: priced.high,
    counts: spec.counts,
    fromFloor: "Ground",
    toFloor: "Ground",
    elevator: false,
    packing: false,
    clockIn: spec.clockedInHoursAgo
      ? now - spec.clockedInHoursAgo * 3_600_000
      : null,
    hours: spec.hours ?? null,
    photos: spec.photos ?? 0,
    paid: false,
    reviewed: false,
    late: spec.late ?? null,
    cardLast4: null,
    items,
    tasks: spec.tasks ?? [],
    messages: (spec.messages ?? []).map((m) => ({
      who: m.who,
      text: m.text,
      mine: m.mine,
      at: now - m.minutesAgo * 60_000,
    })),
    createdAt: now - (spec.offset <= 0 ? 9 : 2) * 86_400_000,
  };
}

type ReviewSpec = Omit<Review, "id" | "date"> & {
  /** Days before the seed date that the move happened. */
  offset: number;
};

const REVIEW_SPECS: ReviewSpec[] = [
  {
    who: "Marguerite O.",
    where: "Wash Park → Arvada",
    stars: 5,
    text: "They wrapped the piano twice and refused a tip. Four hours, no scratches, no drama.",
    crew: "Crew A",
    offset: -6,
  },
  {
    who: "Devon R.",
    where: "Office · Commerce City → RiNo",
    stars: 5,
    text: "Moved our studio over a Saturday. Every crate labeled by room, desks reassembled before Monday standup.",
    crew: "Crew B",
    offset: -34,
  },
  {
    who: "Priya S.",
    where: "Studio · Denver local",
    stars: 4,
    text: "Arrived fifteen minutes late and told me before I had to ask. Bill came in under the estimate.",
    crew: "Crew D",
    offset: -41,
  },
  {
    who: "Tomas L.",
    where: "3 bed · Littleton → Parker",
    stars: 5,
    text: "Third-floor walk-up on both ends and they never once complained. Same price they quoted.",
    crew: "Crew C",
    offset: -68,
  },
];

export type SeedData = {
  jobs: Job[];
  reviews: Review[];
  crews: Crew[];
  /** Next quote reference. The prototype starts at 8848. */
  sequence: number;
};

export function seedData(now: number = Date.now()): SeedData {
  const base = new Date(now);
  return {
    jobs: SPECS.map((spec) => jobFrom(spec, base, now)),
    reviews: REVIEW_SPECS.map((r, i) => ({
      id: "RV-" + (100 + i),
      who: r.who,
      where: r.where,
      stars: r.stars,
      text: r.text,
      crew: r.crew,
      date: dateFrom(base, r.offset),
    })),
    crews: CREWS,
    sequence: 8848,
  };
}
