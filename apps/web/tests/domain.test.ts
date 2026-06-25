import { describe, expect, it } from "vitest";
import { createInviteCode, hashInviteCode, isInviteExpired } from "../server/domain/invites";
import { normalizeHandle, validateHandle } from "../server/domain/handles";
import {
  canEditBoard,
  canIssueLiveKitToken,
  canIssueSyncAccess,
  canJoinSession,
  canManageBoard,
  canReadStudentNote,
  canRestoreCheckpointAsNewBoard,
  canViewBoard,
  canWriteStudentNote,
} from "../server/domain/permissions";

describe("handle rules", () => {
  it("normalizes and validates handles", () => {
    expect(normalizeHandle(" Tutor_One ")).toBe("tutor_one");
    expect(validateHandle("app").ok).toBe(false);
    expect(validateHandle("student-1")).toMatchObject({ ok: true, normalized: "student-1" });
  });

  it("rejects malformed and out-of-range handles", () => {
    expect(validateHandle("ab")).toMatchObject({
      ok: false,
      reason: "Handle must be 3-32 characters.",
    });
    expect(validateHandle("a".repeat(33))).toMatchObject({
      ok: false,
      reason: "Handle must be 3-32 characters.",
    });
    expect(validateHandle("-student")).toMatchObject({
      ok: false,
      reason: "Use letters, numbers, underscore, or hyphen.",
    });
    expect(validateHandle("student.one")).toMatchObject({
      ok: false,
      reason: "Use letters, numbers, underscore, or hyphen.",
    });
  });
});

describe("invite helpers", () => {
  it("hashes codes deterministically and detects expiration", () => {
    expect(hashInviteCode("abc")).toBe(hashInviteCode("abc"));
    const now = new Date("2026-06-25T00:00:00.000Z");
    expect(isInviteExpired(new Date("2026-06-24T23:59:59.999Z"), now)).toBe(true);
    expect(isInviteExpired(now, now)).toBe(true);
    expect(isInviteExpired(new Date("2026-06-25T00:00:00.001Z"), now)).toBe(false);
  });

  it("creates url-safe random invite codes", () => {
    const code = createInviteCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code.length).toBeGreaterThanOrEqual(20);
  });
});

describe("permission helpers", () => {
  const board = { id: "board-1", ownerId: "tutor", status: "active" as const };

  it("allows owners to manage and edit", () => {
    const actor = { id: "tutor" };
    expect(canViewBoard(actor, board)).toBe(true);
    expect(canEditBoard(actor, board)).toBe(true);
    expect(canManageBoard(actor, board)).toBe(true);
  });

  it("keeps viewers readonly", () => {
    const actor = { id: "student" };
    const access = [{ userId: "student", permission: "view" as const, revokedAt: null }];
    expect(canViewBoard(actor, board, access)).toBe(true);
    expect(canEditBoard(actor, board, access)).toBe(false);
    expect(canManageBoard(actor, board, access)).toBe(false);
  });

  it("allows editors to edit and managers to manage through active access rows", () => {
    const editor = { id: "editor" };
    const manager = { id: "manager" };
    const access = [
      { userId: "editor", permission: "edit" as const, revokedAt: null },
      { userId: "manager", permission: "manage" as const, revokedAt: null },
    ];

    expect(canViewBoard(editor, board, access)).toBe(true);
    expect(canEditBoard(editor, board, access)).toBe(true);
    expect(canManageBoard(editor, board, access)).toBe(false);
    expect(canViewBoard(manager, board, access)).toBe(true);
    expect(canEditBoard(manager, board, access)).toBe(true);
    expect(canManageBoard(manager, board, access)).toBe(true);
  });

  it("rejects deleted boards, archived edits, revoked access, and strangers", () => {
    const actor = { id: "student" };
    const revokedAccess = [
      { userId: "student", permission: "manage" as const, revokedAt: new Date() },
    ];
    const archivedBoard = { ...board, status: "archived" as const };
    const deletedBoard = { ...board, status: "deleted" as const };

    expect(canViewBoard(actor, board)).toBe(false);
    expect(canIssueSyncAccess(actor, board)).toBe(false);
    expect(canViewBoard(actor, board, revokedAccess)).toBe(false);
    expect(
      canEditBoard(actor, archivedBoard, [
        { userId: "student", permission: "edit", revokedAt: null },
      ]),
    ).toBe(false);
    expect(canViewBoard({ id: "tutor" }, deletedBoard)).toBe(false);
    expect(canManageBoard({ id: "tutor" }, deletedBoard)).toBe(false);
  });

  it("keeps private notes owned by one student", () => {
    expect(canReadStudentNote({ id: "student" }, "student")).toBe(true);
    expect(canReadStudentNote({ id: "tutor" }, "student")).toBe(false);
    expect(canWriteStudentNote({ id: "student" }, "student")).toBe(true);
    expect(canWriteStudentNote({ id: "tutor" }, "student")).toBe(false);
  });

  it("allows only managers to restore checkpoint as a new board", () => {
    expect(canRestoreCheckpointAsNewBoard({ id: "tutor" }, board)).toBe(true);
    expect(canRestoreCheckpointAsNewBoard({ id: "student" }, board)).toBe(false);
  });

  it("allows only live session members to join and receive media tokens", () => {
    const actor = { id: "student" };
    const liveSession = { id: "session-1", hostUserId: "tutor", status: "live" as const };
    const endedSession = { ...liveSession, status: "ended" as const };
    const memberships = [{ userId: "student", role: "student" as const, canEditBoard: true }];

    expect(canJoinSession(actor, liveSession, memberships)).toBe(true);
    expect(canIssueLiveKitToken(actor, liveSession, memberships)).toBe(true);
    expect(canJoinSession({ id: "stranger" }, liveSession, memberships)).toBe(false);
    expect(canIssueLiveKitToken(actor, endedSession, memberships)).toBe(false);
  });
});
