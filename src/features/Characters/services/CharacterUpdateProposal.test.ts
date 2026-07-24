import { describe, expect, it } from "vitest";
import {
  getCharacterSheetItemDiff,
  hasCharacterSheetItemChanges,
} from "./CharacterUpdateProposal";

describe("CharacterUpdateProposal", () => {
  it("matches unchanged items independently of their indexes", () => {
    const diff = getCharacterSheetItemDiff(
      ["Navigator", "Carries the old key"],
      ["Carries the brass key", "Navigator"],
    );

    expect(diff).toEqual({
      added: ["Carries the brass key"],
      removed: ["Carries the old key"],
    });
  });

  it("treats a reordered replacement list as unchanged", () => {
    expect(
      hasCharacterSheetItemChanges(
        ["Navigator", "Carries the brass key"],
        ["Carries the brass key", "Navigator"],
      ),
    ).toBe(false);
  });

  it("uses the existing trim and deduplication rules before comparing", () => {
    expect(
      getCharacterSheetItemDiff(
        [" Navigator ", "Navigator"],
        ["Navigator", "Keeps watch"],
      ),
    ).toEqual({
      added: ["Keeps watch"],
      removed: [],
    });
  });
});
