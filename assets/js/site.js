(() => {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('[data-preview-video]').forEach((video) => {
    const container = video.closest('.publication');
    const media = video.closest('.publication-media');
    if (!container || !media) return;

    // Keep the project link and the playback button as separate, accessible actions.
    const preview = document.createElement('div');
    preview.className = 'publication-preview';
    media.before(preview);
    preview.append(media);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preview-toggle';
    button.textContent = 'Play video';
    const project = container.querySelector('h3')?.textContent.trim() || 'research';
    button.setAttribute('aria-label', `Play ${project} preview`);
    button.setAttribute('aria-pressed', 'false');
    preview.append(button);

    const playbackRate = Number.parseFloat(video.dataset.playbackRate || '1');
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
    video.addEventListener('loadedmetadata', () => { video.playbackRate = playbackRate; });
    let manualPlaying = false;
    let manuallyPaused = false;

    const play = () => video.play().catch(() => {
      manualPlaying = false;
      button.textContent = 'Retry video';
    });
    const reset = () => {
      video.pause();
      if (video.readyState > 0) video.currentTime = 0;
    };
    const updateButton = () => {
      button.textContent = video.paused ? 'Play video' : 'Pause video';
      button.setAttribute('aria-pressed', String(!video.paused));
      button.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'} ${project} preview`);
    };
    video.addEventListener('play', updateButton);
    video.addEventListener('pause', updateButton);

    button.addEventListener('click', () => {
      if (video.paused) {
        manualPlaying = true;
        manuallyPaused = false;
        play();
      } else {
        manualPlaying = false;
        manuallyPaused = true;
        video.pause();
      }
    });

    // Reduced-motion and touch users opt in with the same explicit play button.
    if (canHover && !reduceMotion) {
      container.addEventListener('mouseenter', () => { if (!manuallyPaused) play(); });
      container.addEventListener('mouseleave', () => {
        manuallyPaused = false;
        if (!manualPlaying) reset();
      });
      container.addEventListener('focusin', (event) => {
        if (event.target !== button && !manuallyPaused) play();
      });
      container.addEventListener('focusout', (event) => {
        if (!container.contains(event.relatedTarget) && !manualPlaying) reset();
      });
    }

    const stop = () => { manualPlaying = false; manuallyPaused = false; reset(); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) stop(); }).observe(container);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  });
})();
