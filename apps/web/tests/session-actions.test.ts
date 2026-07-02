import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequiredUser } from "../server/auth/auth";
import { getDb } from "../server/db/client";
import { endSessionAction, updateBoardVisibilityAction } from "../server/services/session-actions";
import { writeCheckpointSnapshot } from "../server/services/checkpoint-snapshots";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("../server/auth/auth", () => ({
  getRequiredUser: vi.fn(),
}));
vi.mock("../server/db/client", () => ({
  getDb: vi.fn(),
}));
vi.mock("../server/services/checkpoint-snapshots", () => ({
  writeCheckpointSnapshot: vi.fn(),
}));

type RecordedUpdate = {
  table: unknown;
  values: Record<string, unknown>;
};

type RecordedInsert = {
  table: unknown;
  values: Record<string, unknown>;
};

function queuedSelect(rowBatches: unknown[][]) {
  const nextRows = () => {
    const rows = rowBatches.shift() ?? [];
    const result = Promise.resolve(rows) as Promise<unknown[]> & {
      limit: (_limit: number) => Promise<unknown[]>;
    };
    result.limit = async (_limit: number) => rows;
    return result;
  };

  return {
    from: (_table: unknown) => ({
      where: (_condition: unknown) => nextRows(),
    }),
  };
}

function createSessionEndDb() {
  const liveSession = {
    id: "session-1",
    boardId: "board-1",
    hostUserId: "tutor-1",
    status: "live",
  };
  const board = {
    id: "board-1",
    ownerId: "tutor-1",
    roomId: "room-1",
    status: "active",
    visibility: "friends",
  };
  const members = [
    { userId: "tutor-1", role: "tutor" },
    { userId: "student-1", role: "student" },
  ];
  const rootSelectBatches: unknown[][] = [[liveSession], [board], [], [{ handle: "tutor-one" }]];
  const txSelectBatches: unknown[][] = [members];
  const updates: RecordedUpdate[] = [];
  const inserts: RecordedInsert[] = [];

  const tx = {
    select: vi.fn(() => queuedSelect(txSelectBatches)),
    update: vi.fn((table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async (_condition: unknown) => {
          updates.push({ table, values });
        },
      }),
    })),
    insert: vi.fn((table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        inserts.push({ table, values });
        return {
          onConflictDoNothing: async () => undefined,
        };
      },
    })),
  };

  const db = {
    select: vi.fn(() => queuedSelect(rootSelectBatches)),
    transaction: vi.fn(async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx)),
  };

  return { db, inserts, updates };
}

describe("session actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRequiredUser).mockResolvedValue({
      id: "tutor-1",
    } as Awaited<ReturnType<typeof getRequiredUser>>);
    vi.mocked(writeCheckpointSnapshot).mockResolvedValue(undefined);
  });

  it("rejects malformed board privacy saves instead of defaulting to private", async () => {
    const formData = new FormData();

    await expect(updateBoardVisibilityAction("board-1", formData)).rejects.toThrow(
      "Choose a valid board visibility.",
    );

    expect(getDb).not.toHaveBeenCalled();
  });

  it("ends a session without updating board visibility", async () => {
    const { db, inserts, updates } = createSessionEndDb();
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);

    await expect(endSessionAction("session-1")).rejects.toThrow("redirect:/app/boards/board-1");

    expect(writeCheckpointSnapshot).toHaveBeenCalledWith({
      roomId: "room-1",
      storageKey: expect.stringMatching(/^checkpoints\/board-1\/.+\.json$/),
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.values).toMatchObject({ status: "ended" });
    expect(updates[0]?.values).not.toHaveProperty("visibility");
    expect(inserts.map((insert) => insert.values)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "session_end" }),
        expect.objectContaining({ userId: "tutor-1", relationship: "created" }),
        expect.objectContaining({ userId: "student-1", relationship: "learned" }),
      ]),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/app");
    expect(revalidatePath).toHaveBeenCalledWith("/app/boards");
    expect(revalidatePath).toHaveBeenCalledWith("/app/boards/board-1");
    expect(revalidatePath).toHaveBeenCalledWith("/u/tutor-one");
    expect(redirect).toHaveBeenCalledWith("/app/boards/board-1");
  });
});
