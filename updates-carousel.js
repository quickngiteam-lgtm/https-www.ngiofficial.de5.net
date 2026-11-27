/* NGI programme carousel, native scrolling with accessible manual controls. */
(function () {
  'use strict';
  const region = document.getElementById('ngi-explore');
  if (!region) return;
  const track = region.querySelector('.ngi-explore-track');
  const cards = Array.from(track.querySelectorAll('.ngi-explore-card'));
  const controls = region.querySelector('.ngi-explore-controls');
  const footer = region.querySelector('.ngi-explore-footer');
  const previous = region.querySelector('.ngi-scroll-prev');
  const next = region.querySelector('.ngi-scroll-next');
  const toggle = region.querySelector('.ngi-scroll-toggle');
  const indicators = region.querySelector('.ngi-scroll-indicators');
  const count = region.querySelector('.ngi-scroll-count');
  if (!cards.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pauseIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M10 6v12M14 6v12"/></svg>';
  const playIcon = '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 5 12 7-12 7Z"/></svg>';
  let paused = reduced.matches;
  let hovering = false;
  let focused = false;
  let visible = !('IntersectionObserver' in window);
  let positions = [];
  let active = 0;
  let scheduled = false;

  function reflectPause() {
    toggle.innerHTML = paused ? 'Play ' + playIcon : 'Pause ' + pauseIcon;
    toggle.setAttribute('aria-label', paused ? 'Start automatic scrolling' : 'Pause automatic scrolling');
  }
  function setPaused(value) {
    paused = value;
    reflectPause();
  }
  function nearest() {
    let best = 0;
    positions.forEach(function (position, i) {
      if (Math.abs(track.scrollLeft - position) < Math.abs(track.scrollLeft - positions[best])) best = i;
    });
    return best;
  }
  function paint() {
    active = nearest();
    count.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(positions.length).padStart(2, '0');
    Array.from(indicators.children).forEach(function (button, i) {
      if (i === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }
  function go(index, manual) {
    if (positions.length < 2) return;
    if (manual) setPaused(true);
    const target = (index + positions.length) % positions.length;
    track.scrollTo({ left: positions[target], behavior: reduced.matches ? 'auto' : 'smooth' });
    active = target;
  }
  function rebuild() {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    const origin = track.getBoundingClientRect().left;
    const updated = [];
    cards.forEach(function (card) {
      const x = Math.min(max, Math.max(0, track.scrollLeft + card.getBoundingClientRect().left - origin));
      if (!updated.length || x - updated[updated.length - 1] > 2) updated.push(x);
    });
    if (!updated.length) updated.push(0);
    const countChanged = updated.length !== positions.length;
    positions = updated;
    if (countChanged) {
      indicators.replaceChildren();
      positions.forEach(function (_, i) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', 'Show card position ' + (i + 1));
        dot.addEventListener('click', function () { go(i, true); });
        indicators.appendChild(dot);
      });
    }
    controls.hidden = footer.hidden = positions.length < 2;
    paint();
  }
  previous.addEventListener('click', function () { go(nearest() - 1, true); });
  next.addEventListener('click', function () { go(nearest() + 1, true); });
  toggle.addEventListener('click', function () { setPaused(!paused); });
  track.addEventListener('pointerdown', function () { setPaused(true); }, { passive: true });
  track.addEventListener('wheel', function (event) { if (Math.abs(event.deltaX) > 0 || event.shiftKey) setPaused(true); }, { passive: true });
  track.addEventListener('keydown', function (event) {
    if (event.target !== track) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      go(nearest() + (event.key === 'ArrowLeft' ? -1 : 1), true);
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      go(event.key === 'Home' ? 0 : positions.length - 1, true);
    }
  });
  track.addEventListener('scroll', function () {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; paint(); });
  }, { passive: true });
  region.addEventListener('mouseenter', function () { hovering = true; });
  region.addEventListener('mouseleave', function () { hovering = false; });
  region.addEventListener('focusin', function () { focused = true; });
  region.addEventListener('focusout', function (event) { focused = region.contains(event.relatedTarget); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0.15 }).observe(region);
  }
  if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(track);
  else window.addEventListener('resize', rebuild);
  if (reduced.addEventListener) reduced.addEventListener('change', function (event) {
    if (event.matches) setPaused(true);
  });
  rebuild();
  reflectPause();
  window.setInterval(function () {
    if (!paused && !hovering && !focused && visible && !document.hidden) go(nearest() + 1, false);
  }, 5500);
})();
