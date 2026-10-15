# Orbit - Space Exploration Quiz

Orbit is a ten-question space exploration quiz with instant answer feedback,
scoring, a personal best saved in your browser, and a review of missed answers.
It supports light and dark themes, reduced motion, screen-reader announcements,
and keyboard navigation.

## Run locally

Open `index.html` directly in your browser. No server, dependencies, installation,
or build step is required; the HTML file includes all styles, questions, and
JavaScript.

Use `1` through `4` to select an answer and Enter or Space to advance after
feedback. You can also use the on-screen buttons.
At any point during the quiz, choose **Restart quiz** to
immediately discard the current attempt and return to the welcome screen.
Your saved personal best is kept.

## Tests

With Node.js 24 installed, run the dependency-free tests:

```sh
node --test tests/*.test.js
```

For a browser smoke test, start the quiz, try correct and incorrect answers,
exercise the keyboard controls, complete all ten questions, review missed
answers, and restart.

## GitHub Pages

The website is published at <https://deusername.github.io/space-quiz/>.

The workflow in `.github/workflows/pages.yml` runs the tests on pull requests
and pushes to `main`. After the tests pass on `main`, it packages only
`index.html` and deploys it to GitHub Pages. There is no compilation step.
You can also redeploy `main` using the workflow's **Run workflow** button in
the Actions tab.

In the repository's **Settings > Pages**, the source must be **GitHub Actions**.
Deployments use the `github-pages` environment and the workflow's scoped Pages
and OpenID Connect permissions; no deployment secret is needed.
