import { BaseScraper } from "./base";
import { MangaParkScraper } from "./mangapark";
import { AtsuMoeScraper } from "./atsumoe";
import { LikeMangaScraper } from "./likemanga";
import { ManhuausScraper } from "./manhuaus";
import { MangaReadScraper } from "./mangaread";
import { MgekoScraper } from "./mgeko";
import { NovelCoolScraper } from "./novelcool";
import { AsuraScanScraper, asuraScanScraper } from "./asurascan";
import { WeebCentralScraper } from "./weebcentral";
import { SourceInfo } from "@/types";

const scrapers: BaseScraper[] = [
  new MangaParkScraper(),
  new AtsuMoeScraper(),
  new LikeMangaScraper(),
  new ManhuausScraper(),
  new MangaReadScraper(),
  new MgekoScraper(),
  new NovelCoolScraper(),
  asuraScanScraper,
  new WeebCentralScraper(),
];

export function getScraper(url: string): BaseScraper | null {
  return scrapers.find((scraper) => scraper.canHandle(url)) || null;
}

export function getScraperByName(name: string): BaseScraper | null {
  return (
    scrapers.find(
      (scraper) => scraper.getName().toLowerCase() === name.toLowerCase(),
    ) || null
  );
}

export function getAllScrapers(): BaseScraper[] {
  return scrapers;
}

export function getClientOnlyScrapers(): BaseScraper[] {
  return scrapers.filter((scraper) => scraper.isClientOnly());
}

export function getAllSourceInfo(): SourceInfo[] {
  return scrapers.map((scraper) => ({
    id: scraper.getName().toLowerCase().replace(/\s+/g, "-"),
    name: scraper.getName(),
    baseUrl: scraper.getBaseUrl(),
    description: scraper.getDescription(),
    clientOnly: scraper.isClientOnly(),
  }));
}

export {
  BaseScraper,
  MangaParkScraper,
  AtsuMoeScraper,
  LikeMangaScraper,
  ManhuausScraper,
  MangaReadScraper,
  MgekoScraper,
  NovelCoolScraper,
  AsuraScanScraper,
  asuraScanScraper,
  WeebCentralScraper,
};
