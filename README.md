# Bass Culture (Amapiano Mix)

An interactive 3D CD jewel case with a built-in audio player, made for the *Bass Culture (Amapiano Mix)* cover art by thatAfro.

**Live page:** https://hikwamehluli.github.io/bass-culture/

## Features

- Realistic 3D jewel case: drag to rotate, or use the Angle, Front, Spine and Back buttons.
- Audio player: Play/Pause, Repeat, track position bar with time and total length, volume with a click-to-mute speaker, Download and a Share popover (X, Facebook, WhatsApp, Copy link).
- Keyboard shortcuts: `Space` play/pause, `R` repeat, `Esc` close the share popover.
- Works offline: the whole page and the song are saved on the first visit, so later visits need no connection.
- No build step, no dependencies, no framework. Plain HTML, CSS and JavaScript.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The page markup: the case, the player controls and the share popover |
| `css/styles.css` | All styling, including the light/dark theme variables |
| `js/script.js` | All behaviour, with every setting in the `CONFIG` object at the top |
| `sw.js` | Service Worker: saves the page and the song for offline use |
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

## Run it locally

Double-clicking `index.html` opens the player, but **offline caching will not work**. Browsers only allow Service Workers over `https` or `localhost`, so from a folder on disk the page loads and plays normally but skips saving anything.

To test the real thing, serve the folder over `localhost`. Either:

```bash
npx serve .          # Node, no install needed beyond the first run
```

or, if you have Python installed:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

To check that caching really happened, open **DevTools > Application > Cache Storage**. You should see a cache named `bass-culture-v3` holding the page files and `songs/bass-culture-amapiano-mix.mp3`. You can also tick **Offline** in the **Network** tab and reload: the case, the player and the song should all still work.

## Host on GitHub Pages

1. Push the whole project (including the MP3 and the cover art) to the `main` branch.
2. Go to **Settings > Pages**.
3. Under **Source**, choose **Deploy from a branch**, then **main** and **/(root)**, and click **Save**.
4. Wait a minute or two. The site appears at `https://<username>.github.io/<repo>/`.

GitHub Pages is served over `https`, so the Service Worker works there with no extra setup.

## Offline and caching

`sw.js` is a Service Worker: a small script that runs in the background and intercepts requests before they reach the network.

### What gets saved

| Thing | Saved? | When |
| --- | --- | --- |
| `index.html`, `css/styles.css`, `js/script.js` | Yes | On every visit, quietly in the background |
| Cover image | Yes | On every visit |
| The song (5.4 MB) | Yes | Once, in the background, while it plays |
| A Suno or Dropbox link | No | Those are fetched from their own site, and `sw.js` deliberately leaves other sites alone |

Once saved, the song is served from the saved copy, so repeat visits use **no data at all** and work with the connection off.

### The song downloads only once

This is the part worth understanding. A Service Worker can `fetch()` the song a single time and then do two things with those same bytes at once: hand them to the player *and* keep a copy for next time. So a first visit moves 5.4 MB, not 10.8 MB.

There are two details in `js/script.js` that make this work:

- **The player waits for the Service Worker.** A Service Worker can only handle requests from a page it already controls. If the player asked for the song immediately on page load, the browser would fetch it directly, the Service Worker would never see those bytes, and a second download would happen just to keep a copy. So `startMusic()` registers `./sw.js`, waits for `controllerchange`, and only then sets `audio.src`. If that wait somehow fails, a 3-second timeout starts the music anyway — caching must never be able to block playback.
- **The "saved" message is honest.** `sw.js` sends `Saved for offline…` only once `cache.put()` has genuinely finished. If you close the tab early, the browser discards the incomplete copy and the message simply never appears.

### Why there is no progress percentage

The player receives an opaque stream and never sees the individual bytes, so a percentage cannot be measured. The line under the player reads `Loading song — saving for offline…` and then switches to `Saved for offline — the download will be instant next time`. Showing a real percentage would require the page to download the file itself with `fetch()`, which would hold the music back until all 5.4 MB had arrived. That was a deliberate trade: start playing now, or show a number and wait.

### Publishing an update

The cache is cache-first, which means a visitor who has already visited keeps seeing whatever they loaded first. To fix that, edit the version at the top of `sw.js`:

```js
const CACHE = 'bass-culture-v3';   // change to v4, then v5, and so on
```

The Service Worker notices the change, saves the new files and deletes the old cache on the next visit. **Bump this whenever you publish changes**, or your updates will not reach returning visitors. Only `sw.js` is versioned this way; the song is keyed by its own address, so replacing the MP3 at the same path needs the version bump too.

### Supported browsers

Any current browser: Chrome, Edge, Firefox and Safari. Private/incognito windows and a few strict privacy settings may block saving, in which case the player still works, it just re-downloads each visit. If you see `Offline caching needs a local server`, `sw.js` could not register — check that you are on `https` or `localhost` and not a `file://` path.

## Analytics

