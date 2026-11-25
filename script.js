(() => {
  'use strict';

  // ── State ──
  let manifest = { images: [], audio: [], videos: [] };
  let currentAudio = null;
  let lastAudioPath = null;
  const MAX_MEDIA_RETRIES = 5;

  // ── DOM ──
  const imgEl = document.getElementById('random-image');
  const vidEl = document.getElementById('random-video');
  const btnEl = document.getElementById('btn-understand');
  const playOverlay = document.getElementById('play-overlay');

  // ── Helpers ──

  function pickRandom(arr, excludePath) {
    if (!arr || arr.length === 0) return null;
    if (arr.length === 1) return arr[0];
    let pick;
    do {
      pick = arr[Math.floor(Math.random() * arr.length)];
    } while (pick === excludePath);
    return pick;
  }

  function encodePath(p) {
    return p.split('/').map(segment => encodeURIComponent(segment)).join('/');
  }

  // ── Media Logic ──

  function loadRandomMedia() {
    const images = manifest.images || [];
    const videos = manifest.videos || [];
    const allMedia = [
      ...images.map(p => ({ type: 'image', path: p })),
      ...videos.map(p => ({ type: 'video', path: p }))
    ];

    if (allMedia.length === 0) {
      btnEl.classList.remove('floating');
      btnEl.classList.add('loaded');
      return;
    }

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

  function showImage(path, retries = 0) {
    // Hide video and play overlay completely
    vidEl.onerror = null;
    vidEl.onloadeddata = null;
    vidEl.onloadedmetadata = null;
    vidEl.classList.add('hidden');
    vidEl.classList.remove('loaded');
    vidEl.pause();
    vidEl.removeAttribute('src');
    vidEl.load();
    playOverlay.classList.add('hidden');

    // Float button over bottom of image
    btnEl.classList.add('floating');
    btnEl.classList.remove('loaded');

    // Show image
    imgEl.classList.remove('hidden');
    imgEl.classList.remove('loaded');

    imgEl.onload = () => {
      imgEl.classList.add('loaded');
      btnEl.classList.add('loaded');
    };
    imgEl.onerror = () => {
      console.warn('Failed to load image:', path);
      const images = manifest.images || [];
      if (retries < MAX_MEDIA_RETRIES) {
        const fallback = pickRandom(images, path);
        if (fallback && fallback !== path) {
          sessionStorage.setItem('lastMediaPath', fallback);
          showImage(fallback, retries + 1);
          return;
        }
      }
      btnEl.classList.remove('floating');
      btnEl.classList.add('loaded');
    };
    imgEl.src = encodePath(path);
  }

  function showVideo(path, retries = 0) {
    // Hide image completely
    imgEl.onload = null;
    imgEl.onerror = null;
    imgEl.classList.add('hidden');
    imgEl.classList.remove('loaded');
    imgEl.removeAttribute('src');

    // Keep button below video (not floating)
    btnEl.classList.remove('floating');
    btnEl.classList.remove('loaded');

    // Show video element (paused — user must click to play)
    vidEl.classList.remove('hidden');
    vidEl.classList.remove('loaded');
    vidEl.loop = true;
    vidEl.muted = false;
    vidEl.autoplay = false;
    vidEl.removeAttribute('autoplay');
    vidEl.playsInline = true;
    const revealVideo = () => {
      vidEl.classList.add('loaded');
      if (vidEl.paused) {
        playOverlay.classList.remove('hidden');
      }
      btnEl.classList.add('loaded');
    };

    vidEl.onloadeddata = revealVideo;
    vidEl.onloadedmetadata = revealVideo;
    vidEl.onerror = () => {
      console.warn('Failed to load video:', path);
      playOverlay.classList.add('hidden');
      const videos = manifest.videos || [];
      if (retries < MAX_MEDIA_RETRIES) {
        const fallback = pickRandom(videos, path);
        if (fallback && fallback !== path) {
          sessionStorage.setItem('lastMediaPath', fallback);
          showVideo(fallback, retries + 1);
          return;
        }
      }
      btnEl.classList.add('loaded');
    };

    vidEl.src = encodePath(path);
    vidEl.load();
    vidEl.pause();
  }

  // ── Audio Logic ──

  function playRandomAudio() {
    const audioFiles = manifest.audio || [];
    if (audioFiles.length === 0) return;

    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    const chosen = pickRandom(audioFiles, lastAudioPath);
    lastAudioPath = chosen;

    currentAudio = new Audio(encodePath(chosen));
    currentAudio.onerror = () => {
      console.warn('Failed to load audio:', chosen);
      const fallback = pickRandom(audioFiles, chosen);
      if (fallback && fallback !== chosen) {
        lastAudioPath = fallback;
        currentAudio = new Audio(encodePath(fallback));
        currentAudio.play().catch(e => console.warn('Audio play failed:', e));
      }
    };

    currentAudio.play().catch(e => console.warn('Audio play failed:', e));
  }

  // ── Event Listeners ──

  // "I Understand" button → play random audio
  btnEl.addEventListener('click', () => {
    playRandomAudio();
  });

  // Play overlay click → start video
  playOverlay.addEventListener('click', (e) => {
    e.stopPropagation();
    vidEl.play().then(() => {
      playOverlay.classList.add('hidden');
    }).catch(e => console.warn('Video play failed:', e));
  });

  // Click on video → toggle play/pause
  vidEl.addEventListener('click', () => {
    if (vidEl.paused) {
      vidEl.play().then(() => {
        playOverlay.classList.add('hidden');
      }).catch(e => console.warn('Video play failed:', e));
    } else {
      vidEl.pause();
      playOverlay.classList.remove('hidden');
    }
  });

  // ── Init ──

  async function init() {
    try {
      const res = await fetch('manifest.json?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      manifest = await res.json();
      if (!manifest.videos) manifest.videos = [];
    } catch (err) {
      console.warn('Failed to load manifest.json:', err);
      btnEl.classList.remove('floating');
      btnEl.classList.add('loaded');
      return;
    }
    loadRandomMedia();
  }

  init();
})();
