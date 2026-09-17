# Stripe branding assets

Upload at **Stripe Dashboard → Settings → Business → Branding**.

| File | Stripe field | Size |
|---|---|---|
| `stripe-icon-navy.png` | **Icon** | 512×512, 11 KB |
| `stripe-logo.png` | **Logo** | 1024×177, 34 KB |
| `stripe-icon-light.png` | alternative Icon | 512×512, 12 KB |

Colours, from `src/app/globals.css` — these are the tokens the site uses, so
Checkout matches the page the customer came from:

| Stripe field | Value |
|---|---|
| Brand colour | `#16283f` (ink/navy) |
| Accent colour | `#5d7340` (olive) |

## Why the navy icon rather than the light one

The mark is about 2.4:1. Centred on a square it letterboxes whatever you do —
roughly a third of the height is mark and the rest is background. On white
that reads, at the ~32px Stripe renders an icon, as three small shapes adrift
in a lot of nothing. The navy tile fills the square, so the icon has an edge
and a presence at that size, and the mark inside it is the light-on-dark
variant the site already uses on its own dark surfaces.

`stripe-icon-light.png` is kept for a surface that supplies its own dark
background, where a navy tile would disappear.

## Why these are not the `media-kit/` files one directory up

Those are the full-bleed exports: the icon has the mark occupying a third of
a 1417px square, which is correct for a press kit and wrong for a 32px
favicon-sized slot. These are cropped to the mark and re-padded to about a
12% margin, then scaled — so the mark is as large as a square can hold.

Regenerate from the sources in `../` rather than editing these by hand; they
are derived files, and the originals are rendered from `logo.tsx` so the
brand mark has exactly one definition.
