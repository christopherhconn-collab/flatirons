/**
 * Icons — Lucide, `stroke-width: 1.5`, `fill: none`, sizes 14–22px.
 *
 * Drawn inline rather than pulled from a package: the set is five glyphs, and
 * inlining keeps them out of the bundle graph and lets `currentColor` do the
 * theming. Do not thicken the stroke — the design system is explicit that the
 * set is Lucide at 1.5.
 */

type IconProps = {
  size?: number;
  className?: string;
  /** Overrides `currentColor`, for the checkbox tick on a filled ground. */
  color?: string;
  strokeWidth?: number;
};

function Icon({
  size = 16,
  className,
  color = "currentColor",
  strokeWidth = 1.5,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** Insurance and reassurance lines. */
export function ShieldCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </Icon>
  );
}

/** Checkboxes and completion. Drawn at 2.5 in the prototype's tick boxes. */
export function Check({ strokeWidth = 2.5, ...props }: IconProps) {
  return (
    <Icon {...props} strokeWidth={strokeWidth}>
      <path d="M5 12l5 5L19 7" />
    </Icon>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </Icon>
  );
}

export function ChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 5l7 7-7 7" />
    </Icon>
  );
}

export function Camera(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h3l2-3h8l2 3h3v11H3z" />
      <circle cx="12" cy="13" r="3.5" />
    </Icon>
  );
}
