import { Theme } from "../../../../../components/Theme";

/**
 * Creates an rgba color string that uses the --message-transparency CSS variable
 * for real-time transparency adjustment via a slider.
 * @param color - rgba color string like "rgba(r, g, b, a)"
 * @returns rgba string with alpha multiplied by the CSS variable
 */
export const transparencyColor = (color: string): string => {
  const match = color.match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
  );
  if (match) {
    const [, r, g, b, a = "1"] = match;
    return `rgba(${r}, ${g}, ${b}, calc(${parseFloat(a)} * var(--message-transparency, ${Theme.chatEntry.transparency})))`;
  }
  return color;
};
