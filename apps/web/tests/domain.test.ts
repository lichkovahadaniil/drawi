import { describe, expect, it } from "vitest";
import {
  BOARD_VISIBILITIES,
  BOARD_VISIBILITY_DESCRIPTIONS,
  BOARD_VISIBILITY_LABELS,
  DEFAULT_BOARD_VISIBILITY,
  isBoardVisibility,
  parseBoardVisibilityInput,
} from "../server/domain/board-visibility";
import {
  CHANNEL_VISIBILITIES,
  CHANNEL_VISIBILITY_DESCRIPTIONS,
  CHANNEL_VISIBILITY_LABELS,
  DEFAULT_CHANNEL_VISIBILITY,
  canListBoardOnChannel,
  canRespondToFriendRequest,
  canSendFriendRequest,
  canViewChannel,
  chooseSearchProfileView,
  getFriendshipState,
  isChannelVisibility,
  parseChannelVisibilityInput,
} from "../server/domain/profile-privacy";
import {
  createInviteCode,
  hashInviteCode,
  isInviteExpired,
  normalizeInviteCodeInput,
} from "../server/domain/invites";
import { normalizeHandle, validateHandle } from "../server/domain/handles";
import {
  canDeleteBoard,
  canEditBoard,
  canIssueLiveKitToken,
  canIssueSyncAccess,
  canJoinSession,
  canListBoardInLibrary,
  canManageBoard,
  canReadStudentNote,
  canRestoreCheckpointAsNewBoard,
  canUsePrivateNotes,
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

  it("normalizes pasted invite codes without changing the code itself", () => {
    expect(normalizeInviteCodeInput("  abc_DEF-123  ")).toBe("abc_DEF-123");
    expect(normalizeInviteCodeInput("https://drawi.test/join/abc_DEF-123")).toBe("abc_DEF-123");
    expect(normalizeInviteCodeInput("https://drawi.test/join/abc_DEF-123?utm=chat")).toBe(
      "abc_DEF-123",
    );
    expect(normalizeInviteCodeInput("https://drawi.test/join/bad%code")).toBe("bad%code");
    expect(normalizeInviteCodeInput("")).toBe("");
  });
});

describe("board visibility helpers", () => {
  it("defines labels and descriptions for every privacy mode", () => {
    expect(BOARD_VISIBILITIES).toEqual(["private", "friends", "public"]);
    expect(DEFAULT_BOARD_VISIBILITY).toBe("private");
    for (const visibility of BOARD_VISIBILITIES) {
      expect(BOARD_VISIBILITY_LABELS[visibility].length).toBeGreaterThan(2);
      expect(BOARD_VISIBILITY_DESCRIPTIONS[visibility].length).toBeGreaterThan(10);
    }
  });

  it("parses visibility input with a safe default", () => {
    expect(isBoardVisibility("public")).toBe(true);
    expect(isBoardVisibility("private")).toBe(true);
    expect(isBoardVisibility("private_link")).toBe(false);
    expect(isBoardVisibility(null)).toBe(false);
    expect(parseBoardVisibilityInput("friends")).toBe("friends");
    expect(parseBoardVisibilityInput("not-a-mode")).toBe(DEFAULT_BOARD_VISIBILITY);
    expect(parseBoardVisibilityInput(null)).toBe(DEFAULT_BOARD_VISIBILITY);
  });
});