The page reports how many people listened and how many took the file. Numbers go to [Umami](https://umami.is), a privacy-first analytics service, and sit in an account behind a login. There is no cookie banner because nothing personal is collected: no cookies, no IP addresses, no fingerprinting, nothing that identifies a visitor.

Remove the `<script>` tag in `index.html` and the two calls in `js/script.js` if you don't want any of it. The player behaves identically either way, because every call is optional.

### Where the numbers actually are

This is the part that makes the dashboard look broken when it isn't.

| You are looking for | Where it is |
| --- | --- |
| Page views, visitors, sessions | **Overview** page |
| `Play` and `Download` | **Events** page |

Plays and downloads are custom events, so they never appear in the headline tiles on the Overview page. Go to **Events** to see them.

### Getting your own counts

1. Sign up at [umami.is](https://umami.is) and add a website.
2. Click **Edit** on that website, then the **Tracking Code** tab, and copy the script tag.
3. Paste it into `<head>` in `index.html`, replacing the existing one.

Do this on your own copy. The website ID in this repo belongs to the original author, and the `data-domains` setting below means a copy on a different address sends that account nothing anyway.

### Why a fork counts nothing, on purpose

```html
<script defer src="https://cloud.umami.is/script.js"
  data-website-id="4aab31a8-07c2-4cfb-a02a-5c2c3ac10185"
  data-domains="hikwamehluli.github.io,localhost,127.0.0.1"></script>
```

`data-domains` is a comma-separated list of hostnames. The tracker compares it against `window.location.hostname` and refuses to send anything at all unless the current address matches. That is what stops everyone else's copy of this repo from inflating one dashboard.

Two things follow, and both have caught people out:

- **It matches a hostname, not a path.** `localhost` is listed so the page still counts while you test it on your own machine. Anything else — a LAN address like `192.168.1.5` when testing on your phone over Wi-Fi — stays silent. Test on mobile data against the real address instead.
- **If you rename the GitHub user or the repo, update the first entry to match,** or the page goes quiet with no error anywhere.

The website ID is a public send key. Anyone can read it out of the page source, but it only ever lets somebody *add* to your counts; reading the numbers still needs the account login.

### Nothing is being recorded

If the tracker were broken, it would be silent in the browser with no warning. Check these four things, in order:

1. **Are the requests going out?** DevTools > **Network**, filter `send`, and reload. Expect `POST https://gateway.umami.is/api/send` returning **200**: one for the page view, another for performance a moment later, and one more per `Play` or `Download`. The `OPTIONS` line above each one is a preflight the browser requires because the tracker sends custom headers. It is normal.
2. **Did the tracker script itself load?** Search the Network tab for `cloud.umami.is/script.js`. Blocked or missing means an ad blocker, Brave, or a privacy extension stopped it. Try a private window with extensions disabled before changing any code.
3. **What address are you on?** Run this in the console:

   ```js
   location.hostname
   ```

   If it isn't in the `data-domains` list, the tracker is deliberately refusing to send.
4. **Did the Service Worker serve you the old page?** A returning visitor is served the cached copy, so a fix may not have reached you yet. Bump the version in `sw.js`, then hard refresh **twice** — the first load still comes from the previous cache. Or unregister it: DevTools > **Application > Service Workers** > **Unregister**.

A browser asking not to be tracked is *not* a reason to stop counting now, but note that ad blockers and privacy extensions will always be able to hide a visit.

### What counts as a play or a download

Both are deliberately hard to fake, which also means they stay near zero at first:

- **`Play`** needs **10 seconds of real listening**, or half the track for anything shorter than twenty seconds. Dragging the seek bar is detected and ignored, and only one play is counted per visit no matter how often the track is replayed.
- **`Download`** only counts a genuine left-click on the download icon. Right-click and "Save link as" bypass it, and so does a long-press on a phone.

If both sit at zero while page views climb, that is most likely people pressing play and leaving, not a fault.

## Troubleshooting

- **"Could not play this track" or "Track could not be loaded — check the MP3 file":** the `CONFIG.track` value is wrong, the file name doesn't match exactly (names are case-sensitive), or the MP3 didn't upload properly. Open the MP3 in the repo on GitHub. If it says a few bytes instead of megabytes, delete it and upload it again.
- **Large files:** GitHub's web upload accepts files up to 25 MB. For bigger files, use GitHub Desktop or git (up to 100 MB), or link the song from Suno or Dropbox.
- **Changes not showing:** GitHub Pages can take a minute to update. Hard refresh the page.
- **Changes still not showing after that:** a returning visitor is being served the saved copy. Bump the version in `sw.js`, or tick **Offline** in DevTools, go to **Application > Service Workers** and click **Unregister**, then reload.
- **No numbers in the dashboard:** see [Analytics](#nothing-is-being-recorded) above. The likeliest cause is that you're looking on the Overview page, where plays and downloads never appear.

## Credits

Cover art, mix and page by Mehluli Hikwa / thatAfro. Artwork and music are not licensed for reuse unless stated otherwise.

Interface icons are from [Phosphor Icons](https://phosphoricons.com) (regular weight, MIT licence), inlined as SVG.
