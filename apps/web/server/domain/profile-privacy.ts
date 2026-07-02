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
  private: "Private profile",
  friends: "Friends only",
  public: "Public profile",
} satisfies Record<ChannelVisibility, string>;

export const CHANNEL_VISIBILITY_DESCRIPTIONS = {
  private: "Only you can see your profile tabs and boards.",
  friends: "Accepted friends can see your profile tabs and friends-only boards.",
  public: "Everyone can see your profile and public boards.",
} satisfies Record<ChannelVisibility, string>;

export type FriendshipState = "self" | "friends" | "request_sent" | "request_received" | "none";
export type ProfileBoardTab = "created" | "joined";
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
  return canListBoardByVisibility(actor, ownerId, board, friendship);
}

export function canListBoardOnProfile(
  actor: Actor | null,
  profileOwnerId: string,
  board: BoardAuthRecord,
  boardOwnerFriendship?: FriendshipRecord | null,
) {
  if (board.status !== "active") return false;
  if (actor?.id === profileOwnerId) return true;
  return canListBoardByVisibility(actor, board.ownerId, board, boardOwnerFriendship);
}

function canListBoardByVisibility(
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

export function chooseSearchProfileTab(
  visibleCreatedBoardCount: number,
  visibleJoinedBoardCount: number,
): ProfileBoardTab {
  return visibleCreatedBoardCount > 0 || visibleJoinedBoardCount === 0 ? "created" : "joined";
}
