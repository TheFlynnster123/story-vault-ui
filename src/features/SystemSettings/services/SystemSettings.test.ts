import { describe, expect, it } from "vitest";
import {
  DEFAULT_MESSAGE_COMPRESSION_AFTER_MESSAGES,
  DEFAULT_MESSAGE_COMPRESSION_MINIMUM_CHARACTERS,
  normalizeMessageCompressionAfterMessages,
  normalizeMessageCompressionMinimumCharacters,
} from "./SystemSettings";

describe("message compression settings", () => {
  it("normalizes message age to a non-negative integer", () => {
    expect(normalizeMessageCompressionAfterMessages(4.6)).toBe(5);
    expect(normalizeMessageCompressionAfterMessages(-3)).toBe(0);
  });

  it("normalizes minimum source characters to a non-negative integer", () => {
    expect(normalizeMessageCompressionMinimumCharacters(450.4)).toBe(450);
    expect(normalizeMessageCompressionMinimumCharacters(-3)).toBe(0);
  });

  it("uses conservative defaults for invalid persisted settings", () => {
    expect(normalizeMessageCompressionAfterMessages(undefined)).toBe(
      DEFAULT_MESSAGE_COMPRESSION_AFTER_MESSAGES,
    );
    expect(normalizeMessageCompressionMinimumCharacters("invalid")).toBe(
      DEFAULT_MESSAGE_COMPRESSION_MINIMUM_CHARACTERS,
    );
  });
});
