/**
 * Flatirons Movers logo — refinement direction 2a, "Trued peaks".
 *
 * Three peaks on one common baseline with matched slopes and a single olive
 * face, plus a stacked wordmark. The rule under FLATIRONS ties the two words
 * into one object so MOVERS can carry its .42em tracking without the lockup
 * coming apart — that rule is the fix for the business card's wordmark/tagline
 * tracking conflict.
 *
 * The mark's 96×44 viewBox renders at 40×19 in the marketing header, which is
 * the size the rest of the chrome is drawn around.
 *
 * See `design/Flatirons Logo Refinement.dc.html`. Direction 2c ("Cut slab")
 * is the stronger vehicle decal and should be revisited for signage — it does
 * not fit the header's aspect ratio.
 */

type Tone = "light" | "dark" | "mono";

const PEAK_FILL: Record<Tone, { navy: string; olive: string }> = {
  // On a light ground: two navy peaks, the rightmost olive.
  light: { navy: "#16283f", olive: "#5d7340" },
  // Reversed on navy: mist peaks, the rightmost still olive.
  dark: { navy: "#dfe7d2", olive: "#5d7340" },
  // Single colour — inherits from the parent via currentColor.
  mono: { navy: "currentColor", olive: "currentColor" },
};

export function LogoMark({
  width = 40,
  tone = "light",
  className,
}: {
  width?: number;
  tone?: Tone;
  className?: string;
}) {
  const { navy, olive } = PEAK_FILL[tone];
  return (
    <svg
      viewBox="0 0 96 44"
      width={width}
      height={(width * 44) / 96}
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 42 L22 12 L38 42 Z" fill={navy} />
      <path d="M30 42 L52 4 L70 42 Z" fill={navy} />
      <path d="M60 42 L78 15 L94 42 Z" fill={olive} />
      <rect x="0" y="42" width="96" height="2" fill={navy} />
    </svg>
  );
}

/**
 * The full lockup: mark beside the stacked wordmark.
 *
 * The mark and the type are sized independently because the marketing chrome
 * specifies them independently — a 40×19 mark beside a 19px FLATIRONS, which
 * is a heavier wordmark relative to the mark than the refinement sheet's large
 * treatment. `Logo` below keeps the sheet's proportions for reference use.
 */
export function LogoLockup({
  markWidth = 40,
  wordSize = 19,
  subSize = 9.5,
  gap = 11,
  tone = "light",
  rule = false,
  className,
}: {
  markWidth?: number;
  wordSize?: number;
  subSize?: number;
  gap?: number;
  tone?: Tone;
  /** The hairline that ties FLATIRONS to MOVERS. Drop it below ~17px type. */
  rule?: boolean;
  className?: string;
}) {
  const onDark = tone === "dark";
  const wordColor = onDark ? "#f7f6f2" : tone === "mono" ? "currentColor" : "#16283f";
  const subColor = onDark ? "#a3b689" : tone === "mono" ? "currentColor" : "#5d7340";
  const ruleColor = onDark ? "rgb(223 231 210 / 0.35)" : "rgb(22 40 63 / 0.35)";

  return (
    <span className={`inline-flex items-center ${className ?? ""}`} style={{ gap }}>
      <LogoMark width={markWidth} tone={tone} />
      <span className="leading-none">
        <span
          className="block font-condensed uppercase"
          style={{
            fontSize: wordSize,
            fontWeight: 600,
            letterSpacing: "0.14em",
            lineHeight: 1,
            color: wordColor,
          }}
        >
          Flatirons
        </span>
        <span
          className="flex items-center"
          style={{ gap: gap * 0.8, marginTop: wordSize * 0.2 }}
        >
          {rule && (
            <span
              aria-hidden="true"
              className="flex-1"
              style={{ height: 1, background: ruleColor }}
            />
          )}
          <span
            className="font-body uppercase"
            style={{
              fontSize: subSize,
              fontWeight: 500,
              letterSpacing: "0.42em",
              lineHeight: 1,
              color: subColor,
            }}
          >
            Movers
          </span>
        </span>
      </span>
      <span className="sr-only">Flatirons Movers</span>
    </span>
  );
}

/**
 * The refinement sheet's proportions, driven by one multiplier. `scale` is
 * against the 34px FLATIRONS of the large treatment.
 */
export function Logo({
  scale = 1,
  tone = "light",
  rule = true,
  className,
}: {
  scale?: number;
  tone?: Tone;
  /** The hairline that ties FLATIRONS to MOVERS. Drop it below ~0.5 scale. */
  rule?: boolean;
  className?: string;
}) {
  const onDark = tone === "dark";
  const wordColor = onDark ? "#f7f6f2" : tone === "mono" ? "currentColor" : "#16283f";
  const subColor = onDark ? "#a3b689" : tone === "mono" ? "currentColor" : "#5d7340";
  const ruleColor = onDark ? "rgb(223 231 210 / 0.35)" : "rgb(22 40 63 / 0.35)";

  return (
    <span
      className={`inline-flex items-center ${className ?? ""}`}
      style={{ gap: 16 * scale }}
    >
      <LogoMark width={120 * scale} tone={tone} />
      <span className="leading-none">
        <span
          className="block font-condensed uppercase"
          style={{
            fontSize: 34 * scale,
            fontWeight: 700,
            letterSpacing: "0.09em",
            lineHeight: 1,
            color: wordColor,
          }}
        >
          Flatirons
        </span>
        <span
          className="flex items-center"
          style={{ gap: 9 * scale, marginTop: 7 * scale }}
        >
          {rule && (
            <span
              aria-hidden="true"
              className="flex-1"
              style={{ height: 1, background: ruleColor }}
            />
          )}
          <span
            className="font-body uppercase"
            style={{
              fontSize: 11 * scale,
              fontWeight: 500,
              letterSpacing: "0.42em",
              lineHeight: 1,
              color: subColor,
            }}
          >
            Movers
          </span>
        </span>
      </span>
      <span className="sr-only">Flatirons Movers</span>
    </span>
  );
}
