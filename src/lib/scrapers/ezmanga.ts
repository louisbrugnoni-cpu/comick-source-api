/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseScraper } from "./base";
import { ScrapedChapter, SearchResult, SourceType } from "@/types";

export class EZMangaScraper extends BaseScraper {
  private readonly BASE_URL = "https://ezmanga.org";
  private readonly API_URL = "https://vapi.ezmanga.org/api";

  getName(): string {
    return "EZ Manga";
  }

  getBaseUrl(): string {
    return this.BASE_URL;
  }

  getType(): SourceType {
    return "scanlator";
  }

  canHandle(url: string): boolean {
    return url.includes("ezmanga.org");
  }

  async extractMangaInfo(url: string): Promise<{ title: string; id: string }> {
    const slugMatch = url.match(/\/series\/([^/?]+)/);
    if (!slugMatch) {
      throw new Error("Invalid EZ Manga URL format");
    }

    const slug = slugMatch[1];

    const searchUrl = `${this.API_URL}/query?page=1&perPage=21&searchTerm=${encodeURIComponent(slug.replace(/-/g, " "))}&orderBy=createdAt`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": this.config.userAgent,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: this.BASE_URL,
        Referer: `${this.BASE_URL}/`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.posts || data.posts.length === 0) {
      throw new Error("Manga not found");
    }

    const manga = data.posts.find((post: any) => post.slug === slug) || data.posts[0];

    return {
      title: manga.postTitle || "Unknown Title",
      id: manga.id.toString(),
    };
  }

  async getChapterList(mangaUrl: string): Promise<ScrapedChapter[]> {
    const chapters: ScrapedChapter[] = [];
    const seenChapterNumbers = new Set<number>();

    try {
      const { id } = await this.extractMangaInfo(mangaUrl);

      let page = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const chapterUrl = `${this.API_URL}/v2/posts/${id}/chapters?page=${page}&perPage=100&sortOrder=desc&q=`;
        const response = await fetch(chapterUrl, {
          headers: {
            "User-Agent": this.config.userAgent,
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            Origin: this.BASE_URL,
            Referer: `${this.BASE_URL}/`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
          for (const chapter of data.data) {
            if (chapter.isLocked || chapter.isPermanentlyLocked) {
              continue;
            }

            const chapterNumber = chapter.number;

            if (chapterNumber >= 0 && !seenChapterNumbers.has(chapterNumber)) {
              seenChapterNumbers.add(chapterNumber);

              const chapterSlug = chapter.slug || `chapter-${chapterNumber}`;
              const chapterUrl = `${this.BASE_URL}/series/${mangaUrl.split("/series/")[1].split("/")[0]}/${chapterSlug}`;

              chapters.push({
                id: chapter.id.toString(),
                number: chapterNumber,
                title: chapter.title || `Chapter ${chapterNumber}`,
                url: chapterUrl,
                lastUpdated: chapter.createdAt || undefined,
              });
            }
          }
        }

        hasNextPage = data.hasNextPage === true;
        page++;
      }
    } catch (error) {
      console.error("[EZ Manga] Chapter fetch error:", error);
      throw error;
    }

    return chapters.sort((a, b) => a.number - b.number);
  }

  async search(query: string): Promise<SearchResult[]> {
    const searchUrl = `${this.API_URL}/query?page=1&perPage=21&searchTerm=${encodeURIComponent(query)}&orderBy=createdAt`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": this.config.userAgent,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: this.BASE_URL,
        Referer: `${this.BASE_URL}/`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.posts || !Array.isArray(data.posts)) {
      return [];
    }

    const limitedPosts = data.posts.slice(0, 5);

    const results: SearchResult[] = limitedPosts.map((post: any) => {
      const mangaUrl = `${this.BASE_URL}/series/${post.slug}`;

      let latestChapter = 0;
      if (post.chapters && Array.isArray(post.chapters) && post.chapters.length > 0) {
        latestChapter = Math.max(...post.chapters.map((ch: any) => ch.number || 0));
      } else if (post._count?.chapters) {
        latestChapter = post._count.chapters;
      }

      let lastUpdated = "";
      let lastUpdatedTimestamp: number | undefined;
      if (post.lastChapterAddedAt) {
        lastUpdated = post.lastChapterAddedAt;
        try {
          const parsedDate = new Date(post.lastChapterAddedAt);
          if (!isNaN(parsedDate.getTime())) {
            lastUpdatedTimestamp = parsedDate.getTime();
          }
        } catch {
          // Ignore date parse errors
        }
      }

      return {
        id: post.id.toString(),
        title: post.postTitle || "Unknown Title",
        url: mangaUrl,
        coverImage: post.featuredImage || undefined,
        latestChapter,
        lastUpdated,
        lastUpdatedTimestamp,
        rating: post.averageRating || undefined,
      };
    });

    return results;
  }
}
