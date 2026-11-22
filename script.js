(() => {
  'use strict';

  // ── State ──
  let manifest = { images: [], audio: [] };
  let currentAudio = null;
  let lastAudioPath = null;

  // ── DOM ──
  const imgEl = document.getElementById('random-image');
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

  // ── Image Logic ──

  function loadRandomImage() {
    const images = manifest.images;
    if (!images || images.length === 0) return;

    const lastImage = sessionStorage.getItem('lastImagePath');
    const chosen = pickRandom(images, lastImage);
    sessionStorage.setItem('lastImagePath', chosen);

    imgEl.classList.remove('loaded');
    imgEl.onload = () => imgEl.classList.add('loaded');
    imgEl.onerror = () => {
      console.warn(`Failed to load image: ${chosen}`);
      // Try another image
      const fallback = pickRandom(images, chosen);
      if (fallback && fallback !== chosen) {
        imgEl.src = fallback;
        sessionStorage.setItem('lastImagePath', fallback);
      }
    };
    imgEl.src = chosen;
  }

  // ── Audio Logic ──

  function playRandomAudio() {
    const audioFiles = manifest.audio;
    if (!audioFiles || audioFiles.length === 0) return;

    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const chosen = pickRandom(audioFiles, lastAudioPath);
    lastAudioPath = chosen;

    currentAudio = new Audio(chosen);
    currentAudio.onerror = () => {
      console.warn(`Failed to load audio: ${chosen}`);
      // Try another audio file
      const fallback = pickRandom(audioFiles, chosen);
      if (fallback && fallback !== chosen) {
        lastAudioPath = fallback;
        currentAudio = new Audio(fallback);
        currentAudio.play().catch((e) => console.warn('Audio play failed:', e));
      }
    };

    // Play Once (default) — audio stops when track ends.
    // For Continuous Shuffle, uncomment the following:
    // currentAudio.addEventListener('ended', () => playRandomAudio());

    currentAudio.play().catch((e) => console.warn('Audio play failed:', e));
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
    } catch (err) {
      console.warn('Failed to load manifest.json:', err);
      return;
    }
    loadRandomImage();
  }

  init();
})();

