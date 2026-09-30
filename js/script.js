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

// A browser starts its own image drag when you press on a picture, which
// would fight with the rotation. Block it so the case always rotates.
stageElement.addEventListener('dragstart', event => event.preventDefault());

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
const PLAY_PATH = 'M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z';
const PAUSE_PATH = 'M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z';

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
const SOUND_PATH = 'M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm54-106.08a40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.58,24,24,0,0,0,0-31.72,8,8,0,0,1,12-10.58ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z';
const MUTED_PATH = 'M53.92,34.62A8,8,0,1,0,42.08,45.38L73.55,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V175.09l42.08,46.29a8,8,0,1,0,11.84-10.76ZM32,96H72v64H32ZM144,207.64,88,164.09V95.89l56,61.6Zm42-63.77a24,24,0,0,0,0-31.72,8,8,0,1,1,12-10.57,40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.59Zm-80.16-76a8,8,0,0,1,1.4-11.23l39.85-31A8,8,0,0,1,160,32v74.83a8,8,0,0,1-16,0V48.36l-26.94,21A8,8,0,0,1,105.84,67.91ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z';

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
