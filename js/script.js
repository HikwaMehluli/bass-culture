/* ==========================================================================
   Bass Culture (Amapiano Mix)
   Plain JavaScript, no libraries, no build step. Read it top to bottom:

     1. Settings        <- normally the only part you need to change
     2. Small helpers
     3. The 3D CD case   (drag to rotate, plus the four view buttons)
     4. The audio player (play/pause, seek bar, download)
     5. Repeat
     6. Volume and mute
     7. Share popover
     8. Keyboard shortcuts
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. SETTINGS
   Change these values to customise the page. Nothing else needs editing.
   -------------------------------------------------------------------------- */
const CONFIG = {

  // The song. Works as a file inside this project, a Suno song link,
  // a Dropbox share link, or any direct MP3 address.
  track: 'songs/bass-culture-amapiano-mix.mp3',

  // The sentence that gets posted when someone shares the track.
  shareText: 'Listen to Bass Culture (Amapiano Mix) by thatAfro',

  // null means "share whichever address this page is open on", so a local
  // preview shares localhost and the published site shares its real link.
  // Give it a string such as 'https://hikwamehluli.github.io/bass-culture/'
  // to always share one fixed address instead.
  shareUrl: null,

  // Where each share button sends people. The words {text} and {url}
  // are replaced with the share text and link for you.
  shareTargets: {
    x: 'https://twitter.com/intent/tweet?text={text}&url={url}',
    facebook: 'https://www.facebook.com/sharer/sharer.php?u={url}',
    whatsapp: 'https://wa.me/?text={text}%20{url}'
  },

  // How loud the song starts, from 0 (silent) to 1 (full).
  volume: 0.5
};


/* --------------------------------------------------------------------------
   2. SMALL HELPERS
   -------------------------------------------------------------------------- */

// Shortcut for document.getElementById, so the code below stays readable.
const $ = id => document.getElementById(id);

// Keep a number inside a range, e.g. clamp(120, 0, 100) is 100.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Turn 125 into "2:05". Anything we do not know yet becomes "--:--".
const formatTime = seconds => {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secondsLeft = String(whole % 60).padStart(2, '0');
  return minutes + ':' + secondsLeft;
};

// Show one short line of text under the player. Pass '' to clear it.
const showMessage = text => { $('msg').textContent = text || ''; };

// Swap the shape inside an <svg> by replacing the data of its <path>.
const setIcon = (svgId, pathData) => {
  $(svgId).firstElementChild.setAttribute('d', pathData);
};


/* --------------------------------------------------------------------------
   3. THE 3D CD CASE
   The case is tilted using two numbers: tiltX tips it up and down,
   tiltY turns it left and right.
   -------------------------------------------------------------------------- */
const caseElement = $('c');
const stageElement = $('stage');

let tiltX = -8;    // starts tipped back a little
let tiltY = -28;   // starts turned to the left
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

// Put the two numbers onto the element as a CSS transform.
function drawCase() {
  caseElement.style.transform =
    'rotateX(' + tiltX + 'deg) rotateY(' + tiltY + 'deg)';
}

stageElement.addEventListener('pointerdown', event => {
  isDragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  // The 'drag' class switches off the CSS transition so the case follows
  // your finger instantly instead of easing into place.
  caseElement.classList.add('drag');
  stageElement.setPointerCapture(event.pointerId);
});

stageElement.addEventListener('pointermove', event => {
  if (!isDragging) return;

  tiltY += (event.clientX - lastPointerX) * 0.6;
  tiltX = clamp(tiltX - (event.clientY - lastPointerY) * 0.5, -60, 60);

  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
  drawCase();
});

function stopDragging() {
  isDragging = false;
  caseElement.classList.remove('drag');
}

stageElement.addEventListener('pointerup', stopDragging);
stageElement.addEventListener('pointercancel', stopDragging);

// The Angle / Front / Spine / Back buttons. Each carries "tiltX,tiltY"
// in its data-r attribute, for example data-r="0,180".
document.querySelectorAll('nav button').forEach(button => {
  button.addEventListener('click', () => {
    const angles = button.dataset.r.split(',').map(Number);

    tiltX = angles[0];
    // Pick the nearest angle that equals the target, so the case never
    // spins the long way round to get there.
    tiltY = Math.round((tiltY - angles[1]) / 360) * 360 + angles[1];

    drawCase();
  });
});


