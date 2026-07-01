import type { BoardVisibility } from "./types";

export const BOARD_VISIBILITIES = ["private", "friends", "public"] as const;

export const DEFAULT_BOARD_VISIBILITY = "private" satisfies BoardVisibility;

export const BOARD_VISIBILITY_LABELS = {
  private: "Only me",
  friends: "Friends",
  public: "Everyone",
} satisfies Record<BoardVisibility, string>;

export const BOARD_VISIBILITY_DESCRIPTIONS = {
  private: "Hidden from channel pages and search results except for you.",
  friends: "Visible on your channel to accepted friends.",
  public: "Visible to everyone on your channel.",
} satisfies Record<BoardVisibility, string>;

export function isBoardVisibility(value: unknown): value is BoardVisibility {
  return typeof value === "string" && BOARD_VISIBILITIES.includes(value as BoardVisibility);
}

export function parseBoardVisibilityInput(value: FormDataEntryValue | null) {
  return isBoardVisibility(value) ? value : DEFAULT_BOARD_VISIBILITY;
}
