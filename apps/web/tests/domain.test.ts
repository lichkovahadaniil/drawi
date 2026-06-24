import { describe, expect, it } from "vitest";
import { hashInviteCode, isInviteExpired } from "../server/domain/invites";
import { normalizeHandle, validateHandle } from "../server/domain/handles";
import {
  canEditBoard,
  canManageBoard,
  canReadStudentNote,
  canRestoreCheckpointAsNewBoard,
  canViewBoard,
} from "../server/domain/permissions";

describe("handle rules", () => {
  it("normalizes and validates handles", () => {
    expect(normalizeHandle(" Tutor_One ")).toBe("tutor_one");
    expect(validateHandle("app").ok).toBe(false);
    expect(validateHandle("student-1")).toMatchObject({ ok: true, normalized: "student-1" });
  });
});

describe("invite helpers", () => {
  it("hashes codes deterministically and detects expiration", () => {
    expect(hashInviteCode("abc")).toBe(hashInviteCode("abc"));
    expect(isInviteExpired(new Date(Date.now() - 1000))).toBe(true);
    expect(isInviteExpired(new Date(Date.now() + 1000))).toBe(false);
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

  it("keeps private notes owned by one student", () => {
    expect(canReadStudentNote({ id: "student" }, "student")).toBe(true);
    expect(canReadStudentNote({ id: "tutor" }, "student")).toBe(false);
  });

  it("allows only managers to restore checkpoint as a new board", () => {
    expect(canRestoreCheckpointAsNewBoard({ id: "tutor" }, board)).toBe(true);
    expect(canRestoreCheckpointAsNewBoard({ id: "student" }, board)).toBe(false);
  });
});
