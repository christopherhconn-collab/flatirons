import { describe, expect, it } from "vitest";

import { NATIVES } from "./natives";
import { photosFromResponse } from "./native-photos";

describe("photosFromResponse", () => {
  it("follows normalisation and redirects back to the requested title", () => {
    const photos = photosFromResponse(["Rhus_trilobata", "Pinus_edulis"], {
      query: {
        normalized: [
          { from: "Rhus_trilobata", to: "Rhus trilobata" },
          { from: "Pinus_edulis", to: "Pinus edulis" },
        ],
        redirects: [{ from: "Rhus trilobata", to: "Rhus aromatica var. trilobata" }],
        pages: [
          {
            title: "Rhus aromatica var. trilobata",
            pageimage: "Rhus_trilobata (berries).jpg",
            thumbnail: { source: "https://upload.wikimedia.org/a.jpg", width: 500, height: 375 },
          },
          {
            title: "Pinus edulis",
            pageimage: "Pinyon.jpg",
            thumbnail: { source: "https://upload.wikimedia.org/b.jpg", width: 500, height: 667 },
          },
        ],
      },
    });

    expect(photos.get("Rhus_trilobata")).toEqual({
      src: "https://upload.wikimedia.org/a.jpg",
      width: 500,
      height: 375,
      credit: "https://en.wikipedia.org/wiki/File:Rhus_trilobata%20(berries).jpg",
    });
    expect(photos.get("Pinus_edulis")?.src).toBe("https://upload.wikimedia.org/b.jpg");
  });

  it("leaves out pages with no lead image, and survives an empty body", () => {
    const photos = photosFromResponse(["Linum_lewisii"], {
      query: { pages: [{ title: "Linum_lewisii" }] },
    });
    expect(photos.size).toBe(0);
    expect(photosFromResponse(["Linum_lewisii"], {}).size).toBe(0);
  });
});

describe("NATIVES", () => {
  it("carries every row of the spreadsheet", () => {
    expect(NATIVES).toHaveLength(27);
    expect(NATIVES.filter((plant) => plant.plantSelect).map((plant) => plant.common)).toEqual([
      "Pineleaf penstemon",
      "Hummingbird trumpet",
    ]);
  });

  it("fits in one API request", () => {
    expect(NATIVES.length).toBeLessThanOrEqual(50);
  });
});
