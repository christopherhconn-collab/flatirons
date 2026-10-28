/**
 * Colorado Plant Select Natives — the content of `denver-native-drought-plants.xlsx`,
 * row for row. The spreadsheet is the source; edit it there first and mirror
 * the change here, so the two never say different things.
 *
 * `wiki` is the Wikipedia article each row's "View photo" link pointed at. The
 * page takes its photograph from that article's lead image (see
 * `native-photos.ts`) and links back to it.
 */

export const NATIVES_HOST = "natives.flatironsmoves.com";
export const NATIVES_ORIGIN = `https://${NATIVES_HOST}`;

export const NATIVES_INTRO =
  "All are Colorado natives that thrive on low water once established (1–2 seasons of regular water first). “Plant Select” = vetted by the CSU / Denver Botanic Gardens Plant Select program.";

export const NATIVES_SOURCES = [
  { label: "plantselect.org", href: "https://plantselect.org" },
  { label: "CSU Extension native plant fact sheets", href: "https://extension.colostate.edu" },
  { label: "Denver Water xeriscape plant guide", href: "https://www.denverwater.org" },
  { label: "Resource Central Garden In A Box", href: "https://resourcecentral.org" },
] as const;

export const CATEGORIES = [
  { id: "wildflowers", label: "Perennial / Wildflower", plural: "Perennials & wildflowers" },
  { id: "grasses", label: "Grass", plural: "Grasses" },
  { id: "shrubs", label: "Shrub", plural: "Shrubs" },
  { id: "trees", label: "Tree", plural: "Trees" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export type Native = {
  category: Category;
  common: string;
  botanical: string;
  plantSelect: boolean;
  look: string;
  notes: string;
  wiki: string;
};

export const NATIVES: Native[] = [
  { category: "wildflowers", common: "Blanket flower", botanical: "Gaillardia aristata", plantSelect: false, look: "Red & yellow daisy flowers, summer–fall", notes: "Long bloomer; avoid rich soil and overwatering", wiki: "Gaillardia_aristata" },
  { category: "wildflowers", common: "Rocky Mountain penstemon", botanical: "Penstemon strictus", plantSelect: false, look: "Blue-purple spikes, late spring", notes: "Pollinator magnet; needs sharp drainage", wiki: "Penstemon_strictus" },
  { category: "wildflowers", common: "Pineleaf penstemon", botanical: "Penstemon pinifolius", plantSelect: true, look: "Orange-red tubular flowers, early summer", notes: "Low, needle-like foliage; hummingbirds", wiki: "Penstemon_pinifolius" },
  { category: "wildflowers", common: "Prairie coneflower", botanical: "Ratibida columnifera", plantSelect: false, look: "Yellow or red sombrero flowers, summer", notes: "Reseeds readily", wiki: "Ratibida_columnifera" },
  { category: "wildflowers", common: "Chocolate flower", botanical: "Berlandiera lyrata", plantSelect: false, look: "Yellow daisies, summer–fall", notes: "Cocoa scent in the morning", wiki: "Berlandiera_lyrata" },
  { category: "wildflowers", common: "Sulphur-flower buckwheat", botanical: "Eriogonum umbellatum", plantSelect: false, look: "Yellow umbels, summer", notes: "Rust-red fall color; very tough", wiki: "Eriogonum_umbellatum" },
  { category: "wildflowers", common: "Hummingbird trumpet", botanical: "Epilobium canum", plantSelect: true, look: "Scarlet trumpets, late summer–fall", notes: "Late nectar source for hummingbirds", wiki: "Epilobium_canum" },
  { category: "wildflowers", common: "Purple prairie clover", botanical: "Dalea purpurea", plantSelect: false, look: "Purple cone flowers, summer", notes: "Fixes nitrogen; deep taproot", wiki: "Dalea_purpurea" },
  { category: "wildflowers", common: "Scarlet globemallow", botanical: "Sphaeralcea coccinea", plantSelect: false, look: "Orange-salmon cups, late spring–summer", notes: "Spreads by rhizomes in lean soil", wiki: "Sphaeralcea_coccinea" },
  { category: "wildflowers", common: "Desert four o'clock", botanical: "Mirabilis multiflora", plantSelect: false, look: "Magenta flowers open in afternoon, summer", notes: "Huge taproot; hard to move once planted", wiki: "Mirabilis_multiflora" },
  { category: "wildflowers", common: "Blue flax", botanical: "Linum lewisii", plantSelect: false, look: "Sky-blue flowers, late spring", notes: "Short-lived but self-seeds", wiki: "Linum_lewisii" },
  { category: "wildflowers", common: "Pasqueflower", botanical: "Pulsatilla patens", plantSelect: false, look: "Lavender cups, early spring", notes: "One of the first bloomers; fuzzy seed heads", wiki: "Pulsatilla_patens" },
  { category: "grasses", common: "Blue grama", botanical: "Bouteloua gracilis", plantSelect: false, look: "Eyelash-shaped seed heads, summer", notes: "Colorado state grass; lawn alternative", wiki: "Bouteloua_gracilis" },
  { category: "grasses", common: "Little bluestem", botanical: "Schizachyrium scoparium", plantSelect: false, look: "Blue-green summer, copper-red fall", notes: "Strong winter interest", wiki: "Schizachyrium_scoparium" },
  { category: "grasses", common: "Sideoats grama", botanical: "Bouteloua curtipendula", plantSelect: false, look: "Seed spikelets hang off one side", notes: "Good in mixed prairie plantings", wiki: "Bouteloua_curtipendula" },
  { category: "grasses", common: "Buffalograss", botanical: "Bouteloua dactyloides", plantSelect: false, look: "Low turf, fine texture", notes: "Low-water lawn; dormant/tan in winter", wiki: "Bouteloua_dactyloides" },
  { category: "grasses", common: "Indian ricegrass", botanical: "Achnatherum hymenoides", plantSelect: false, look: "Airy, open seed heads, early summer", notes: "Needs sandy, very well-drained soil", wiki: "Achnatherum_hymenoides" },
  { category: "shrubs", common: "Rubber rabbitbrush", botanical: "Ericameria nauseosa", plantSelect: false, look: "Gold flowers, late summer–fall", notes: "Spreads; place deliberately", wiki: "Ericameria_nauseosa" },
  { category: "shrubs", common: "Fernbush", botanical: "Chamaebatiaria millefolium", plantSelect: false, look: "White flower clusters, summer", notes: "Aromatic, fern-like foliage", wiki: "Chamaebatiaria_millefolium" },
  { category: "shrubs", common: "Apache plume", botanical: "Fallugia paradoxa", plantSelect: false, look: "White flowers + pink feathery seed heads", notes: "Extremely drought tolerant", wiki: "Fallugia_paradoxa" },
  { category: "shrubs", common: "Three-leaf sumac", botanical: "Rhus trilobata", plantSelect: false, look: "Red berries; orange-red fall color", notes: "Spreads by suckers", wiki: "Rhus_trilobata" },
  { category: "shrubs", common: "Mountain mahogany", botanical: "Cercocarpus montanus", plantSelect: false, look: "Curly feathery seed tails, fall", notes: "Deer browse it; semi-evergreen", wiki: "Cercocarpus_montanus" },
  { category: "shrubs", common: "Fringed sage", botanical: "Artemisia frigida", plantSelect: false, look: "Silvery mounded foliage", notes: "Low groundcover-type sage", wiki: "Artemisia_frigida" },
  { category: "shrubs", common: "Wax currant", botanical: "Ribes cereum", plantSelect: false, look: "Pink tubular flowers; red berries", notes: "Early hummingbird and bird food", wiki: "Ribes_cereum" },
  { category: "trees", common: "Rocky Mountain juniper", botanical: "Juniperus scopulorum", plantSelect: false, look: "Evergreen; blue berry-like cones", notes: "Windbreak/screen; avoid near apples (rust)", wiki: "Juniperus_scopulorum" },
  { category: "trees", common: "Piñon pine", botanical: "Pinus edulis", plantSelect: false, look: "Evergreen; edible pine nuts", notes: "Slow-growing; dislikes overwatering", wiki: "Pinus_edulis" },
  { category: "trees", common: "Gambel oak", botanical: "Quercus gambelii", plantSelect: false, look: "Deciduous; acorns", notes: "Forms thickets by suckering", wiki: "Quercus_gambelii" },
];

export function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${title}`;
}
