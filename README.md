# Bass Culture (Amapiano Mix)

An interactive 3D CD jewel case with a built-in audio player, made for the *Bass Culture (Amapiano Mix)* cover art by thatAfro.

**Live page:** https://hikwamehluli.github.io/bass-culture/

## Features

- Realistic 3D jewel case: drag to rotate, or use the Angle, Front, Spine and Back buttons.
- Simple audio player: Play/Pause, Stop, track position bar with time and total length, volume (starts at 50%) and Download.
- One file, no build step and no dependencies. The cover art is embedded in `index.html`.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole page: case, styles, player and cover art |
| `bass-culture-amapiano-mix.mp3` | The song (only needed if you host it in this repo) |
| `README.md` | This file |

## Set the song

Open `index.html`, find the line below and change the value:

```js
const TRACK="bass-culture-amapiano-mix.mp3";
```

`TRACK` accepts any of these:

1. **A file in this repo** (simplest): `"bass-culture-amapiano-mix.mp3"`
2. **A Suno song link**: `"https://suno.com/song/YOUR-SONG-ID"`. The page converts it to Suno's direct MP3 address automatically.
3. **A Dropbox share link**: `"https://www.dropbox.com/s/xxxx/song.mp3?dl=0"`
4. **Any direct MP3 link** that allows public playback.

Suno playlists can't be loaded directly. Use the link to a single song from the playlist.

## Host on GitHub Pages

1. Push `index.html` (and the MP3, if you use option 1) to the `main` branch.
2. Go to **Settings > Pages**.
3. Under **Source**, choose **Deploy from a branch**, then **main** and **/(root)**, and click **Save**.
4. Wait a minute or two. The site appears at `https://<username>.github.io/<repo>/`.

## Troubleshooting

- **"Could not play this track" or "Track not found":** the `TRACK` value is wrong, the file name doesn't match exactly (names are case-sensitive), or the MP3 didn't upload properly. Open the MP3 in the repo on GitHub. If it says a few bytes instead of megabytes, delete it and upload it again.
- **Large files:** GitHub's web upload accepts files up to 25 MB. For bigger files, use GitHub Desktop or git (up to 100 MB), or link the song from Suno or Dropbox.
- **Changes not showing:** GitHub Pages can take a minute to update. Hard refresh the page.

## Credits

Cover art, mix and page by Mehluli Hikwa / thatAfro. Artwork and music are not licensed for reuse unless stated otherwise.
