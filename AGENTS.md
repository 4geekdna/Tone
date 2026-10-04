# Chakra Journey agent contract

Grok writes the code. Computer's deploy bridge checks, squash-merges, and confirms GitHub Pages. Anthony makes product calls and uses the page. This file is the loop contract. It does not change the served app.

## App

- Static HTML + vanilla JS. No build step, no npm, no framework, no service worker.
- Repo: `4geekdna/Tone` (public). Default branch: `main`. Site root is the repo root.
- Entry: `chakra-deploy.html`. Live: https://4geekdna.github.io/Tone/chakra-deploy.html
- Hub: `index.html` (Tone Master Index). GitHub Pages publishes `main`, folder `/`.
- No Mac build, no signing, no app slot. Anthony opens it in the phone browser.

## Loop

1. Branch `grok/<topic>` from the latest `main`. Never reuse a merged branch. Never stack on an open PR.
2. One concern per PR. If the page changes, bump the visible version and every changed file's `?v=` token.
3. Push and open a PR on `4geekdna/Tone`, base `main`.
4. Title: `DEPLOY: v0.NN <summary>` (regex `^DEPLOY: v\d+\.\d{2} .+`).
5. Body: `DEPLOY-REQUEST v1` (repo, branch, base SHA, head SHA, version, entry, cache-bust, changes, checks, safety, files, verify).
6. Computer checks, squash-merges on PASS, waits for Pages, and posts `COMPUTER_RESULT` in the Grok project chat.
7. Only `publish: PASS` counts as deployed. On BLOCK, fix on a new `grok/*` branch.

GitHub is code only. Do not use issues, PR comments, review comments, or commit messages to message the bots.

## Version and cache-bust

- Visible version lives in `chakra-deploy.html` (`<title>` and the `.sub` line) and, on a release, in the Master Index CURRENT card, top line, and footer.
- When this file was added, `main` was v0.33 @ `64ec14bf08b6c7bf84e3695416867dd09eb3534b`. The next page deploy is v0.34.
- Every deploy that changes what the page does takes the next version. Never reuse one.
- A docs-only PR keeps the current visible version. Title form: `DEPLOY: v0.33 docs: <summary>`.
- A redo of the same scope still takes the next version. Say "fix" in the title.
- Changed loaded `.js` files get a new `?v=YYYYMMDD` plus a letter (`20261001a`, then `20261001b`).
- If `chakra-deploy.html` changes, bump the Master Index card link to `chakra-deploy.html?v=YYYYMMDD-v0NN`.

## Bridge checks

- Title matches `^DEPLOY: v0.NN <summary>`. Branch is `grok/*` or `computer/*`.
- Version in the title matches the page when the PR is a release. Docs-only must not bump it.
- JS parse of every `.js` file. Headless Chrome load of `chakra-deploy.html` and `index.html` with no JavaScript errors.
- No keys, tokens, or logs. No new media. No `.github/**`.
- Never-touch list below holds. Stop, Pause, and Back stay reachable and resumable. History stays completed-only. No `speechSynthesis`.

## Tests (since v0.44)

- `node --test tests/` from the repo root. Node 18+, no npm. The ffmpeg-based tests skip when ffmpeg is missing.
- The primary-chakra logic (`chakra-dominant.js`) is pure and covered there: hold, margin, cooldown, timeline marks.

## Adding videos (since v0.44)

- See `ADDING-VIDEOS.md`. On the phone: Journey Source, Add video. In the repo: drop the file in `videos/incoming/`, run `node tools/add-video.js`, ship `videos/` and `videos/manifest.json` in a DEPLOY PR. Media still needs Anthony's OK.

## UX invariants

1. No system voice. The chakra path never calls `speechSynthesis`. Voice is the on-device cache, then ElevenLabs if a key exists, else the visible "add a key or Build All Voices" message.
2. Voice plays through Web Audio so it follows iOS Share Audio.
3. Stop, Pause, and Back stay reachable during a journey (`#journeyBar`), including immersive mode.
4. Stop and Back are resumable. They save `cj_session_v1`. Resume restores chakra, video position, and settings. Back uses history state and does not reload.
5. History is completed-only. Stopped journeys are not logged as completed.
6. Color controls (warmth, hall reverb, voice volume, tone volume) apply live and must not change the voice cache key. Only Voice-group settings trigger a rebuild.
7. The default MP4 and `ANALYZED = [0,102,194,277,366,450,536]` stay the default journey.
8. API keys stay in the browser. The repo and the site are public.
9. The page loads with no JavaScript errors.

## Never touch (ask Anthony first)

- The MP4 files, their names, `VIDEO_FILES`, and `ANALYZED`. Do not add, re-encode, rename, or delete media.
- Persisted keys: every `cj_*` localStorage key, `govee-api-key`, `starfleet_chakra_outbox`, and IndexedDB `cj_voice_audio_v2`. Add keys; never rename.
- Session schema `starfleet.chakra-journey.v1` and its field names.
- Chakra table `window.C` (names, Hz, notes, colors, affirmations).
- `index.html` beyond the CURRENT card, top line, and footer. Other hub tools. Legacy pages `chakra01.html`, `chakra-flow-lab.html`, `chakra-deploy-v030.html`.
- `ChakraBridge/` and the Muse page.
- GitHub Pages settings, branch protection, repo visibility. No `.github/workflows` without Anthony.
- Secrets in code, comments, PR text, or chat.
- Other repos. No force-push. No merging your own PR.

## Not deployed yet

`chakra-video-selector.js` is on `main` and is not loaded by `chakra-deploy.html`. Wiring it is a page change and must be v0.34 or later, not this docs PR.
