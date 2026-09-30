/* ==========================================================================
   Bass Culture (Amapiano Mix) — Service Worker
   --------------------------------------------------------------------------
   This file runs in the background, away from the page. It does two jobs:

     1. Keeps a copy of the page (HTML, CSS, JS and the cover image) so the
        site still opens with no connection.
     2. Downloads the song ONCE. The audio is streamed to the player and a
        copy is stored at the same time, instead of downloading it twice.

   Rules that matter:
     - Bump CACHE from v1 to v2 whenever you publish changes. Old caches are
       deleted automatically on the next visit. Without this, visitors would
       keep seeing the version they first loaded, for ever.
     - Service Workers do not run from a file on disk (file://). They need
       https, which is what GitHub Pages gives you, or a local web server.
   ========================================================================== */

/* The version number here, plus the files we always want available offline.
   './' paths are relative on purpose, so the site works in any subfolder. */
const CACHE = 'bass-culture-v2';

const PRECACHE = [
  './',
  './index.html',
  './css/styles.css',
  './js/script.js',
  './img/bass-culture-amapiano-mix-cover-art.jpg'
];

/* Keep a number inside a range, e.g. clamp(120, 0, 100) is 100. */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));


/* --------------------------------------------------------------------------
   INSTALL
   Download the shell files once, then take over straight away so the very
   first visit is already cached. Waiting for the user to close the tab would
   mean the first page view is never saved.
   -------------------------------------------------------------------------- */
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE);
    await self.skipWaiting();
  })());
});


/* --------------------------------------------------------------------------
   ACTIVATE
   Throw away every cache that is not the current version, so old copies of
   the site cannot pile up or be served by mistake.
   -------------------------------------------------------------------------- */
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const existing = await caches.keys();
    const outdated = existing.filter(name => name !== CACHE);

    await Promise.all(outdated.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});


/* --------------------------------------------------------------------------
   FETCH
   Everything the page asks for passes through here first.
   -------------------------------------------------------------------------- */
self.addEventListener('fetch', event => {
  const request = event.request;

  // Only reads are cached. Writing to the server is none of our business.
  if (request.method !== 'GET') return;

  // Only handle our own files. A Suno or Dropbox link in CONFIG.track is
  // still fetched from that site, not from us.
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(respond(request));
});


/* Serve one request: cache first, network second, cache again on the way. */
async function respond(request) {
  const cache = await caches.open(CACHE);

  // A browser seeks by asking for a slice such as "bytes 1000-2000".
  if (request.headers.has('range')) {
    return respondWithRange(cache, request);
  }

  // Opening the site asks for a folder, not a file name. Answer with the
  // saved index.html so the page still loads with no connection.
  if (request.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }

  const saved = await cache.match(request, { ignoreSearch: true });
  if (saved) return saved;

  return fetchAndSave(cache, request);
}


/* --------------------------------------------------------------------------
   THE SINGLE DOWNLOAD
   This is the part that saves the visitor from downloading 5.4 MB twice.

   fetch() is called once. The response goes back to the player straight away
   so the song starts playing, and response.clone() makes a second copy of
   the same bytes that we quietly store for next time.

   The two important details:
     - We do NOT await the cache.put(). Waiting would hold the music back
       until all 5.4 MB had arrived.
     - We only tell the page "saved" once the write has truly finished. If the
       visitor closes the tab early, the incomplete copy is thrown away by the
       browser, and we never claim it is ready.
   -------------------------------------------------------------------------- */
async function fetchAndSave(cache, request) {
  let response;

  try {
    response = await fetch(request);
  } catch (error) {
    // No connection. A saved copy is better than a broken player.
    const saved = await cache.match(request, { ignoreSearch: true });
    if (saved) return saved;
    throw error;
  }

  // Only store ordinary, complete, successful answers. Storing an error page
  // or a half-finished file would break the site on the next visit.
  if (response.status === 200 && response.type === 'basic') {
    cache.put(request, response.clone()).then(
      () => tellPage({ type: 'saved', url: request.url }),
      () => {}   // Out of storage space, or the tab closed early. Not fatal.
    );
  }

  return response;
}


/* --------------------------------------------------------------------------
   SEEKING
   An <audio> element asks for small slices of the song when you drag the
   seek bar. We rebuild the "partial reply" (status 206) from the full copy
   we already have, so seeking still works with no connection.
   -------------------------------------------------------------------------- */
async function respondWithRange(cache, request) {
  const saved = await cache.match(request, { ignoreSearch: true });

  // Nothing saved yet, so let the network answer the slice.
  if (!saved) return fetch(request);

  const wanted = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range'));
  if (!wanted) return saved;

  const whole = await saved.arrayBuffer();
  const size = whole.byteLength;
  if (size === 0) return saved;

  // "bytes -500" means the last 500 bytes, so it has a different meaning
  // from "bytes 500-", which means "from 500 to the end".
  const start = wanted[1] === ''
    ? size - Number(wanted[2])
    : Number(wanted[1]);

  // Asking to start past the end of the song cannot be answered. Real
  // servers reply 416 here, so we do the same rather than inventing a
  // one-byte reply that would fool the player into thinking the file is tiny.
  if (start >= size) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${size}` }
    });
  }

  const end = (wanted[2] === '' || wanted[1] === '')
    ? size - 1
    : Number(wanted[2]);

  const from = clamp(start, 0, size - 1);
  const to = clamp(end, from, size - 1);
  const slice = whole.slice(from, to + 1);

  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': saved.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Length': String(slice.byteLength),
      'Content-Range': `bytes ${from}-${to}/${size}`,
      'Accept-Ranges': 'bytes'
    }
  });
}


/* Send a note to every open tab, for example "the song is now saved". */
async function tellPage(message) {
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  windows.forEach(window => window.postMessage(message));
}
