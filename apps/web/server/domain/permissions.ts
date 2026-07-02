import type {
  Actor,
  BoardAccessRecord,
  BoardAuthRecord,
  LiveSessionAuthRecord,
  SessionMembershipRecord,
} from "./types";

function activeAccessFor(actor: Actor, access: BoardAccessRecord[]) {
  return access.find((item) => item.userId === actor.id && item.revokedAt === null);
}

export function canViewBoard(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  if (board.status === "deleted") return false;
  if (board.ownerId === actor.id) return true;
  return Boolean(activeAccessFor(actor, access));
}

export function canListBoardInLibrary(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  if (board.status === "deleted") return false;
  if (board.ownerId === actor.id) return true;
  return Boolean(activeAccessFor(actor, access));
}

export function canEditBoard(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  if (board.status !== "active") return false;
  if (board.ownerId === actor.id) return true;
  const row = activeAccessFor(actor, access);
  return row?.permission === "manage" || row?.permission === "edit";
}

export function canManageBoard(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  if (board.status === "deleted") return false;
  if (board.ownerId === actor.id) return true;
  return activeAccessFor(actor, access)?.permission === "manage";
}

export function canDeleteBoard(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  return canManageBoard(actor, board, access);
}

export function canJoinSession(
  actor: Actor,
  liveSession: LiveSessionAuthRecord,
  memberships: SessionMembershipRecord[],
) {
  if (liveSession.status !== "live") return false;
  return memberships.some((membership) => membership.userId === actor.id);
}

export function canIssueLiveKitToken(
  actor: Actor,
  liveSession: LiveSessionAuthRecord,
  memberships: SessionMembershipRecord[],
) {
  return canJoinSession(actor, liveSession, memberships);
}

export function canIssueSyncAccess(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  if (board.status === "deleted") return false;
  if (board.ownerId === actor.id) return true;
  return Boolean(activeAccessFor(actor, access));
}

export function canReadStudentNote(actor: Actor, studentId: string) {
  return actor.id === studentId;
}

export function canWriteStudentNote(actor: Actor, studentId: string) {
  return actor.id === studentId;
}

export function canUsePrivateNotes(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  return canViewBoard(actor, board, access);
}

export function canRestoreCheckpointAsNewBoard(
  actor: Actor,
  board: BoardAuthRecord,
  access: BoardAccessRecord[] = [],
) {
  return canManageBoard(actor, board, access);
}