describe("channel privacy and friendship helpers", () => {
  const owner = { id: "tutor" };
  const stranger = { id: "stranger" };
  const friend = { id: "friend" };
  const incomingRequester = { id: "requester" };
  const acceptedFriendship = {
    requesterId: "tutor",
    addresseeId: "friend",
    status: "accepted" as const,
  };
  const outgoingRequest = {
    requesterId: "stranger",
    addresseeId: "tutor",
    status: "pending" as const,
  };
  const incomingRequest = {
    requesterId: "requester",
    addresseeId: "tutor",
    status: "pending" as const,
  };
  const unrelatedRequest = {
    requesterId: "one",
    addresseeId: "two",
    status: "pending" as const,
  };
  const declinedRequest = {
    requesterId: "stranger",
    addresseeId: "tutor",
    status: "declined" as const,
  };

  it("defines and parses channel privacy", () => {
    expect(CHANNEL_VISIBILITIES).toEqual(["private", "friends", "public"]);
    expect(DEFAULT_CHANNEL_VISIBILITY).toBe("public");
    for (const visibility of CHANNEL_VISIBILITIES) {
      expect(CHANNEL_VISIBILITY_LABELS[visibility].length).toBeGreaterThan(2);
      expect(CHANNEL_VISIBILITY_DESCRIPTIONS[visibility].length).toBeGreaterThan(10);
    }
    expect(isChannelVisibility("friends")).toBe(true);
    expect(isChannelVisibility("session_link")).toBe(false);
    expect(parseChannelVisibilityInput("private")).toBe("private");
    expect(parseChannelVisibilityInput("nope")).toBe(DEFAULT_CHANNEL_VISIBILITY);
  });

  it("summarizes friendship state from the current actor perspective", () => {
    expect(getFriendshipState(owner, "tutor")).toBe("self");
    expect(getFriendshipState(null, "tutor")).toBe("none");
    expect(getFriendshipState(stranger, "tutor")).toBe("none");
    expect(getFriendshipState(friend, "tutor", acceptedFriendship)).toBe("friends");
    expect(getFriendshipState(stranger, "tutor", outgoingRequest)).toBe("request_sent");
    expect(getFriendshipState(owner, "stranger", outgoingRequest)).toBe("request_received");
    expect(getFriendshipState(stranger, "tutor", unrelatedRequest)).toBe("none");
    expect(getFriendshipState(stranger, "tutor", declinedRequest)).toBe("none");
  });

  it("protects private and friends-only channels", () => {
    expect(canViewChannel(owner, "tutor", "private")).toBe(true);
    expect(canViewChannel(stranger, "tutor", "private")).toBe(false);
    expect(canViewChannel(null, "tutor", "friends")).toBe(false);
    expect(canViewChannel(stranger, "tutor", "friends")).toBe(false);
    expect(canViewChannel(friend, "tutor", "friends", acceptedFriendship)).toBe(true);
    expect(canViewChannel(null, "tutor", "public")).toBe(true);
  });

  it("lists only the board visibility each viewer may see on a channel", () => {
    const privateBoard = {
      id: "board-1",
      ownerId: "tutor",
      status: "active" as const,
      visibility: "private" as const,
    };
    const friendsBoard = { ...privateBoard, id: "board-2", visibility: "friends" as const };
    const publicBoard = { ...privateBoard, id: "board-3", visibility: "public" as const };
    const deletedPublicBoard = { ...publicBoard, status: "deleted" as const };

    expect(canListBoardOnChannel(owner, "tutor", privateBoard)).toBe(true);
    expect(canListBoardOnChannel(friend, "tutor", friendsBoard, acceptedFriendship)).toBe(true);
    expect(canListBoardOnChannel(stranger, "tutor", friendsBoard)).toBe(false);
    expect(canListBoardOnChannel(stranger, "tutor", publicBoard)).toBe(true);
    expect(canListBoardOnChannel(null, "tutor", privateBoard)).toBe(false);
    expect(canListBoardOnChannel(null, "tutor", deletedPublicBoard)).toBe(false);
  });

  it("gates friend requests and request responses", () => {
    expect(canSendFriendRequest(stranger, "tutor")).toBe(true);
    expect(canSendFriendRequest(owner, "tutor")).toBe(false);
    expect(canSendFriendRequest(null, "tutor")).toBe(false);
    expect(canSendFriendRequest(friend, "tutor", acceptedFriendship)).toBe(false);
    expect(canSendFriendRequest(stranger, "tutor", outgoingRequest)).toBe(false);

    expect(canRespondToFriendRequest(owner, incomingRequest, "accepted")).toBe(true);
    expect(canRespondToFriendRequest(owner, incomingRequest, "declined")).toBe(true);
    expect(canRespondToFriendRequest(incomingRequester, incomingRequest, "accepted")).toBe(false);
    expect(canRespondToFriendRequest(owner, acceptedFriendship, "accepted")).toBe(false);
  });

  it("chooses channel search mode from teaching intent or visible teaching boards", () => {
    expect(chooseSearchProfileView(true, 0)).toBe("teaching");
    expect(chooseSearchProfileView(false, 1)).toBe("teaching");
    expect(chooseSearchProfileView(false, 0)).toBe("learning");
  });
});

