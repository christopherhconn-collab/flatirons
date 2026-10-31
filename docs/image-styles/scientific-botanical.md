# Image style: "scientific botanical"

A 19th-century botanical plate made with modern precision: one plant on aged paper, shown as numbered
figures (the whole flower, its parts, a cut-through section, a leaf). It has a serif title block, italic
captions, and a footer that lists every figure. Reference plates are in
[`scientific-botanical/`](scientific-botanical/):

| File | Layout | Subject |
|---|---|---|
| `ref-portrait-peach.jpg` | Portrait 2:3, 8 figures | Dahlia, peach/coral and yellow, Tab. XXXVII |
| `ref-portrait-ketchup-mustard.jpg` | Portrait 2:3, 8 figures | Dahlia 'Ketchup and Mustard', Tab. XXXVIII |
| `ref-landscape-pink.jpg` | Landscape 3:2, 10 figures | Dahlia 'Pink', Tab. XXXVIII |

When someone asks for an image "in the scientific botanical style", build the prompt from this spec.

## The look

- **Paper.** Warm ivory or parchment, measured at about `#F0E2C8`–`#F6EBCF`. It has faint grain and a light
  aged tone, but no stains, tears or vignette. One thin dark rule frames the plate, inset from the edge.
- **Rendering.** Transparent watercolour over fine dark-brown/black ink outlines. Petals have visible
  veining and fine stipple or hatching, and colours shift and streak across each petal (for example,
  red flushing into yellow toward the tips). The drawing is precise and specimen-accurate. It is not
  loose or impressionistic.
- **Lighting.** Flat and even, like a scientific illustration. Figures cast no shadow onto the paper and
  sit directly on it, with no background, ground or vase.
- **Colour.** The plant keeps its natural colours, which are rich but slightly muted to look like
  pigment on paper. Leaves are deep sage or olive green with yellow-green midribs and serrated edges.
  Stems are yellow-green and blush to reddish-brown in places.
- **Composition.** The figures sit apart with generous space between them, and none overlap except a
  stem passing behind the main head. The page reads as orderly and balanced, not as a collage.

## Typography (classic old-style serif, like Garamond or Caslon, in near-black ink)

- **Top left:** the common or genus name, large and italic (*Dahlia*). Below it, a letterspaced small-caps
  line (DAHLIA CULTIVAR). Below that, the cultivar name in italics inside single curly quotes
  (*'Ketchup and Mustard'*). The cultivar line is optional.
- **Top right:** a small italic plate number in Roman numerals (*Tab. XXXVII*).
- **Figure captions:** centred italic text in three short lines: `Fig. N` / part name / `(view)`. Captions
  sit beside or below their figure.
- **Footer** (portrait layout): a thin full-width rule. Under it, a numbered legend split into a left
  and a right column (1–4 and 5–8). In the centre go the binomial in large italic (*Dahlia × hortensis*)
  and the family in letterspaced small caps (ASTERACEAE).

## Figure set and layout

**Portrait 2:3 (the default):**

| Fig. | Part | Place on the page |
|---|---|---|
| 1 | Flower head (front view): the hero, about 55–60% of the page width | Centre, upper two-thirds |
| 2 | Bud (side view) on a curving stem with sepals and a leaf | Top left, under the title |
| 3 | Single ray floret or petal (adaxial view) | Top right, under the plate number |
| 4 | Longitudinal section of the flower head: a cut showing the receptacle, florets and stamens | Bottom left |
| 5 | Tubular (disc) floret (front view) | Bottom centre, small |
| 6 | Anther (lateral view) | Bottom centre, small |
| 7 | Pistil (front view) | Bottom centre, small |
| 8 | Leaf (upper surface), compound or with leaflets, on its petiole | Bottom right |

**Landscape 3:2 (10 figures):** the hero head fills the left half. At top right go Fig. 2, flower head
(side view), and Fig. 3, flower head (back view, showing the green involucral bracts). Fig. 4, the
section, sits in the middle right, and Fig. 5, the leaf, at the far right. Fig. 6, the bud, goes at
bottom left. Figs. 7–10 (ray floret, tubular floret, anther, pistil) form a small row along the bottom
centre. The legend runs in two columns at the bottom right, above the binomial and family.

For a plant that isn't in the daisy family, swap in its own parts, such as seed head, fruit, root,
or calyx, and keep the same rules: one hero view, about 3–4 part views, one section, one leaf, and a
numbered legend.

## Prompt template

Fill in the `{…}` slots. Put every word that must appear on the plate in double quotes. Leave
`resolution` unset unless the plate is for print. Use aspect ratio `3:4` for portrait (the closest
option available to 2:3) or `4:3` for landscape.

```
Scientific botanical illustration plate in the style of a 19th-century hand-coloured engraving,
transparent watercolour over fine ink linework with delicate stippling and petal veining, on warm
ivory aged paper with subtle grain, thin black rule border inset from the edge. Flat even lighting,
no shadows, no background — every figure floats on the paper with generous spacing.
Subject: {plant, with precise colour description, e.g. "dahlia with crimson petals streaked and
tipped in bright yellow"}.
Figures, each with a centred italic serif caption ("Fig. N" / part / "(view)"):
Fig. 1 large flower head front view, centre, dominant; Fig. 2 bud side view on curved stem, top left;
Fig. 3 single ray floret adaxial view, top right; Fig. 4 longitudinal section of flower head, bottom
left; Figs. 5–7 tubular floret, anther, pistil, small, bottom centre; Fig. 8 leaf upper surface,
bottom right.
Typography in classic old-style serif: top left large italic "{Genus}", beneath it letterspaced small
caps "{GENUS} CULTIVAR", beneath that italic "'{Cultivar}'"; top right small italic "Tab. {ROMAN}".
Footer below a thin rule: numbered legend in two columns ("1. Flower head" … "8. Leaf"), centred large
italic "{Binomial}" and letterspaced small caps "{FAMILY}".
Naturalistic, specimen-accurate, muted pigment colours, sage-green serrated leaves.
```

## Keeping a series consistent

- Number plates in sequence and track which numbers are used. Tab. XXXVII and XXXVIII are already
  taken. Note that two of the reference plates both say XXXVIII, so the next new plate is **Tab. XXXIX**.
- Keep the same figure order and positions on every plate in a series, so the plates hang together as a set.
- Image models often misspell small text. Check every caption and legend line, and fix errors with
  `edit_image` ("change the caption under Fig. 6 to … , keep everything else unchanged") instead of
  regenerating the whole plate.
- If a model can take a reference image, give it one of the reference plates as the style anchor.
