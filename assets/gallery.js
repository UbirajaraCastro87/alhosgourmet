(() => {
  const gallery = document.querySelector('[data-gallery]');
  if (!(gallery instanceof HTMLElement)) return;

  const slides = Array.from(gallery.querySelectorAll('.gallery-slide'));
  const previousButton = gallery.querySelector('[data-gallery-previous]');
  const nextButton = gallery.querySelector('[data-gallery-next]');
  const toggleButton = gallery.querySelector('[data-gallery-toggle]');
  const indicators = Array.from(gallery.querySelectorAll('[data-gallery-go]'));
  const controls = gallery.querySelector('.gallery-controls');

  if (slides.length < 2) {
    if (controls instanceof HTMLElement) controls.hidden = true;
    return;
  }
  if (
    !(previousButton instanceof HTMLButtonElement) ||
    !(nextButton instanceof HTMLButtonElement) ||
    !(toggleButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  let currentIndex = Math.max(slides.findIndex((slide) => !slide.hidden), 0);
  let autoplayEnabled = true;
  let timer = 0;

  const showSlide = (index) => {
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== currentIndex;
    });
    indicators.forEach((indicator, indicatorIndex) => {
      if (indicatorIndex === currentIndex) {
        indicator.setAttribute('aria-current', 'true');
      } else {
        indicator.removeAttribute('aria-current');
      }
    });
  };
  const showNext = () => showSlide(currentIndex + 1);
  const stopAutoplay = () => {
    window.clearInterval(timer);
    timer = 0;
  };
  const startAutoplay = () => {
    if (
      !autoplayEnabled ||
      timer !== 0 ||
      document.hidden
    ) {
      return;
    }
    timer = window.setInterval(showNext, 5000);
  };
  const restartAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };
  const updateToggleButton = () => {
    const action = autoplayEnabled ? 'Pausar' : 'Reproduzir';
    toggleButton.textContent = action;
    toggleButton.setAttribute('aria-label', `${action} apresentação`);
  };

  updateToggleButton();
  previousButton.addEventListener('click', () => {
    showSlide(currentIndex - 1);
    restartAutoplay();
  });
  nextButton.addEventListener('click', () => {
    showNext();
    restartAutoplay();
  });
  indicators.forEach((indicator) => {
    indicator.addEventListener('click', () => {
      const index = Number(indicator.dataset.galleryGo);
      if (Number.isInteger(index)) {
        showSlide(index);
        restartAutoplay();
      }
    });
  });
  toggleButton.addEventListener('click', () => {
    autoplayEnabled = !autoplayEnabled;
    updateToggleButton();
    if (autoplayEnabled) startAutoplay();
    else stopAutoplay();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  showSlide(currentIndex);
  startAutoplay();
})();
