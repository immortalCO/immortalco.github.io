(() => {
  'use strict';

  const init = () => {
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      link.rel = 'noopener noreferrer';
    });

    const videos = Array.from(document.querySelectorAll('video[data-viewport-autoplay]'));
    if (!videos.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const visibleVideos = new Set();

    videos.forEach((video) => {
      video.autoplay = false;
      video.muted = true;
      video.playsInline = true;
      if (!video.hasAttribute('preload')) video.preload = 'none';
    });

    const pause = (video) => {
      if (!video.paused) video.pause();
    };

    const play = (video) => {
      if (reducedMotion || document.visibilityState !== 'visible') return;
      video.play().catch(() => {});
    };

    if (reducedMotion) {
      videos.forEach(pause);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      videos.forEach(play);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          visibleVideos.add(video);
          play(video);
        } else {
          visibleVideos.delete(video);
          pause(video);
        }
      });
    }, { rootMargin: '180px 0px', threshold: 0.01 });

    videos.forEach((video) => observer.observe(video));

    document.addEventListener('visibilitychange', () => {
      videos.forEach((video) => {
        if (document.visibilityState === 'hidden') pause(video);
        else if (visibleVideos.has(video)) play(video);
      });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
