/**
 * The estimator's server-side view model.
 *
 * SERVER ONLY.
 *
 * Everything the price rail, the crew cards and the confirm table display is
 * computed here and shipped to the browser as finished strings. The client
 * component holds the *selections* so the UI feels immediate; it never holds
 * a rate, an hour count or a range, because a browser-computed price is
 * user-editable and therefore not a price (README.md).
 */

import {
  CATALOG,
  CONFIG,
  type CrewSize,
  DEFAULT_CREW,
  FLOORS,
  type Floor,
  HOME_SIZES,
  type HomeSize,
  type ItemCounts,
  PRESETS,
  ROOMS,
  type RoomName,
  catalogItem,
  quote,
} from "./pricing";
import {
  DOW_LABELS,
  dateLabel,
  daysInMonth,
  isoDate,
  money,
  monthTitle,
  parseDate,
} from "./format";
import type { QuoteDraft } from "./store";

/** How far out the first offered date sits when the customer has not picked. */
export const LEAD_DAYS = 7;

/* ═══════════════════════════════════════════════════════════════════════════
   Drafts
   ═══════════════════════════════════════════════════════════════════════════ */

export function emptyDraft(id: string, ref: string): QuoteDraft {
  return {
    id,
    ref,
    from: "",
    to: "",
    fromFloor: "Ground",
    toFloor: "Ground",
    elevator: false,
    size: "2 bed",
    date: "",
    movers: DEFAULT_CREW["2 bed"],
    packing: false,
    counts: { ...PRESETS["2 bed"] },
    name: "",
    email: "",
    phone: "",
    cardNumber: "",
    cardExpiry: "",
    step: 1,
    room: "Living room",
    updatedAt: Date.now(),
  };
}

/**
 * A change from the browser. Every field is re-validated on arrival — these
 * arrive over a POST that anyone can craft, not only through our own UI.
 */
export type EstimatePatch = {
  from?: string;
  to?: string;
  fromFloor?: string;
  toFloor?: string;
  elevator?: boolean;
  size?: string;
  date?: string;
  movers?: number;
  packing?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  cardNumber?: string;
  cardExpiry?: string;
  step?: number;
  room?: string;
  /** Adjust one catalogue item's count by a delta. */
  bump?: { name: string; delta: number };
};

const TEXT_LIMIT = 200;

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.slice(0, TEXT_LIMIT);
}

function isFloor(value: unknown): value is Floor {
  return typeof value === "string" && (FLOORS as string[]).includes(value);
}

function isHomeSize(value: unknown): value is HomeSize {
  return typeof value === "string" && (HOME_SIZES as string[]).includes(value);
}

function isRoom(value: unknown): value is RoomName {
  return typeof value === "string" && (ROOMS as string[]).includes(value);
}

