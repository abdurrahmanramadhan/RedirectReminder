(() => {
  'use strict';

  // ── State ──
  let manifest = { images: [], audio: [], videos: [] };
  let currentAudio = null;
  let lastAudioPath = null;
  let lastMediaPath = null;

  // ── DOM ──
  const imgEl = document.getElementById('random-image');
  const vidEl = document.getElementById('random-video');
  const btnEl = document.getElementById('btn-understand');

  // ── Helpers ──

  /**
   * Pick a random item from an array, avoiding `excludePath` when possible.
   */
  function pickRandom(arr, excludePath) {
    if (!arr || arr.length === 0) return null;
    if (arr.length === 1) return arr[0];

    let pick;
    do {
      pick = arr[Math.floor(Math.random() * arr.length)];
    } while (pick === excludePath);
    return pick;
  }

  /**
   * Encode a relative file path so spaces, parentheses, ampersands, etc.
   * are properly percent-encoded while keeping the directory separators.
   */
  function encodePath(p) {
    return p.split('/').map(segment => encodeURIComponent(segment)).join('/');
  }

  // ── Media Logic (image or video) ──

  /**
   * Build a combined pool of images + videos, pick one randomly,
   * then show either the <img> or the <video> element.
   */
  function loadRandomMedia() {
    const images = manifest.images || [];
    const videos = manifest.videos || [];
    const allMedia = [
      ...images.map(p => ({ type: 'image', path: p })),
      ...videos.map(p => ({ type: 'video', path: p }))
    ];

    if (allMedia.length === 0) return;

    // Pick a random media item, avoid repeating the same one consecutively
    const lastPath = sessionStorage.getItem('lastMediaPath');
    let chosen;
    if (allMedia.length === 1) {
      chosen = allMedia[0];
    } else {
      do {
        chosen = allMedia[Math.floor(Math.random() * allMedia.length)];
      } while (chosen.path === lastPath);
    }
    sessionStorage.setItem('lastMediaPath', chosen.path);

    if (chosen.type === 'image') {
      showImage(chosen.path);
    } else {
      showVideo(chosen.path);
    }
  }

  function showImage(path) {
    // Hide video, show image
    vidEl.classList.add('hidden');
    vidEl.classList.remove('loaded');
    vidEl.pause();
    vidEl.removeAttribute('src');

    imgEl.classList.remove('hidden');
    imgEl.classList.remove('loaded');

    imgEl.onload = () => imgEl.classList.add('loaded');
    imgEl.onerror = () => {
      console.warn(`Failed to load image: ${path}`);
      const images = manifest.images || [];
      const fallback = pickRandom(images, path);
      if (fallback && fallback !== path) {
        imgEl.src = encodePath(fallback);
        sessionStorage.setItem('lastMediaPath', fallback);
      }
    };
    imgEl.src = encodePath(path);
  }

  function showVideo(path) {
    // Hide image, show video
    imgEl.classList.add('hidden');
    imgEl.classList.remove('loaded');
    imgEl.removeAttribute('src');

    vidEl.classList.remove('hidden');
    vidEl.classList.remove('loaded');

    vidEl.src = encodePath(path);
    vidEl.muted = true;       // Required for autoplay policy
    vidEl.playsInline = true;
    vidEl.autoplay = true;
    vidEl.loop = true;        // Loop the video continuously

    vidEl.oncanplay = () => {
      vidEl.classList.add('loaded');
    };
    vidEl.onerror = () => {
      console.warn(`Failed to load video: ${path}`);
      const videos = manifest.videos || [];
      const fallback = pickRandom(videos, path);
      if (fallback && fallback !== path) {
        showVideo(fallback);
        sessionStorage.setItem('lastMediaPath', fallback);
      }
    };

    vidEl.play().catch(e => console.warn('Video autoplay failed:', e));
  }

  // ── Audio Logic ──

  function playRandomAudio() {
    const audioFiles = manifest.audio || [];
    if (audioFiles.length === 0) return;

    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const chosen = pickRandom(audioFiles, lastAudioPath);
    lastAudioPath = chosen;

    currentAudio = new Audio(encodePath(chosen));
    currentAudio.onerror = () => {
      console.warn(`Failed to load audio: ${chosen}`);
      const fallback = pickRandom(audioFiles, chosen);
      if (fallback && fallback !== chosen) {
        lastAudioPath = fallback;
        currentAudio = new Audio(encodePath(fallback));
        currentAudio.play().catch(e => console.warn('Audio play failed:', e));
      }
    };

    // Play Once (default) — audio stops when track ends.
    // For Continuous Shuffle, uncomment the following:
    // currentAudio.addEventListener('ended', () => playRandomAudio());

    currentAudio.play().catch(e => console.warn('Audio play failed:', e));
  }

  // ── Event Listeners ──

  btnEl.addEventListener('click', () => {
    playRandomAudio();
  });

  // ── Init ──

  async function init() {
    try {
      const res = await fetch('manifest.json?t=' + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = await res.json();
      // Ensure videos array exists for older manifests
      if (!manifest.videos) manifest.videos = [];
    } catch (err) {
      console.warn('Failed to load manifest.json:', err);
      return;
    }
    loadRandomMedia();
  }

  init();
})();
