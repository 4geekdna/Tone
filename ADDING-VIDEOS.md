# Adding videos to Chakra Journey

Since v0.44 there are two ways to add a video. Both find the chakra timeline by
listening to the video's own sound, the same detection that Auto mode uses
(`chakra-dominant.js`).

## 1. On the phone: Add video (for Anthony)

1. Open the page, go to **Journey Source**, and tap **Add video**.
2. Pick **From this device** and choose a video (Photos or Files). You can also
   pick **From a link** and paste a direct link to an `.mp4` file.
3. Add a name if you want one. Tap **Analyze and save**.
4. The phone decodes the audio and finds where each chakra leads (this takes a
   few seconds for an 11-minute video). The video is saved with its seven marks
   and selected in **Journey video**.
5. Play it with any mode. Video Timestamp Sync uses the detected marks. Auto
   follows the sound live, so it works even when the marks are only estimated.

To delete one, select it in **Journey video** and tap **Remove**.

### Limits

- **YouTube does not work.** YouTube pages are not video files, and browsers do
  not let a page read audio from another site unless that site allows it
  (cross-origin, CORS). Download the video to the phone and add the file instead.
- **Links must allow cross-origin reads.** The page checks first and says so if a
  site blocks it. Most file-sharing pages (Dropbox, Drive previews) are web pages,
  not direct files.
- **Videos added on the phone stay on that phone**, in the browser's storage
  (IndexedDB `cj_video_library_v1`). They do not sync to other devices. Safari can
  clear website storage for sites you have not opened in a while; adding the page
  to the Home Screen makes that much less likely. If the file could not be stored,
  the timeline is kept and the page asks for the file again when you play it.
- **Very large files** (over 600 MB) are saved without analysis; marks are spaced
  evenly and Auto mode still follows the sound.
- **No clear sequence:** if fewer than four chakras lead in Root-to-Crown order,
  the marks are spaced evenly and labeled as estimated. Auto mode is the better
  choice for those videos.

## 2. In the repo: drop folder + manifest + script (for bots and Computer)

Repo videos show up for everyone, on every device, in a **Library** group of the
Journey video menu.

```sh
# from the repo root; needs Node 18+ and ffmpeg/ffprobe
cp "/path/to/New Sound Bath.mp4" videos/incoming/
node tools/add-video.js                    # analyze everything in videos/incoming/
node tools/add-video.js --check            # validate videos/manifest.json
node --test tests/                         # run the tests
```

What the script does for each file:

1. Decodes the audio to 8 kHz mono with ffmpeg and runs the same detection the
   page uses, so the marks match what Auto hears.
2. Moves the file to `videos/<slug>.<ext>` (the slug comes from the label).
3. Adds an entry to `videos/manifest.json`:
   `id`, `label`, `file`, `duration`, `timestamps` (7 seconds, Root..Crown),
   `segments` (every primary-chakra change), `estimated`, `found`, `bytes`,
   `analyzedAt`, `source`.

Options: `--label "Name"` (one file), `--compress` (re-encode to H.264 720p and
AAC 128k), `--dry-run` (print the marks only), `--root DIR`.

Then ship it the usual way: branch `grok/<topic>`, `DEPLOY:` PR, merge, wait for
GitHub Pages. The page reads `videos/manifest.json` at load, so no code change is
needed to add a video.

### Repo rules

- GitHub rejects files over 100 MB, and Pages does not serve Git LFS files. The
  script refuses files over 95 MB; use `--compress`. Aim for under 50 MB.
- Adding media needs Anthony's OK (see `AGENTS.md`). Never rename or re-encode the
  two original MP4s, and never edit `VIDEO_FILES` or `ANALYZED`.
- The repo and site are public. Only add videos that may be public.

## How detection works (short)

Each spectral peak between 80 and 2200 Hz is mapped to a chakra: an exact
solfeggio tone (396, 417, 528, 639, 741, 852, 963 Hz, within 0.6 %) maps by Hz,
anything else maps by its musical note (C Root, D Sacral, E Solar, F Heart,
G Throat, A Third Eye, B Crown), matching the chakra table. Peaks are weighted
the way the ear hears loudness (A-weighting), so a low hum does not outvote the
bowl, and tones on a sharp are discounted. A chakra becomes primary only after
it leads every other chakra by the margin (3 dB by default) for the hold time
(3.5 s live, 4 s for the offline timeline). On the original 11:10 video this
finds Root 0:01, Sacral 1:43, Solar 3:15, Heart 4:38, Throat 6:07, Third Eye
7:32, Crown 8:58, within 2 seconds of the hand-analyzed marks.
