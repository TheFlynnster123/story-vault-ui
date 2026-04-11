import { describe, it, expect } from "vitest";
import { areChapterIdsContiguous } from "./areChapterIdsContiguous";
import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";

describe("areChapterIdsContiguous", () => {
  function makeChapter(id: string, title: string): ChapterChatMessage {
    return {
      id,
      type: "chapter",
      content: `Summary for ${title}`,
      hiddenByChapterId: undefined,
      deleted: false,
      hidden: false,
      data: {
        title,
        coveredMessageIds: [],
      },
    };
  }

  const allChapters: ChapterChatMessage[] = [
    makeChapter("ch-1", "Chapter 1"),
    makeChapter("ch-2", "Chapter 2"),
    makeChapter("ch-3", "Chapter 3"),
    makeChapter("ch-4", "Chapter 4"),
    makeChapter("ch-5", "Chapter 5"),
  ];

  // ---- Empty and single selection ----
  it("should return true for empty selection", () => {
    expect(areChapterIdsContiguous(allChapters, [])).toBe(true);
  });

  it("should return true for single chapter selection", () => {
    expect(areChapterIdsContiguous(allChapters, ["ch-3"])).toBe(true);
  });

  // ---- Contiguous selections ----
  it("should return true for two adjacent chapters", () => {
    expect(areChapterIdsContiguous(allChapters, ["ch-1", "ch-2"])).toBe(true);
  });

  it("should return true for three adjacent chapters", () => {
    expect(
      areChapterIdsContiguous(allChapters, ["ch-2", "ch-3", "ch-4"]),
    ).toBe(true);
  });

  it("should return true for all chapters selected", () => {
    expect(
      areChapterIdsContiguous(allChapters, [
        "ch-1",
        "ch-2",
        "ch-3",
        "ch-4",
        "ch-5",
      ]),
    ).toBe(true);
  });

  it("should return true for contiguous chapters selected in reverse order", () => {
    expect(areChapterIdsContiguous(allChapters, ["ch-3", "ch-2"])).toBe(true);
  });

  it("should return true for contiguous chapters selected out of order", () => {
    expect(
      areChapterIdsContiguous(allChapters, ["ch-4", "ch-2", "ch-3"]),
    ).toBe(true);
  });

  // ---- Non-contiguous selections ----
  it("should return false for two non-adjacent chapters", () => {
    expect(areChapterIdsContiguous(allChapters, ["ch-1", "ch-3"])).toBe(false);
  });

  it("should return false for gap in the middle", () => {
    expect(
      areChapterIdsContiguous(allChapters, ["ch-1", "ch-2", "ch-4"]),
    ).toBe(false);
  });

  it("should return false for first and last chapters only", () => {
    expect(areChapterIdsContiguous(allChapters, ["ch-1", "ch-5"])).toBe(false);
  });

  it("should return false for scattered selection", () => {
    expect(
      areChapterIdsContiguous(allChapters, ["ch-1", "ch-3", "ch-5"]),
    ).toBe(false);
  });

  // ---- Edge cases ----
  it("should return true when no chapters exist and nothing selected", () => {
    expect(areChapterIdsContiguous([], [])).toBe(true);
  });

  it("should return true when selected id not found in chapters list", () => {
    // If IDs don't match, the filter removes them, leaving <= 1 valid index
    expect(areChapterIdsContiguous(allChapters, ["unknown-id"])).toBe(true);
  });

  it("should handle selection with one valid and one invalid id", () => {
    // Only one valid index remains after filtering, so it's contiguous
    expect(
      areChapterIdsContiguous(allChapters, ["ch-1", "unknown-id"]),
    ).toBe(true);
  });
});