/* --------------------------------------------------------------------------
   4. THE AUDIO PLAYER
   -------------------------------------------------------------------------- */

// CONFIG.track can be several kinds of link, so turn whatever you wrote
// into the address the <audio> element should actually stream from.
function resolveTrackUrl(track) {
  const url = new URL(track, location.href);
  const host = url.hostname;

  // A Suno page link, e.g. https://suno.com/song/abc123,
  // points at the song page. The MP3 itself lives on Suno's CDN.
  if (/(^|\.)(suno\.com|suno\.ai)$/.test(host)) {
    const songId = url.pathname.split('/').filter(Boolean).pop();
    return 'https://cdn1.suno.ai/' + songId + '.mp3';
  }

  // A Dropbox share link has to be rewritten before a browser will
  // play it inside an <audio> element.
  if (/(^|\.)dropbox\.com$/.test(host)) {
    url.hostname = 'dl.dropboxusercontent.com';
    url.searchParams.delete('dl');
    url.searchParams.set('raw', '1');
  }

  return url.href;
}

const audio = $('au');
const playButton = $('pp');
const seekBar = $('seek');
const elapsedTime = $('cur');
const totalTime = $('dur');
const downloadLink = $('dl');

// The two shapes the play/pause button can show.
const PLAY_PATH = 'M8 5v14l11-7z';
const PAUSE_PATH = 'M6 5h4v14H6zM14 5h4v14h-4z';

// True while the user is dragging the seek bar, so we show the position
// they dragged to instead of the position the song is really at.
let isScrubbing = false;

const streamUrl = resolveTrackUrl(CONFIG.track);
audio.src = streamUrl;
downloadLink.href = streamUrl;
downloadLink.setAttribute('download', '');

// Update the time readout and how much of the seek bar is filled in.
function drawProgress() {
  const length = audio.duration;
  const time = isScrubbing ? Number(seekBar.value) : audio.currentTime;

  elapsedTime.textContent = formatTime(time);

  // Before the file has loaded there is no length, so leave the bar empty.
  if (Number.isFinite(length) && length > 0) {
    seekBar.value = time;
    seekBar.style.setProperty('--p', (time / length * 100) + '%');
  } else {
    seekBar.style.setProperty('--p', '0%');
  }
}

// Show the pause shape while the song plays, the play shape while it waits.
function drawPlayButton(isPlaying) {
  setIcon('ic', isPlaying ? PAUSE_PATH : PLAY_PATH);
  playButton.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
}

playButton.addEventListener('click', () => {
  if (audio.paused) {
    // play() returns a promise that rejects if the browser blocks sound,
    // for example when the file is missing.
    audio.play().catch(() => showMessage('Could not play this track'));
  } else {
    audio.pause();
  }
});

audio.addEventListener('play', () => {
  drawPlayButton(true);
  showMessage('');
});
audio.addEventListener('pause', () => drawPlayButton(false));
audio.addEventListener('timeupdate', drawProgress);

audio.addEventListener('loadedmetadata', () => {
  seekBar.max = audio.duration;   // now we know how long the song is
  seekBar.disabled = false;
  totalTime.textContent = formatTime(audio.duration);
  drawProgress();
});

audio.addEventListener('ended', () => {
  seekBar.value = 0;
  drawProgress();
});

audio.addEventListener('error', () => {
  drawPlayButton(false);
  seekBar.disabled = true;
  showMessage('Track could not be loaded — check the MP3 file');
});

seekBar.addEventListener('input', () => {
  isScrubbing = true;
  drawProgress();
});

seekBar.addEventListener('change', () => {
  audio.currentTime = Number(seekBar.value);
  isScrubbing = false;
  drawProgress();
});


/* --------------------------------------------------------------------------
   5. REPEAT
   One on/off switch. When on, the song loops round for ever.
   -------------------------------------------------------------------------- */
const repeatButton = $('repeat');
let isRepeating = false;

function drawRepeatButton() {
  repeatButton.setAttribute('aria-pressed', String(isRepeating));
  repeatButton.setAttribute('aria-label', isRepeating ? 'Repeat on' : 'Repeat off');
}

