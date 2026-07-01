import type {
  Actor,
  BoardAuthRecord,
  ChannelVisibility,
  FriendshipRecord,
  FriendshipStatus,
} from "./types";

export const CHANNEL_VISIBILITIES = ["private", "friends", "public"] as const;

export const DEFAULT_CHANNEL_VISIBILITY = "public" satisfies ChannelVisibility;

export const CHANNEL_VISIBILITY_LABELS = {
  private: "Private channel",
  friends: "Friends only",
  public: "Public channel",
} satisfies Record<ChannelVisibility, string>;

export const CHANNEL_VISIBILITY_DESCRIPTIONS = {
  private: "Only you can see your channel tabs and boards.",
  friends: "Accepted friends can see your channel tabs and friends-only boards.",
  public: "Everyone can see your channel and public boards.",
} satisfies Record<ChannelVisibility, string>;

export type FriendshipState = "self" | "friends" | "request_sent" | "request_received" | "none";
export type SearchProfileView = "teaching" | "learning";
export type FriendRequestResponse = Extract<FriendshipStatus, "accepted" | "declined">;

export function isChannelVisibility(value: unknown): value is ChannelVisibility {
  return typeof value === "string" && CHANNEL_VISIBILITIES.includes(value as ChannelVisibility);
}

export function parseChannelVisibilityInput(value: FormDataEntryValue | null) {
  return isChannelVisibility(value) ? value : DEFAULT_CHANNEL_VISIBILITY;
}

export function getFriendshipState(
  actor: Actor | null,
  ownerId: string,
  friendship?: FriendshipRecord | null,
): FriendshipState {
  if (actor?.id === ownerId) return "self";
  if (!actor || !friendship || friendship.status === "declined") return "none";
  if (friendship.status === "accepted") return "friends";
  if (friendship.requesterId === actor.id) return "request_sent";
  if (friendship.addresseeId === actor.id) return "request_received";
  return "none";
}

export function canViewChannel(
  actor: Actor | null,
  ownerId: string,
  visibility: ChannelVisibility,
  friendship?: FriendshipRecord | null,
) {
  const friendshipState = getFriendshipState(actor, ownerId, friendship);
  if (friendshipState === "self") return true;
  if (visibility === "public") return true;
  if (visibility === "friends") return friendshipState === "friends";
  return false;
}

export function canListBoardOnChannel(
  actor: Actor | null,
  ownerId: string,
  board: BoardAuthRecord,
  friendship?: FriendshipRecord | null,
) {
  if (board.status !== "active") return false;
  const friendshipState = getFriendshipState(actor, ownerId, friendship);
  if (friendshipState === "self") return true;
  if (board.visibility === "public") return true;
  if (board.visibility === "friends") return friendshipState === "friends";
  return false;
}

export function canSendFriendRequest(
  actor: Actor | null,
  ownerId: string,
  friendship?: FriendshipRecord | null,
) {
  return Boolean(actor) && actor?.id !== ownerId && !friendship;
}

export function canRespondToFriendRequest(
  actor: Actor,
  friendship: FriendshipRecord,
  response: FriendRequestResponse,
) {
  return (
    (response === "accepted" || response === "declined") &&
    friendship.status === "pending" &&
    friendship.addresseeId === actor.id
  );
}

export function chooseSearchProfileView(
  teachingEnabled: boolean,
  visibleTeachingBoardCount: number,
): SearchProfileView {
  return teachingEnabled || visibleTeachingBoardCount > 0 ? "teaching" : "learning";
}
