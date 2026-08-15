/**
 * Flatirons Movers — pricing engine.
 *
 * Ported verbatim from the `quote()` method and the CATALOG / RATES / PRESETS /
 * THROUGHPUT / MIN_HOURS constants in `design/Flatirons Movers App.dc.html`.
 *
 * SERVER ONLY. Never import this from a client component. The prototype
 * computes prices in the browser for demo purposes; a browser-computed price is
 * user-editable and therefore not a price. Every number a customer sees must
 * come from a server action or a build-time call.
 *
 * The module is pure and dependency-free: no I/O, no clock, no randomness. That
 * is what makes it testable against historical jobs.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   Configuration

   Every tunable number lives here so the quarterly re-tune against real jobs
   touches this object and nothing else. The build plan's Stage 0 exists
   specifically to fit these to 60 completed jobs; expect them to move.

   These should ultimately be loaded from the database rather than a deploy —
   see README.md, "These constants must be configurable without a deploy."
   ═══════════════════════════════════════════════════════════════════════════ */

export const CONFIG = {
  /** Hourly rate by crew size, in whole dollars. */
  rates: { 2: 149, 3: 199, 4: 249 } as Record<CrewSize, number>,

  /** Volume units one mover clears per hour. The single most sensitive value. */
  throughput: 9,

  /** Published three-hour minimum. Applied after the access multipliers. */
  minHours: 3,

  /**
   * Access multipliers, applied when the floor is above ground and no service
   * elevator is reserved. Note the prototype treats 2nd, 3rd and 4th+
   * identically — the multiplier does not scale with height.
   */
  stairsPickup: 1.12,
  stairsDropoff: 1.08,

  /** Packing crew the day before: hours × factor × rate, rounded to a dollar. */
  packing: { hoursFactor: 0.6, ratePerHour: 65 },

  /** The quoted range as multipliers on the point estimate. */
  range: { low: 0.9, high: 1.15 },

  /** Both ends of the range are rounded to this increment. */
  roundTo: 10,

  /** Flat materials charge on the final invoice. */
  materials: 28,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

export type CrewSize = 2 | 3 | 4;
export type Floor = "Ground" | "2nd" | "3rd" | "4th+";
export type HomeSize = "Studio" | "1 bed" | "2 bed" | "3+ bed";
export type RoomName =
  | "Living room"
  | "Kitchen"
  | "Bedrooms"
  | "Office"
  | "Garage & misc";

export type CatalogItem = {
  /** Display name. Doubles as the key in a counts map. */
  name: string;
  /** Volume units. Tuned so the room presets produce the published bands. */
  volumeUnits: number;
  /** Handling note shown beside the item. Olive when a surcharge applies. */
  handling: string;
  /** Per-unit surcharge in dollars, if any. */
  surcharge?: number;
  /** Label for that surcharge on the price rail. */
  surchargeLabel?: string;
};

/** A map of catalog item name to quantity. Absent keys mean zero. */
export type ItemCounts = Record<string, number>;

export type QuoteInput = {
  counts: ItemCounts;
  movers: CrewSize;
  fromFloor?: Floor;
  toFloor?: Floor;
  /** A reservable service elevator cancels both stair premiums. */
  elevator?: boolean;
  /** Packing crew the day before. */
  packing?: boolean;
};

export type QuoteExtra = { label: string; amount: number };

export type Quote = {
  /** Total volume units in the inventory. */
  units: number;
  /** Estimated crew hours, after access multipliers and the minimum. */
  hours: number;
  /** Hourly rate for the chosen crew size. */
  rate: number;
  movers: CrewSize;
  /** Itemised surcharges and the packing crew. */
  extras: QuoteExtra[];
  extrasTotal: number;
  /** Bottom of the quoted range, in whole dollars. Zero on an empty inventory. */
  low: number;
  /** Top of the quoted range. Overage above this is absorbed — see /pricing. */
  high: number;
  /** Number of physical items, not units. */
  itemCount: number;
};

/* ═══════════════════════════════════════════════════════════════════════════
   Catalogue

   Ported verbatim. Volume units were tuned so that the room presets produce the
   published price bands — do not adjust one without re-checking the other.
   ═══════════════════════════════════════════════════════════════════════════ */

export const CATALOG: Record<RoomName, CatalogItem[]> = {
  "Living room": [
    { name: "Sofa, 3-seat", volumeUnits: 14, handling: "Blanket wrap" },
    { name: "Armchair", volumeUnits: 6, handling: "Blanket wrap" },
    { name: "Coffee table", volumeUnits: 4, handling: "Standard" },
    { name: "Bookcase, tall", volumeUnits: 8, handling: "Standard" },
    {
      name: "TV, 55 inch",
      volumeUnits: 5,
      handling: "TV crate +$40",
      surcharge: 40,
      surchargeLabel: "TV crate",
    },
    { name: "Rug, rolled", volumeUnits: 3, handling: "Standard" },
  ],
  Kitchen: [
    { name: "Dish-pack boxes", volumeUnits: 2, handling: "Fragile" },
    { name: "Refrigerator", volumeUnits: 16, handling: "Appliance dolly" },
    { name: "Dining table", volumeUnits: 9, handling: "Legs off" },
    { name: "Dining chairs", volumeUnits: 2, handling: "Standard" },
    { name: "Bar stools", volumeUnits: 2, handling: "Standard" },
  ],
  Bedrooms: [
    { name: "Bed, queen", volumeUnits: 10, handling: "Disassembly" },
    { name: "Bed, king", volumeUnits: 13, handling: "Disassembly" },
    { name: "Dresser", volumeUnits: 9, handling: "Blanket wrap" },
    { name: "Nightstand", volumeUnits: 3, handling: "Standard" },
    { name: "Wardrobe boxes", volumeUnits: 3, handling: "Provided" },
    { name: "Mattress only", volumeUnits: 6, handling: "Mattress bag" },
  ],
  Office: [
    { name: "Desk", volumeUnits: 8, handling: "Legs off" },
    { name: "Office chair", volumeUnits: 4, handling: "Standard" },
    { name: "Filing cabinet", volumeUnits: 6, handling: "Emptied" },
    { name: "Monitor", volumeUnits: 2, handling: "Fragile" },
  ],
  "Garage & misc": [
    { name: "Medium boxes", volumeUnits: 2, handling: "Standard" },
    { name: "Bike", volumeUnits: 4, handling: "Standard" },
    { name: "Tool chest", volumeUnits: 7, handling: "Two-person" },
    {
      name: "Upright piano",
      volumeUnits: 26,
      handling: "Specialty +$180",
      surcharge: 180,
      surchargeLabel: "Piano handling",
    },
    { name: "Treadmill", volumeUnits: 12, handling: "Two-person" },
    { name: "Grill", volumeUnits: 6, handling: "Propane off" },
  ],
};

export const ROOMS = Object.keys(CATALOG) as RoomName[];

/** Every catalog item, flattened, in room order. */
export const CATALOG_ITEMS: CatalogItem[] = ROOMS.flatMap((r) => CATALOG[r]);

const BY_NAME = new Map(CATALOG_ITEMS.map((it) => [it.name, it]));

export function catalogItem(name: string): CatalogItem | undefined {
  return BY_NAME.get(name);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Room presets

   Selecting a home size replaces the inventory with that size's preset and
   sets the default crew size. This is a deliberate overwrite — it is how most
   customers reach a usable estimate in under a minute.
   ═══════════════════════════════════════════════════════════════════════════ */

export const HOME_SIZES: HomeSize[] = ["Studio", "1 bed", "2 bed", "3+ bed"];
export const FLOORS: Floor[] = ["Ground", "2nd", "3rd", "4th+"];

export const PRESETS: Record<HomeSize, ItemCounts> = {
  Studio: { "Bed, queen": 1, Dresser: 1, "Medium boxes": 10 },
  "1 bed": {
    "Bed, queen": 1,
    "Sofa, 3-seat": 1,
    Dresser: 1,
    "Medium boxes": 14,
    "Dining table": 1,
    "Dining chairs": 2,
  },
  "2 bed": {
    "Bed, queen": 1,
    "Sofa, 3-seat": 1,
    Dresser: 2,
    "Bookcase, tall": 2,
    "Medium boxes": 22,
    "Dining table": 1,
    "Dining chairs": 4,
    "TV, 55 inch": 1,
  },
  "3+ bed": {
    "Bed, king": 1,
    "Bed, queen": 2,
    "Sofa, 3-seat": 1,
    Armchair: 2,
    Dresser: 3,
    "Bookcase, tall": 3,
    "Medium boxes": 34,
    "Dining table": 1,
    "Dining chairs": 6,
    "TV, 55 inch": 2,
    Refrigerator: 1,
  },
};

export const DEFAULT_CREW: Record<HomeSize, CrewSize> = {
  Studio: 2,
  "1 bed": 2,
  "2 bed": 3,
  "3+ bed": 4,
};

/* ═══════════════════════════════════════════════════════════════════════════
   The engine
   ═══════════════════════════════════════════════════════════════════════════ */

/** Total volume units for an inventory. Unknown item names contribute nothing. */
export function unitsOf(counts: ItemCounts): number {
  let units = 0;
  for (const item of CATALOG_ITEMS) {
    units += item.volumeUnits * (counts[item.name] || 0);
  }
  return units;
}

/** Total number of physical items in an inventory. */
export function itemCountOf(counts: ItemCounts): number {
  let n = 0;
  for (const qty of Object.values(counts)) n += qty;
  return n;
}

function roundToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/**
 * Price a move.
 *
 *   units   = Σ (volumeUnits × quantity)
 *   hours   = units / (movers × throughput)
 *             × 1.12  if pickup is above ground and no elevator
 *             × 1.08  if drop-off is above ground and no elevator
 *             then clamped to a minimum of minHours
 *
 *   extras  = per-item surcharges + packing crew
 *   low     = round((hours × 0.90 × rate + extras) / 10) × 10
 *   high    = round((hours × 1.15 × rate + extras) / 10) × 10
 *
 * An empty inventory prices at zero rather than at the three-hour minimum: the
 * minimum is a floor on real work, not a charge for nothing. The price rail
 * shows "Add items" in that state.
 */
export function quote(input: QuoteInput, options?: QuoteOptions): Quote {
  const {
    counts,
    movers,
    fromFloor = "Ground",
    toFloor = "Ground",
    elevator = false,
    packing = false,
  } = input;
  const includeSurcharges = options?.includeSurcharges ?? true;

  let units = 0;
  const extras: QuoteExtra[] = [];

  for (const item of CATALOG_ITEMS) {
    const n = counts[item.name] || 0;
    if (!n) continue;
    units += item.volumeUnits * n;
    if (includeSurcharges && item.surcharge) {
      extras.push({
        label: `${item.surchargeLabel} × ${n}`,
        amount: item.surcharge * n,
      });
    }
  }

  const rate = CONFIG.rates[movers];

  let hours = units ? units / (movers * CONFIG.throughput) : 0;
  if (fromFloor !== "Ground" && !elevator) hours *= CONFIG.stairsPickup;
  if (toFloor !== "Ground" && !elevator) hours *= CONFIG.stairsDropoff;
  if (units) hours = Math.max(CONFIG.minHours, hours);

  if (packing) {
    extras.push({
      label: "Packing crew",
      amount: Math.round(
        hours * CONFIG.packing.hoursFactor * CONFIG.packing.ratePerHour,
      ),
    });
  }

  const extrasTotal = extras.reduce((sum, e) => sum + e.amount, 0);

  return {
    units,
    hours,
    rate,
    movers,
    extras,
    extrasTotal,
    low: units
      ? roundToIncrement(hours * CONFIG.range.low * rate + extrasTotal, CONFIG.roundTo)
      : 0,
    high: units
      ? roundToIncrement(hours * CONFIG.range.high * rate + extrasTotal, CONFIG.roundTo)
      : 0,
    itemCount: itemCountOf(counts),
  };
}

export type QuoteOptions = {
  /**
   * Include per-item surcharges in the range. Defaults to true.
   *
   * The published "typical move" bands set this to false, matching the
   * prototype's `bandFor()`, which sums units but ignores `xp`. That means the
   * advertised 2-bed and 3+-bed bands sit one TV crate ($40, or $80) below what
   * the estimator quotes for the same preset. Flip this to `true` in
   * `typicalBands()` to make the two agree — see the note there.
   */
  includeSurcharges?: boolean;
};

export type TypicalBand = {
  size: HomeSize;
  movers: CrewSize;
  hours: number;
  low: number;
  high: number;
};

/**
 * The band published on the pricing page for a given home size.
 *
 * Derived from the room preset so the published numbers cannot drift from the
 * quotes — never hard-code these. Assumes ground floor at both ends, no
 * elevator question, and no packing crew.
 *
 * Surcharges are excluded, reproducing the prototype's `bandFor()` exactly.
 * See `QuoteOptions.includeSurcharges` — this is a real discrepancy with the
 * estimator for the presets that contain a TV, and worth a product decision.
 */
export function typicalBand(size: HomeSize): TypicalBand {
  const movers = DEFAULT_CREW[size];
  const q = quote(
    { counts: PRESETS[size], movers },
    { includeSurcharges: false },
  );
  return { size, movers, hours: q.hours, low: q.low, high: q.high };
}

/** All four published bands, in order, for the pricing page's band table. */
export function typicalBands(): TypicalBand[] {
  return HOME_SIZES.map(typicalBand);
}

/**
 * The inventory list a booking writes to the job, in room order.
 * Quantities above one are folded into the name, matching the crew app's rows.
 */
export function inventoryFor(
  counts: ItemCounts,
): { name: string; handling: string; done: boolean }[] {
  const list: { name: string; handling: string; done: boolean }[] = [];
  for (const item of CATALOG_ITEMS) {
    const n = counts[item.name] || 0;
    if (!n) continue;
    list.push({
      name: item.name + (n > 1 ? ` ×${n}` : ""),
      handling: item.handling,
      done: false,
    });
  }
  return list;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Invoicing
   ═══════════════════════════════════════════════════════════════════════════ */

export type InvoiceLine = { label: string; amount: number };

/**
 * Invoice lines for a completed job: hours at the crew rate, plus each item
 * surcharge present in the inventory, plus flat materials.
 *
 * The prototype adds a flat $180 if a piano is present and $40 if a TV is,
 * regardless of quantity; this charges per unit, consistent with the quote the
 * customer was given. Replace the hours with the crew's real recorded work
 * before charging anyone.
 */
export function invoiceFor(job: {
  hours: number;
  movers: CrewSize;
  counts: ItemCounts;
}): { lines: InvoiceLine[]; total: number } {
  const rate = CONFIG.rates[job.movers];
  const lines: InvoiceLine[] = [
    {
      label: `${job.hours.toFixed(2)} hrs × ${job.movers} movers @ $${rate}/hr`,
      amount: Math.round(job.hours * rate),
    },
  ];

  for (const item of CATALOG_ITEMS) {
    const n = job.counts[item.name] || 0;
    if (!n || !item.surcharge) continue;
    lines.push({
      label: `${item.surchargeLabel}${n > 1 ? ` × ${n}` : ""}`,
      amount: item.surcharge * n,
    });
  }

  lines.push({ label: "Materials", amount: CONFIG.materials });

  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0) };
}
