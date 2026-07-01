import {
  BOARD_VISIBILITIES,
  BOARD_VISIBILITY_LABELS,
  DEFAULT_BOARD_VISIBILITY,
} from "@/server/domain/board-visibility";
import { startLessonAction } from "@/server/services/session-actions";

export default function NewBoardPage() {
  return (
    <main className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[var(--ink-0)]">Start lesson</h1>
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
        <label className="drawi-label">
          Board privacy
          <select className="drawi-input" name="visibility" defaultValue={DEFAULT_BOARD_VISIBILITY}>
            {BOARD_VISIBILITIES.map((visibility) => (
              <option key={visibility} value={visibility}>
                {BOARD_VISIBILITY_LABELS[visibility]}
              </option>
            ))}
          </select>
          <span className="text-sm font-medium leading-6 text-[var(--ink-2)]">
            You can change privacy later from the board page.
          </span>
        </label>
        <button className="drawi-button" type="submit">
          Create board and invite
        </button>
      </form>
    </main>
  );
}