repeatButton.addEventListener('click', () => {
  isRepeating = !isRepeating;
  audio.loop = isRepeating;   // the browser does the looping for us
  drawRepeatButton();
});

drawRepeatButton();


/* --------------------------------------------------------------------------
   6. VOLUME AND MUTE
   Clicking the speaker mutes the sound but keeps the slider where it was,
   so clicking again brings the volume straight back.
   -------------------------------------------------------------------------- */
const volumeSlider = $('vol');
const muteButton = $('mute');

// The two shapes the speaker can show: with sound waves, and with a cross.
const SOUND_PATH = 'M3 9v6h4l5 4V5L7 9zM16 8a5 5 0 0 1 0 8l-1-1.4a3.2 3.2 0 0 0 0-5.2z';
const MUTED_PATH = 'M3 9v6h4l5 4V5L7 9zm16 .4L20.4 8 19 6.6 17.6 8 16.2 6.6 14.8 8l1.4 1.4-1.4 1.4 1.4 1.4L17.6 11l1.4 1.4L20.4 11z';

let isMuted = false;
let volume = CONFIG.volume;   // remembered, so unmuting restores it

volumeSlider.value = Math.round(volume * 100);

// Mute means volume zero, but the remembered number stays untouched.
function applyVolume() {
  audio.volume = isMuted ? 0 : volume;
}

function drawMuteButton() {
  setIcon('volIcon', isMuted ? MUTED_PATH : SOUND_PATH);
  muteButton.setAttribute('aria-pressed', String(isMuted));
  muteButton.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
}

volumeSlider.addEventListener('input', () => {
  volume = Number(volumeSlider.value) / 100;
  isMuted = false;   // moving the slider always cancels the mute
  applyVolume();
  drawMuteButton();
});

muteButton.addEventListener('click', () => {
  isMuted = !isMuted;
  applyVolume();
  drawMuteButton();
});

applyVolume();
drawMuteButton();


/* --------------------------------------------------------------------------
   7. SHARE
   One button in the player, one hidden popover holding a link per network.
   -------------------------------------------------------------------------- */
const shareButton = $('shareBtn');
const shareMenu = $('shareMenu');
const copyButton = $('copy');

// null in CONFIG means "use the address this page is open on".
// split('#') drops any #section from the address before sharing it.
const shareUrl = CONFIG.shareUrl || location.href.split('#')[0];

// Fill one template from CONFIG, e.g. "...?text={text}&url={url}".
function buildShareLink(template) {
  return template
    .replace('{text}', encodeURIComponent(CONFIG.shareText))
    .replace('{url}', encodeURIComponent(shareUrl));
}

// Open or close the popover. Called with no argument it flips the state.
function toggleShareMenu(shouldOpen) {
  const open = shouldOpen === undefined ? shareMenu.hidden : shouldOpen;
  shareMenu.hidden = !open;
  shareButton.setAttribute('aria-expanded', String(open));
}

// Give every link its address once, on page load.
document.querySelectorAll('[data-share]').forEach(link => {
  link.href = buildShareLink(CONFIG.shareTargets[link.dataset.share]);
});

shareButton.addEventListener('click', () => toggleShareMenu());

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(shareUrl);
    showMessage('Link copied!');
  } catch {
    // Clipboard access can be blocked, so show the link as a backup.
    showMessage('Copy blocked — the link is ' + shareUrl);
  }
  toggleShareMenu(false);
});

// Clicking anywhere outside the share button closes the popover.
document.addEventListener('click', event => {
  const clickedInsideShare = event.target.closest('.share');
  if (!shareMenu.hidden && !clickedInsideShare) toggleShareMenu(false);
});


/* --------------------------------------------------------------------------
   8. KEYBOARD SHORTCUTS
   Space = play/pause, R = repeat, Escape = close the share popover.
   -------------------------------------------------------------------------- */
document.addEventListener('keydown', event => {
  // If the key was pressed on a button, link or slider, let the browser
  // handle it. That keeps Space working normally on focused buttons.
  const tag = event.target.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;

  if (event.key === ' ') {
    event.preventDefault();   // stop the page from scrolling down
    playButton.click();
  } else if (event.key === 'r' || event.key === 'R') {
    repeatButton.click();
  } else if (event.key === 'Escape') {
    toggleShareMenu(false);
  }
});
