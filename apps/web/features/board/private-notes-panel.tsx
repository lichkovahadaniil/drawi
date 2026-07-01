"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveStudentNoteAction } from "@/server/services/notes-actions";

type SaveState = "idle" | "saving" | "saved" | "failed";

export function PrivateNotesPanel({
  boardId,
  initialBody,
  placement = "panel",
}: {
  boardId: string;
  initialBody: string;
  placement?: "panel" | "overlay";
}) {
  const [body, setBody] = useState(initialBody);
  const [state, setState] = useState<SaveState>("idle");
  const [, startTransition] = useTransition();
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setState("saving");
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveStudentNoteAction(boardId, body);
          setState("saved");
        } catch {
          setState("failed");
        }
      });
    }, 850);

    return () => clearTimeout(timeout);
  }, [boardId, body, startTransition]);

  const status =
    state === "saving"
      ? "Saving..."
      : state === "saved"
        ? "Saved"
        : state === "failed"
          ? "Failed to save"
          : "Only you can see these notes";

  if (placement === "overlay") {
    const stickers = body
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5);

    return (
      <section
        className="pointer-events-none absolute inset-3 z-20"
        aria-label="My private notes overlay"
      >
        <div className="grid h-full grid-cols-1 content-between gap-3">
          <div className="flex flex-wrap items-start gap-2">
            {stickers.map((note, index) => (
              <p
                key={`${note}-${index}`}
                className="pointer-events-auto max-w-[15rem] rotate-[-1deg] rounded-[7px] border-2 border-[rgba(32,32,29,0.72)] bg-[#fff2b8] px-3 py-2 text-sm font-bold leading-5 text-[#20201d] shadow-[2px_3px_0_rgba(32,32,29,0.12)]"
              >
                {note}
              </p>
            ))}
          </div>

          <div className="pointer-events-auto w-full max-w-sm justify-self-end rounded-[8px] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-border)] backdrop-blur">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[var(--ink-0)]">My private stickers</h2>
              <span className="text-xs font-bold text-[var(--ink-2)]">{status}</span>
            </div>
            <textarea
              className="drawi-input min-h-24 resize-y text-sm leading-5"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="One private sticker per line..."
              aria-label="My private stickers"
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="drawi-panel grid gap-3 p-4">
      <div>
        <h2 className="font-black text-[var(--ink-0)]">My private notes</h2>
        <p className="mt-1 text-sm text-[var(--ink-2)]">{status}</p>
      </div>
      <textarea
        className="drawi-input min-h-52 resize-y leading-6"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Write private notes from this lesson..."
        aria-label="My private notes"
      />
    </section>
  );
}