function isCrewSize(value: unknown): value is CrewSize {
  return value === 2 || value === 3 || value === 4;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Fold a patch into a draft, dropping anything that does not typecheck.
 *
 * Choosing a home size replaces the inventory with that size's preset and sets
 * the default crew — a deliberate overwrite, and the reason most customers
 * reach a usable estimate in under a minute (README.md, "Interactions").
 */
export function applyPatch(draft: QuoteDraft, patch: EstimatePatch): QuoteDraft {
  const next: QuoteDraft = { ...draft, counts: { ...draft.counts } };

  const from = text(patch.from);
  if (from !== undefined) next.from = from;
  const to = text(patch.to);
  if (to !== undefined) next.to = to;
  const name = text(patch.name);
  if (name !== undefined) next.name = name;
  const email = text(patch.email);
  if (email !== undefined) next.email = email;
  const phone = text(patch.phone);
  if (phone !== undefined) next.phone = phone;

  // Held only so the confirm step can echo the last four digits back. Stripe
  // Elements replaces this at step 9 and the number never reaches our server.
  const cardNumber = text(patch.cardNumber);
  if (cardNumber !== undefined) next.cardNumber = cardNumber.replace(/[^\d ]/g, "");
  const cardExpiry = text(patch.cardExpiry);
  if (cardExpiry !== undefined) next.cardExpiry = cardExpiry.slice(0, 7);

  if (isFloor(patch.fromFloor)) next.fromFloor = patch.fromFloor;
  if (isFloor(patch.toFloor)) next.toFloor = patch.toFloor;
  if (typeof patch.elevator === "boolean") next.elevator = patch.elevator;
  if (typeof patch.packing === "boolean") next.packing = patch.packing;
  if (isRoom(patch.room)) next.room = patch.room;
  if (isCrewSize(patch.movers)) next.movers = patch.movers;
  if (patch.date !== undefined && (patch.date === "" || ISO_DATE.test(patch.date))) {
    next.date = patch.date;
  }
  if (typeof patch.step === "number" && patch.step >= 1 && patch.step <= 4) {
    next.step = Math.round(patch.step) as QuoteDraft["step"];
  }

  if (isHomeSize(patch.size)) {
    next.size = patch.size;
    next.movers = isCrewSize(patch.movers) ? patch.movers : DEFAULT_CREW[patch.size];
    next.counts = { ...PRESETS[patch.size] };
  }

  if (patch.bump && catalogItem(patch.bump.name)) {
    const { name: item, delta } = patch.bump;
    const bumped = Math.max(0, (next.counts[item] ?? 0) + Math.trunc(delta));
    if (bumped) next.counts[item] = bumped;
    else delete next.counts[item];
  }

  return next;
}

/* ═══════════════════════════════════════════════════════════════════════════
   The view
   ═══════════════════════════════════════════════════════════════════════════ */

export type PriceLine = { label: string; value: string; accent?: boolean };
export type MoverOption = {
  movers: CrewSize;
  label: string;
  rate: string;
  note: string;
  estimate: string;
  selected: boolean;
};
export type ItemRow = {
  name: string;
  handling: string;
  /** Handling text goes olive when the item carries a surcharge. */
  surcharge: boolean;
  count: number;
};
export type RoomTab = { room: RoomName; label: string; count: number; active: boolean };
export type DayCell = {
  /** Empty string for the leading blanks before the 1st. */
  label: string;
  date: string;
  state: "blank" | "open" | "booked" | "past" | "selected";
};
export type CalendarView = {
  title: string;
  year: number;
  month: number;
  dayLabels: readonly string[];
  cells: DayCell[];
  canGoBack: boolean;
  canGoForward: boolean;
};

export type EstimateView = {
  ref: string;
  step: 1 | 2 | 3 | 4;
  room: RoomName;
  from: string;
  to: string;
  fromFloor: Floor;
  toFloor: Floor;
  elevator: boolean;
  size: HomeSize;
  date: string;
  dateText: string;
  movers: CrewSize;
  packing: boolean;
  name: string;
  email: string;
  phone: string;
  cardNumber: string;
  cardExpiry: string;

  hasItems: boolean;
  priceRange: string;
  priceBasis: string;
  /** What the range leaves out. Shown wherever the range is. */
  travelNote: string;
  priceLines: PriceLine[];
  inventorySummary: string;
  itemRows: ItemRow[];
  roomTabs: RoomTab[];
  moverOptions: MoverOption[];
  calendar: CalendarView;
  confirmRows: { label: string; value: string }[];
  bookNote: string;
  /** Null when the draft is bookable; otherwise why it is not. */
  blockedReason: string | null;
};

export type ViewContext = {
  /** `YYYY-MM-DD` values with no crew left. */
  bookedOut: string[];
  /** Today, as `YYYY-MM-DD`. Passed in so this stays deterministic. */
  today: string;
  /** Which month the calendar is showing. */
  month?: { year: number; month: number };
};

/**
 * The range is labour plus item surcharges; travel is billed on top of it and
 * the engine cannot price it until step 6 resolves real mileage. Say so
 * wherever the range appears — the confirm step especially, because that is
 * the screen the customer commits on.
 */
const TRAVEL_SUMMARY = `$${CONFIG.travel.flat} metro, or $${CONFIG.travel.perLoadedMile}/loaded mile`;
const TRAVEL_NOTE = `Crew and truck only. Travel is added on the day — ${TRAVEL_SUMMARY}.`;

const MOVER_NOTE: Record<CrewSize, string> = {
  2: "Studios and one-bedrooms",
  3: "Most two and three-bedrooms",
  4: "Big houses, offices, tight windows",
};

/** The first day at least `LEAD_DAYS` out that still has a crew. */
export function firstOpenDate(today: string, bookedOut: string[]): string {
  const { year, month, day } = parseDate(today);
  for (let offset = LEAD_DAYS; offset < LEAD_DAYS + 120; offset++) {
    const d = new Date(year, month - 1, day + offset);
    const iso = isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (!bookedOut.includes(iso)) return iso;
  }
  return today;
}

function buildCalendar(
  selected: string,
  { bookedOut, today, month }: ViewContext,
): CalendarView {
  const anchor = month ?? parseDate(selected || today);
  const { year, month: m } = { year: anchor.year, month: anchor.month };
  const first = new Date(year, m - 1, 1).getDay();
  const total = daysInMonth(year, m);

  const cells: DayCell[] = [];
  for (let i = 0; i < first; i++) {
    cells.push({ label: "", date: "", state: "blank" });
  }
  for (let day = 1; day <= total; day++) {
    const date = isoDate(year, m, day);
    const state: DayCell["state"] =
      date === selected
        ? "selected"
        : date < today
          ? "past"
          : bookedOut.includes(date)
            ? "booked"
            : "open";
    cells.push({ label: String(day), date, state });
  }

  const currentMonth = parseDate(today);
  return {
    title: monthTitle(year, m),
    year,
    month: m,
    dayLabels: DOW_LABELS,
    cells,
    // Never page back past the month we are in, and cap forward paging at a
    // year out — the board does not exist beyond that.
    canGoBack: year * 12 + m > currentMonth.year * 12 + currentMonth.month,
    canGoForward: year * 12 + m < currentMonth.year * 12 + currentMonth.month + 12,
  };
}

/**
 * Price a draft and turn it into everything the estimator renders.
 *
 * This is the only place a price is produced for the estimator, and it runs on
 * the server.
 */
export function buildView(draft: QuoteDraft, context: ViewContext): EstimateView {
  const priced = quote({
    counts: draft.counts,
    movers: draft.movers,
    fromFloor: draft.fromFloor,
    toFloor: draft.toFloor,
    elevator: draft.elevator,
    packing: draft.packing,
  });
  const hasItems = priced.units > 0;
  const date = draft.date || firstOpenDate(context.today, context.bookedOut);

  const priceLines: PriceLine[] = [
    { label: "Labor & truck", value: `$${priced.rate}/hr` },
    {
      label: "Estimated hours",
      value: hasItems ? `${priced.hours.toFixed(1)} hrs` : "—",
    },
    ...priced.extras.map((extra) => ({
      label: extra.label,
      value: money(extra.amount),
    })),
    {
      label: draft.elevator ? "Elevator reserved" : "Stair carry",
      value: draft.elevator
        ? "No premium"
        : draft.fromFloor === "Ground" && draft.toFloor === "Ground"
          ? "None"
          : "Included",
    },
    // Billed, but not in the range above it — see CONFIG.travel. Listed here
    // so the rail does not read as a complete account of the bill.
    { label: "Travel", value: "Added on the day" },
    { label: "Deposit", value: "$0", accent: true },
  ];

  const moverOptions: MoverOption[] = ([2, 3, 4] as CrewSize[]).map((movers) => {
    // Priced through the same engine as the rail, so the hours on the card are
    // the hours the customer gets if they pick that crew. The prototype
    // computed these without the stair multipliers and the two disagreed
    // whenever the move had stairs.
    const alt = quote({
      counts: draft.counts,
      movers,
      fromFloor: draft.fromFloor,
      toFloor: draft.toFloor,
      elevator: draft.elevator,
      packing: draft.packing,
    });
    return {
      movers,
      label: `${movers} movers + truck`,
      rate: `$${CONFIG.rates[movers]}/hr`,
      note: MOVER_NOTE[movers],
      estimate: hasItems ? `≈ ${alt.hours.toFixed(1)} hrs` : "Add items",
      selected: draft.movers === movers,
    };
  });

  const itemRows: ItemRow[] = CATALOG[
    (isRoom(draft.room) ? draft.room : "Living room") as RoomName
  ].map((item) => ({
    name: item.name,
    handling: item.handling,
    surcharge: Boolean(item.surcharge),
    count: draft.counts[item.name] ?? 0,
  }));

  const roomTabs: RoomTab[] = ROOMS.map((room) => {
    const count = CATALOG[room].reduce(
      (total, item) => total + (draft.counts[item.name] ?? 0),
      0,
    );
    return {
      room,
      label: count ? `${room} · ${count}` : room,
      count,
      active: room === draft.room,
    };
  });

  const range = hasItems ? `${money(priced.low)}–${money(priced.high)}` : "Add items";

  const blockedReason = !hasItems
    ? "Add a few items first — step 2."
    : !draft.name.trim()
      ? "Add your name so we know who to call."
      : !draft.phone.trim()
        ? "Add a mobile number — the crew texts on the morning."
        : !draft.email.trim()
          ? "Add an email for the confirmation and the estimate PDF."
          : context.bookedOut.includes(date)
            ? "That day filled up. Pick another in step 3."
            : null;

  return {
    ref: draft.ref,
    step: draft.step,
    room: (isRoom(draft.room) ? draft.room : "Living room") as RoomName,
    from: draft.from,
    to: draft.to,
    fromFloor: draft.fromFloor,
    toFloor: draft.toFloor,
    elevator: draft.elevator,
    size: draft.size,
    date,
    dateText: dateLabel(date),
    movers: draft.movers,
    packing: draft.packing,
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    cardNumber: draft.cardNumber,
    cardExpiry: draft.cardExpiry,

    hasItems,
    priceRange: range,
    priceBasis: hasItems
      ? `Based on ${priced.hours.toFixed(1)} hrs, ${draft.movers} movers, one truck.`
      : "Pick a home size or count a few rooms and the range appears here.",
    travelNote: TRAVEL_NOTE,
    priceLines,
    inventorySummary: priced.itemCount
      ? `${priced.itemCount} items · ${priced.units} volume units · ${dateLabel(date)}`
      : "Nothing counted yet.",
    itemRows,
    roomTabs,
    moverOptions,
    calendar: buildCalendar(date, context),
    confirmRows: [
      { label: "Move date", value: dateLabel(date) },
      { label: "Route", value: `${draft.from || "Denver"} → ${draft.to || "Denver"}` },
      {
        label: "Access",
        value: `${draft.fromFloor} → ${draft.toFloor}${draft.elevator ? " · elevator" : ""}`,
      },
      { label: "Crew", value: `${draft.movers} movers · $${priced.rate}/hr` },
      { label: "Inventory", value: `${priced.itemCount} items` },
      { label: "Estimate", value: hasItems ? range : "—" },
      { label: "Travel", value: TRAVEL_SUMMARY },
      { label: "Due today", value: "$0" },
    ],
    bookNote: hasItems
      ? "You can change anything up to 48 hours before."
      : "Add a few items first — step 2.",
    blockedReason,
  };
}

/** The inventory a booking writes, with quantities folded into the names. */
export function draftCounts(draft: QuoteDraft): ItemCounts {
  return { ...draft.counts };
}
