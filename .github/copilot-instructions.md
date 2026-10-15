# Copilot instructions

## Project shape

- `index.html` is the complete app: it contains the welcome, quiz, and results screens, inline styles, quiz data, and interaction logic. Keep changes self-contained so the page continues to run directly without a server or external dependencies.
- The `questions` array drives the quiz. Each `correct` value is a zero-based index into that question's `answers`; keep those aligned when editing questions.
- Quiz state and screen updates are handled by `startQuiz`, `renderQuestion`, `selectAnswer`, and `showResults`. Preserve their flow when changing how questions, feedback, scoring, or results work.
- Theme colors are CSS custom properties in `:root`, with dark-mode overrides under `prefers-color-scheme`. Keep visual changes compatible with both schemes and the existing reduced-motion rule.
- Dynamic quiz updates use focus management, an announcement live region, answer buttons, and an ARIA progress bar. Preserve these when changing the interaction or markup. The keyboard controls are `1`–`4` to answer and Enter/Space to advance after feedback.

## Run and validate

- Run the app by opening `index.html` directly in a browser (`file://`).
- No build, test, or lint commands are configured. Use a browser smoke test: start or restart, verify correct and incorrect feedback and score changes, exercise the keyboard controls, complete all 10 questions, and check the results screen.
