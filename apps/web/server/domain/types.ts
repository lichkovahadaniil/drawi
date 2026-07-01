export type BoardPermission = "manage" | "edit" | "view";
export type ContentVisibility = "private" | "friends" | "public";
export type BoardVisibility = ContentVisibility;
export type ChannelVisibility = ContentVisibility;
export type FriendshipStatus = "pending" | "accepted" | "declined";
export type SessionRole = "tutor" | "student";
export type LiveSessionStatus = "live" | "ended";
export type LibraryRelationship = "created" | "learned";
export type CheckpointSource = "manual" | "session_end";
export type MediaConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "permission_denied"
  | "failed";
export type BoardConnectionState = "connecting" | "connected" | "reconnecting" | "unavailable";

export interface Actor {
  id: string;
}

export interface BoardAuthRecord {
  id: string;
  ownerId: string;
  status: "active" | "archived" | "deleted";
  visibility: BoardVisibility;
}

export interface BoardAccessRecord {
  userId: string;
  permission: BoardPermission;
  revokedAt: Date | null;
}

export interface FriendshipRecord {
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
}

export interface SessionMembershipRecord {
  userId: string;
  role: SessionRole;
  canEditBoard: boolean;
}

export interface LiveSessionAuthRecord {
  id: string;
  hostUserId: string;
  status: LiveSessionStatus;
}
