# Bass Culture (Amapiano Mix)

An interactive 3D CD jewel case with a built-in audio player, made for the *Bass Culture (Amapiano Mix)* cover art by thatAfro.

**Live page:** https://hikwamehluli.github.io/bass-culture/

## Features

- Realistic 3D jewel case: drag to rotate, or use the Angle, Front, Spine and Back buttons.
- Audio player: Play/Pause, Repeat, track position bar with time and total length, volume with a click-to-mute speaker, Download and a Share popover (X, Facebook, WhatsApp, Copy link).
- Keyboard shortcuts: `Space` play/pause, `R` repeat, `Esc` close the share popover.
- No build step, no dependencies, no framework. Plain HTML, CSS and JavaScript.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The page markup: the case, the player controls and the share popover |
| `css/styles.css` | All styling, including the light/dark theme variables |
| `js/script.js` | All behaviour, with every setting in the `CONFIG` object at the top |
| `img/bass-culture-amapiano-mix-cover-art.jpg` | The cover art, used on the case front and the inner liner |
| `songs/bass-culture-amapiano-mix.mp3` | The song |
| `README.md` | This file |

## Settings

Everything you are likely to change lives in the `CONFIG` object at the very top of `js/script.js`:

```js
const CONFIG = {
  track: 'songs/bass-culture-amapiano-mix.mp3',
  shareText: 'Listen to Bass Culture (Amapiano Mix) by thatAfro',
  shareUrl: null,
  shareTargets: {
    x: 'https://twitter.com/intent/tweet?text={text}&url={url}',
    facebook: 'https://www.facebook.com/sharer/sharer.php?u={url}',
    whatsapp: 'https://wa.me/?text={text}%20{url}'
  },
  volume: 0.5
};
```

`track` accepts any of these:

1. **A file in this repo** (simplest): `'songs/bass-culture-amapiano-mix.mp3'`
2. **A Suno song link**: `'https://suno.com/song/YOUR-SONG-ID'`. The page converts it to Suno's direct MP3 address automatically.
3. **A Dropbox share link**: `'https://www.dropbox.com/s/xxxx/song.mp3?dl=0'`
4. **Any direct MP3 link** that allows public playback.

Suno playlists can't be loaded directly. Use the link to a single song from the playlist.

`shareUrl` is `null` by default, which shares whichever address the page is open on. Set it to a string such as `'https://hikwamehluli.github.io/bass-culture/'` to always share one fixed address.

## Host on GitHub Pages

1. Push the whole project (including the MP3 and the cover art) to the `main` branch.
2. Go to **Settings > Pages**.
3. Under **Source**, choose **Deploy from a branch**, then **main** and **/(root)**, and click **Save**.
4. Wait a minute or two. The site appears at `https://<username>.github.io/<repo>/`.

## Troubleshooting

- **"Could not play this track" or "Track could not be loaded — check the MP3 file":** the `CONFIG.track` value is wrong, the file name doesn't match exactly (names are case-sensitive), or the MP3 didn't upload properly. Open the MP3 in the repo on GitHub. If it says a few bytes instead of megabytes, delete it and upload it again.
- **Large files:** GitHub's web upload accepts files up to 25 MB. For bigger files, use GitHub Desktop or git (up to 100 MB), or link the song from Suno or Dropbox.
- **Changes not showing:** GitHub Pages can take a minute to update. Hard refresh the page.

## Credits

Cover art, mix and page by Mehluli Hikwa / thatAfro. Artwork and music are not licensed for reuse unless stated otherwise.

Interface icons are from [Phosphor Icons](https://phosphoricons.com) (regular weight, MIT licence), inlined as SVG.
