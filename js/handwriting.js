// 터치펜(스타일러스)·손가락으로 직접 쓰는 손글씨 캔버스 (Pointer Events 기반)

function createHandwritingPad(container, opts) {
  const cssWidth = (opts && opts.width) || container.clientWidth || 320;
  const cssHeight = (opts && opts.height) || 150;
  const dpr = window.devicePixelRatio || 1;

  const wrap = el('div', 'handwriting-pad');
  const canvas = document.createElement('canvas');
  canvas.className = 'handwriting-canvas';
  canvas.style.width = '100%';
  canvas.style.height = cssHeight + 'px';
  canvas.style.touchAction = 'none';
  wrap.appendChild(canvas);
  const baseline = el('div', 'pad-baseline');
  wrap.appendChild(baseline);
  container.appendChild(wrap);

  function sizeCanvas() {
    const w = wrap.clientWidth || cssWidth;
    canvas.width = w * dpr;
    canvas.height = cssHeight * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#24284A';
    return ctx;
  }

  let ctx = sizeCanvas();
  let drawing = false;
  let lastX = 0, lastY = 0;
  let hasStrokes = false;

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', e => {
    drawing = true;
    hasStrokes = true;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    lastX = p.x; lastY = p.y;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x; lastY = p.y;
    e.preventDefault();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
    canvas.addEventListener(evt, () => { drawing = false; })
  );

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes = false;
  }

  return { clear, hasStrokes: () => hasStrokes };
}
