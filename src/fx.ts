export function burst(parent: HTMLElement, x: number, y: number, n = 16): void {
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'spark';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 40 + Math.random() * 80;
    el.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    el.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    el.style.background = ['#ffd24a', '#ff8fb8', '#7ecbff', '#fff', '#b48bff'][i % 5];
    parent.appendChild(el);
    window.setTimeout(() => el.remove(), 800);
  }
}

export function burstAt(el: HTMLElement, n = 16): void {
  const stage = el.closest('.stage');
  if (!(stage instanceof HTMLElement)) return;
  const a = el.getBoundingClientRect();
  const b = stage.getBoundingClientRect();
  burst(stage, a.left - b.left + a.width / 2, a.top - b.top + a.height / 2, n);
}
