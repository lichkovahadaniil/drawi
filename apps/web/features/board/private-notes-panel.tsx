"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveStudentNoteAction } from "@/server/services/notes-actions";

type SaveState = "idle" | "saving" | "saved" | "failed";

export function PrivateNotesPanel({
  boardId,
  initialBody,
}: {
  boardId: string;
  initialBody: string;
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

  return (
    <section className="drawi-panel grid gap-3 p-4">
      <div>
        <h2 className="font-black">My private notes</h2>
        <p className="text-sm text-[var(--ink-2)]">{status}</p>
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