describe("permission helpers", () => {
  const board = {
    id: "board-1",
    ownerId: "tutor",
    status: "active" as const,
    visibility: "private" as const,
  };

  it("allows owners to manage and edit", () => {
    const actor = { id: "tutor" };
    expect(canViewBoard(actor, board)).toBe(true);
    expect(canEditBoard(actor, board)).toBe(true);
    expect(canManageBoard(actor, board)).toBe(true);
    expect(canDeleteBoard(actor, board)).toBe(true);
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
    expect(canDeleteBoard({ id: "tutor" }, deletedBoard)).toBe(false);
  });

  it("separates profile discovery, library listing, link opening, and sync access", () => {
    const student = { id: "student" };
    const publicBoard = { ...board, visibility: "public" as const };
    const privateBoard = { ...board, visibility: "private" as const };
    const friendsBoard = { ...board, visibility: "friends" as const };
    const deletedPublicBoard = { ...publicBoard, status: "deleted" as const };
    const activeAccess = [{ userId: "student", permission: "view" as const, revokedAt: null }];

    expect(canListBoardOnChannel(null, "tutor", publicBoard)).toBe(true);
    expect(canListBoardOnChannel(null, "tutor", privateBoard)).toBe(false);
    expect(canListBoardOnChannel(null, "tutor", friendsBoard)).toBe(false);
    expect(canListBoardOnChannel({ id: "tutor" }, "tutor", privateBoard)).toBe(true);
    expect(canListBoardOnChannel(null, "tutor", deletedPublicBoard)).toBe(false);

    expect(canListBoardInLibrary(student, privateBoard, activeAccess)).toBe(true);
    expect(canListBoardInLibrary(student, friendsBoard, activeAccess)).toBe(true);
    expect(canListBoardInLibrary(student, publicBoard, activeAccess)).toBe(true);
    expect(canListBoardInLibrary(student, publicBoard)).toBe(false);
    expect(canListBoardInLibrary({ id: "tutor" }, privateBoard)).toBe(true);
    expect(canListBoardInLibrary({ id: "tutor" }, deletedPublicBoard)).toBe(false);

    expect(canIssueSyncAccess(student, publicBoard)).toBe(false);
    expect(canIssueSyncAccess(student, privateBoard)).toBe(false);
    expect(canIssueSyncAccess(student, friendsBoard)).toBe(false);
    expect(canIssueSyncAccess({ id: "tutor" }, publicBoard)).toBe(true);
    expect(canIssueSyncAccess({ id: "tutor" }, deletedPublicBoard)).toBe(false);
    expect(canIssueSyncAccess(student, publicBoard, activeAccess)).toBe(true);
  });

  it("keeps private notes owned by one student", () => {
    expect(canReadStudentNote({ id: "student" }, "student")).toBe(true);
    expect(canReadStudentNote({ id: "tutor" }, "student")).toBe(false);
    expect(canWriteStudentNote({ id: "student" }, "student")).toBe(true);
    expect(canWriteStudentNote({ id: "tutor" }, "student")).toBe(false);
  });

  it("requires board visibility before private notes can be used", () => {
    const activeAccess = [{ userId: "student", permission: "view" as const, revokedAt: null }];
    const revokedAccess = [
      { userId: "student", permission: "view" as const, revokedAt: new Date() },
    ];
    const deletedBoard = { ...board, status: "deleted" as const };

    expect(canUsePrivateNotes({ id: "tutor" }, board)).toBe(true);
    expect(canUsePrivateNotes({ id: "student" }, board, activeAccess)).toBe(true);
    expect(canUsePrivateNotes({ id: "student" }, board)).toBe(false);
    expect(canUsePrivateNotes({ id: "student" }, board, revokedAccess)).toBe(false);
    expect(canUsePrivateNotes({ id: "tutor" }, deletedBoard)).toBe(false);
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
