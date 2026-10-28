/**
 * A photograph for each native, taken from its Wikipedia article's lead image.
 *
 * One request to the MediaWiki API covers every plant (it takes up to 50
 * titles), cached for a week. The images themselves are served by Wikimedia,
 * and each one links to its file page, where the photographer and licence are.
 *
 * A failed lookup is not an error: the page renders without photos and every
 * card still links to the article, which is what the spreadsheet did.
 */

export type NativePhoto = {
  src: string;
  width: number;
  height: number;
  /** The file's description page — author, licence, full resolution. */
  credit: string;
};

/** 500px is one of Wikimedia's standard thumbnail widths, so it is pre-rendered. */
const THUMB_WIDTH = 500;
const WEEK = 60 * 60 * 24 * 7;

type ApiPage = {
  title: string;
  missing?: boolean;
  pageimage?: string;
  thumbnail?: { source: string; width: number; height: number };
};

type ApiResponse = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: ApiPage[];
  };
};

/**
 * Maps each requested title to its photo, following the API's normalisation
 * (`Pinus_edulis` → `Pinus edulis`) and any redirect to the article's current
 * name. Titles with no lead image are simply absent.
 */
export function photosFromResponse(
  titles: readonly string[],
  body: ApiResponse,
): Map<string, NativePhoto> {
  const query = body.query ?? {};
  const hop = (list: { from: string; to: string }[] | undefined) =>
    new Map((list ?? []).map((entry) => [entry.from, entry.to]));
  const normalized = hop(query.normalized);
  const redirects = hop(query.redirects);
  const pages = new Map((query.pages ?? []).map((page) => [page.title, page]));

  const photos = new Map<string, NativePhoto>();
  for (const title of titles) {
    let name = normalized.get(title) ?? title;
    name = redirects.get(name) ?? name;
    const page = pages.get(name);
    if (!page?.thumbnail || !page.pageimage) continue;
    photos.set(title, {
      src: page.thumbnail.source,
      width: page.thumbnail.width,
      height: page.thumbnail.height,
      credit: `https://en.wikipedia.org/wiki/File:${encodeURIComponent(page.pageimage)}`,
    });
  }
  return photos;
}

export async function fetchNativePhotos(
  titles: readonly string[],
): Promise<Map<string, NativePhoto>> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageimages",
    piprop: "thumbnail|name",
    pithumbsize: String(THUMB_WIDTH),
    pilimit: "max",
    titles: titles.join("|"),
  });

  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      // Wikimedia asks API clients to identify themselves.
      headers: { "User-Agent": "FlatironsMovers/1.0 (https://www.flatironsmoves.com)" },
      next: { revalidate: WEEK },
    });
    if (!res.ok) return new Map();
    return photosFromResponse(titles, (await res.json()) as ApiResponse);
  } catch {
    return new Map();
  }
}
