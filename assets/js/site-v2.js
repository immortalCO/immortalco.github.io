(() => {
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  // In-page links whose target sits inside a collapsed <details> (e.g. the full publication
  // list) open that disclosure first, so the browser can actually scroll to the target.
  const targetFor = (hash) => {
    if (!hash || hash.length < 2) return null;
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch (error) {
      return null; // malformed percent-encoding: treat as "no such target"
    }
  };
  const revealTarget = (hash) => {
    const target = targetFor(hash);
    if (!target) return;
    let details = target.closest('details');
    while (details) {
      details.open = true;
      details = details.parentElement ? details.parentElement.closest('details') : null;
    }
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    revealTarget(hash);
    // A second click on a link whose hash is already in the URL does not navigate; scroll by hand.
    if (window.location.hash === hash) {
      const target = targetFor(hash);
      if (target) target.scrollIntoView({ block: 'start' });
    }
  });
  window.addEventListener('hashchange', () => revealTarget(window.location.hash));
  revealTarget(window.location.hash);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  document.querySelectorAll('[data-preview-video]').forEach((video) => {
    const container = video.closest('.publication, .research-card');
    const media = video.closest('.publication-media, .research-media');
    if (!container || !media) return;

    // Keep the project link and the playback button as separate, accessible actions.
    const preview = document.createElement('div');
    preview.className = 'publication-preview';
    media.before(preview);
    preview.append(media);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'preview-toggle';
    button.innerHTML = '<svg class="preview-play-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4v16l14-8z"/></svg><svg class="preview-pause-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" hidden><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>';
    const playIcon = button.querySelector('.preview-play-icon');
    const pauseIcon = button.querySelector('.preview-pause-icon');
    const project = container.querySelector('h3')?.textContent.trim() || 'research';
    button.setAttribute('aria-label', `Play ${project} preview`);
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Play video';
    preview.append(button);

    const playbackRate = Number.parseFloat(video.dataset.playbackRate || '1');
    video.defaultPlaybackRate = playbackRate;
    video.playbackRate = playbackRate;
    video.addEventListener('loadedmetadata', () => { video.playbackRate = playbackRate; });
    let manualPlaying = false;
    let manuallyPaused = false;

    const play = () => video.play().catch(() => {
      manualPlaying = false;
      updateButton();
      button.title = 'Retry video';
      button.setAttribute('aria-label', `Retry ${project} preview`);
    });
    const reset = () => {
      video.pause();
      if (video.readyState > 0) video.currentTime = 0;
    };
    const updateButton = () => {
      playIcon.toggleAttribute('hidden', !video.paused);
      pauseIcon.toggleAttribute('hidden', video.paused);
      button.title = video.paused ? 'Play video' : 'Pause video';
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
        // Focus handed back by the closing lightbox (below) should not restart the small preview.
        if (document.documentElement.classList.contains('lightbox-open')) return;
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

  // Current-research cards: clicking a preview (or Enter / Space on it) opens the same clip
  // enlarged in a modal <dialog>. Publication previews keep linking to their project pages,
  // and browsers without dialog.showModal keep the plain inline preview.
  const researchMedia = document.querySelectorAll('.research-card .research-media');
  const canShowModal = typeof HTMLDialogElement === 'function'
    && typeof HTMLDialogElement.prototype.showModal === 'function';
  if (canShowModal && researchMedia.length) {
    const root = document.documentElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'media-lightbox';
    dialog.setAttribute('aria-labelledby', 'media-lightbox-title');
    dialog.innerHTML = '<div class="media-lightbox-bar"><button type="button" class="media-lightbox-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>'
      + '<video class="media-lightbox-video" controls autoplay muted loop playsinline></video>'
      + '<p class="media-lightbox-caption"><span class="media-lightbox-title" id="media-lightbox-title"></span><span class="media-lightbox-credit"></span></p>';
    document.body.append(dialog);
    const lightboxVideo = dialog.querySelector('.media-lightbox-video');
    const lightboxTitle = dialog.querySelector('.media-lightbox-title');
    const lightboxCredit = dialog.querySelector('.media-lightbox-credit');
    let trigger = null;
    let pressedOnBackdrop = false;

    const openLightbox = (media) => {
      const video = media.querySelector('video');
      const card = media.closest('.research-card');
      const source = video.querySelector('source');
      const src = (source ? source.getAttribute('src') : video.getAttribute('src')) || '';
      const credit = card.querySelector('.media-credit')?.textContent.trim() || '';
      const autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      video.pause();
      trigger = media;
      lightboxTitle.textContent = card.querySelector('h3')?.textContent.trim() || '';
      lightboxCredit.textContent = credit;
      lightboxCredit.hidden = !credit;
      lightboxVideo.setAttribute('aria-label', video.getAttribute('aria-label') || lightboxTitle.textContent);
      const poster = video.getAttribute('poster');
      if (poster) lightboxVideo.setAttribute('poster', poster);
      else lightboxVideo.removeAttribute('poster');
      // Reduced-motion users get the enlarged clip paused on its poster and press play themselves.
      lightboxVideo.autoplay = autoplay;
      lightboxVideo.muted = true;
      lightboxVideo.src = src.replace(/#.*$/, ''); // drop the inline poster-frame hint (#t=0.1)

      root.classList.add('lightbox-open');
      dialog.showModal();
      if (autoplay) lightboxVideo.play().catch(() => {});
    };

    // Cleanup after any close. Chrome delivers the 'close' event only at the next animation
    // frame, so our own close paths run it synchronously; the event covers Esc and stays a
    // no-op when it arrives late or after the lightbox was opened again.
    const finishClose = () => {
      if (dialog.open || !trigger) return;
      lightboxVideo.pause();
      lightboxVideo.removeAttribute('src');
      lightboxVideo.load(); // abort the download
      // Return focus while html.lightbox-open is still set, so the card's focus-to-play
      // preview stays paused (browsers that restore focus in close() already did this).
      if (document.activeElement !== trigger) trigger.focus({ preventScroll: true });
      root.classList.remove('lightbox-open');
      trigger = null;
    };
    const closeLightbox = () => {
      dialog.close();
      finishClose();
    };
    dialog.addEventListener('close', finishClose);
    dialog.querySelector('.media-lightbox-close').addEventListener('click', closeLightbox);
    // Close on a click on the backdrop itself; a drag that starts on the video controls and
    // ends outside them must not count.
    dialog.addEventListener('pointerdown', (event) => { pressedOnBackdrop = event.target === dialog; });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog && pressedOnBackdrop) closeLightbox();
      pressedOnBackdrop = false;
    });

    researchMedia.forEach((media) => {
      if (!media.querySelector('video')) return;
      const title = media.closest('.research-card')?.querySelector('h3')?.textContent.trim() || 'research';
      media.setAttribute('role', 'button');
      media.setAttribute('tabindex', '0');
      media.setAttribute('aria-haspopup', 'dialog');
      media.setAttribute('aria-label', `Enlarge ${title} preview`);
      media.addEventListener('click', () => openLightbox(media));
      // Same keys as a native button: Enter on keydown, Space on keyup. Cancelling keydown
      // also stops the page from scrolling on Space and the Enter keypress from reaching the
      // dialog's close button once focus has moved there.
      media.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        if (event.key === 'Enter') openLightbox(media);
      });
      media.addEventListener('keyup', (event) => {
        if (event.key === ' ') openLightbox(media);
      });
    });
  }
})();
