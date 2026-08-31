(() => {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (reduceMotion || !canHover) return;

  document.querySelectorAll('[data-preview-video]').forEach((video) => {
    const container = video.closest('.publication');
    const playbackRate = Number.parseFloat(video.dataset.playbackRate || '1');
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;

    const play = () => video.play().catch(() => {});
    const reset = () => {
      video.pause();
      video.currentTime = 0;
    };

    container?.addEventListener('mouseenter', play);
    container?.addEventListener('mouseleave', reset);
    container?.addEventListener('focusin', play);
    container?.addEventListener('focusout', (event) => {
      if (!container.contains(event.relatedTarget)) reset();
    });
  });
})();
