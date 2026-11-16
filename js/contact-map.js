'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const map = document.querySelector('#map');
  const canvas = map.querySelector('[data-map-canvas]');
  const image = canvas.querySelector('img');
  const local = map.querySelector('[data-map-local]');
  const yandex = map.querySelector('[data-map-yandex]');
  const modeButtons = map.querySelectorAll('[data-map-mode]');
  const defaultScale = 1.25;
  const minScale = 1;
  const maxScale = 3.5;
  let scale = defaultScale;
  let x = 0;
  let y = 0;
  let drag = null;

  function draw() {
    const maxX = canvas.clientWidth * (scale - 1) / 2;
    const maxY = canvas.clientHeight * (scale - 1) / 2;
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    map.querySelector('[data-map-zoom="1"]').disabled = scale >= maxScale;
    map.querySelector('[data-map-zoom="-1"]').disabled = scale <= minScale;
  }

  function zoom(step) {
    scale = Math.max(minScale, Math.min(maxScale, scale + step * .25));
    draw();
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => {
    const remote = button.dataset.mapMode === 'yandex';
    if (remote && !yandex.src) yandex.src = yandex.dataset.src;
    yandex.hidden = !remote;
    local.hidden = remote;
    modeButtons.forEach((mode) => mode.setAttribute('aria-pressed', String(mode === button)));
    if (!remote) draw();
  }));

  map.querySelectorAll('[data-map-zoom]').forEach((button) =>
    button.addEventListener('click', () => zoom(Number(button.dataset.mapZoom))),
  );
  map.querySelector('[data-map-reset]').addEventListener('click', () => {
    scale = defaultScale;
    x = y = 0;
    draw();
  });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    x += event.clientX - drag.x;
    y += event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    draw();
  });
  canvas.addEventListener('lostpointercapture', () => {
    drag = null;
    canvas.classList.remove('is-dragging');
  });
  canvas.addEventListener('keydown', (event) => {
    const moves = { ArrowLeft: [30, 0], ArrowRight: [-30, 0], ArrowUp: [0, 30], ArrowDown: [0, -30] };
    if (event.key === '+' || event.key === '=') zoom(1);
    else if (event.key === '-') zoom(-1);
    else if (moves[event.key]) {
      x += moves[event.key][0];
      y += moves[event.key][1];
      draw();
    } else return;
    event.preventDefault();
  });
  window.addEventListener('resize', () => { if (!local.hidden) draw(); });
  draw();
});
