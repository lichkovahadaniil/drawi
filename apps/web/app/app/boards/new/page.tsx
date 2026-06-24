import { startLessonAction } from "@/server/services/session-actions";

export default function NewBoardPage() {
  return (
    <main className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-black">Start lesson</h1>
        <p className="mt-2 text-[var(--ink-2)]">
          Create a blank shared board and a live 1:1 session.
        </p>
      </div>
      <form action={startLessonAction} className="drawi-panel grid gap-4 p-6">
        <label className="drawi-label">
          Lesson title
          <input
            className="drawi-input"
            name="title"
            required
            minLength={2}
            maxLength={120}
            placeholder="Calculus checkpoint"
          />
        </label>
        <button className="drawi-button" type="submit">
          Create board and invite
        </button>
      </form>
    </main>
  );
}
