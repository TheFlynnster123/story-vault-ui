import type { ChapterChatMessage } from "../../../../../services/CQRS/UserChatProjection";

export function areChapterIdsContiguous(
  allChapters: ChapterChatMessage[],
  selectedIds: string[],
): boolean {
  if (selectedIds.length <= 1) return true;

  const indices = selectedIds
    .map((id) => allChapters.findIndex((ch) => ch.id === id))
    .filter((idx) => idx !== -1)
    .sort((a, b) => a - b);

  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1] + 1) return false;
  }

  return true;
}
