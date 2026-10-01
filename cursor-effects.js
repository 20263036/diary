(() => {
  'use strict';

  const MAX_PARTICLES = 26;
  const MOVE_DISTANCE = 44;
  const symbols = ['♡', '✦', '·'];
  const colors = ['#a99bd2', '#8fb8dc', '#efb9d0'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const activeParticles = new Set();
  let lastX = null;
  let lastY = null;

  function removeParticle(particle) {
    activeParticles.delete(particle);
    particle.remove();
  }

  function spawnParticle(x, y, isClick) {
    if (activeParticles.size >= MAX_PARTICLES) {
      removeParticle(activeParticles.values().next().value);
    }

    const particle = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const distance = isClick ? 9 + Math.random() * 24 : 12 + Math.random() * 16;
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    const lifetime = isClick ? 620 + Math.random() * 280 : 500 + Math.random() * 300;

    particle.className = 'cursor-sparkle';
    particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    particle.style.setProperty('--cursor-x', `${x + offsetX}px`);
    particle.style.setProperty('--cursor-y', `${y + offsetY}px`);
    particle.style.setProperty('--cursor-drift', `${Math.round(-7 + Math.random() * 14)}px`);
    particle.style.setProperty('--cursor-rise', `${isClick ? 18 + Math.random() * 15 : 13 + Math.random() * 13}px`);
    particle.style.setProperty('--cursor-life', `${Math.round(lifetime)}ms`);
    particle.style.color = colors[Math.floor(Math.random() * colors.length)];
    particle.style.fontSize = `${isClick ? 14 + Math.round(Math.random() * 4) : 11 + Math.round(Math.random() * 3)}px`;

    activeParticles.add(particle);
    document.body.append(particle);
    particle.addEventListener('animationend', () => removeParticle(particle), { once: true });
  }

  document.addEventListener('pointermove', event => {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    if (lastX === null) {
      lastX = event.clientX;
      lastY = event.clientY;
      return;
    }
    if (Math.hypot(event.clientX - lastX, event.clientY - lastY) < MOVE_DISTANCE) return;
    lastX = event.clientX;
    lastY = event.clientY;
    spawnParticle(event.clientX, event.clientY, false);
  }, { passive: true });

  document.addEventListener('pointerdown', event => {
    if (reducedMotion || event.pointerType !== 'mouse' || event.button !== 0) return;
    const count = 3 + Math.floor(Math.random() * 3);
    for (let index = 0; index < count; index += 1) spawnParticle(event.clientX, event.clientY, true);
  }, { passive: true });
})();
