/* ==========================================================================
   SIM-KIT — Motor genérico de simuladores Canvas (NO editar por guía)
   Proporciona: SimBase (HiDPI, puntero unificado, bucle rAF con dt fijo,
   play/pausa/reinicio, paleta temática, telemetría, mapeo mundo↔pantalla),
   utilidades de dibujo (flechas, ejes, rejillas, resortes, texto) y el
   enlazado DECLARATIVO de controles mediante atributos data-*.

   Uso mínimo en simulations.js:
     class MiSim extends SimBase {
       setup()            { this.params = { m: 2, k: 50 }; this.reset(); }
       reset()            { this.x = 1; this.v = 0; this.t = 0; this.draw(); }
       update(dt)         { ... integra la física con dt (s) ... }
       render(ctx, w, h)  { ... dibuja ... }
       telemetry()        { return `x = ${this.x.toFixed(2)} m`; }
     }
     SimKit.register('MiSim', MiSim);

   HTML:
     <canvas data-sim="MiSim" id="miSimCanvas"></canvas>
     <input type="range" data-sim-target="miSimCanvas" data-param="k"
            data-unit="N/m" data-decimals="0" min="10" max="200" value="50">
     <button data-sim-target="miSimCanvas" data-action="toggle">...</button>
   ========================================================================== */

(function (global) {
  'use strict';

  /* ------------------------------------------------------------------------
     Paleta: lee variables CSS --sim-* del contenedor (cambian con el tema y
     con el modo impresión). Valores por defecto = laboratorio oscuro.
     ------------------------------------------------------------------------ */
  const DEFAULT_PALETTE = {
    bg: '#090d16', panel: '#0f172a', grid: 'rgba(148,163,184,0.12)',
    axis: '#64748b', text: '#e2e8f0', muted: '#94a3b8', ground: '#1e293b',
    primary: '#38bdf8', secondary: '#a78bfa', accent: '#facc15',
    good: '#10b981', bad: '#ef4444', warn: '#f59e0b',
    k: '#60a5fa', u: '#34d399', th: '#fb7185', total: '#fbbf24'
  };

  function readPalette(el) {
    const cs = getComputedStyle(el);
    const p = {};
    for (const key of Object.keys(DEFAULT_PALETTE)) {
      const v = cs.getPropertyValue(`--sim-${key}`).trim();
      p[key] = v || DEFAULT_PALETTE[key];
    }
    return p;
  }

  /* ------------------------------------------------------------------------
     Utilidades de dibujo reutilizables
     ------------------------------------------------------------------------ */
  const Draw = {
    arrow(ctx, x1, y1, x2, y2, color, width = 3, head = 9) {
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.5) return;
      const h = Math.min(head, len * 0.6);
      ctx.save();
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1);
      ctx.lineTo(x2 - h * 0.6 * Math.cos(ang), y2 - h * 0.6 * Math.sin(ang));
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - h * Math.cos(ang - Math.PI / 7), y2 - h * Math.sin(ang - Math.PI / 7));
      ctx.lineTo(x2 - h * Math.cos(ang + Math.PI / 7), y2 - h * Math.sin(ang + Math.PI / 7));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    },

    label(ctx, text, x, y, { color = '#e2e8f0', size = 12, weight = '600', align = 'left',
      baseline = 'alphabetic', font = 'Inter, system-ui, sans-serif', bg = null, pad = 3 } = {}) {
      ctx.save();
      ctx.font = `${weight} ${size}px ${font}`;
      ctx.textAlign = align; ctx.textBaseline = baseline;
      if (bg) {
        const m = ctx.measureText(text);
        let bx = x - pad;
        if (align === 'center') bx = x - m.width / 2 - pad;
        if (align === 'right') bx = x - m.width - pad;
        ctx.fillStyle = bg;
        ctx.fillRect(bx, y - size - pad + 2, m.width + pad * 2, size + pad * 2);
      }
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    },

    spring(ctx, x1, y1, x2, y2, coils = 12, amp = 10, color = '#94a3b8', width = 2) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      const lead = Math.min(14, len * 0.1);
      ctx.save();
      ctx.translate(x1, y1); ctx.rotate(ang);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(lead, 0);
      const body = len - 2 * lead;
      for (let i = 0; i <= coils * 2; i++) {
        const px = lead + (body * i) / (coils * 2);
        const py = i === 0 || i === coils * 2 ? 0 : (i % 2 ? -amp : amp);
        ctx.lineTo(px, py);
      }
      ctx.lineTo(len, 0); ctx.stroke();
      ctx.restore();
    },

    ground(ctx, y, w, palette, hatch = true) {
      ctx.save();
      ctx.fillStyle = palette.ground; ctx.fillRect(0, y, w, 400);
      ctx.strokeStyle = palette.axis; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      if (hatch) {
        ctx.lineWidth = 1;
        for (let x = 6; x < w; x += 16) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 8); ctx.stroke();
        }
      }
      ctx.restore();
    },

    roundRect(ctx, x, y, w, h, r, fill, stroke, lw = 2) {
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.restore();
    },

    dashedLine(ctx, x1, y1, x2, y2, color, width = 1, dash = [5, 4]) {
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    }
  };

  /* ------------------------------------------------------------------------
     Viewport: mapea coordenadas físicas (metros, unidades de la gráfica)
     a píxeles. y física crece hacia arriba.
     ------------------------------------------------------------------------ */
  class Viewport {
    constructor(sim, { xmin = 0, xmax = 10, ymin = 0, ymax = 5, pad = [30, 20, 34, 44] } = {}) {
      this.sim = sim; this.pad = pad; // [arriba, derecha, abajo, izquierda]
      this.set(xmin, xmax, ymin, ymax);
    }
    set(xmin, xmax, ymin, ymax) { Object.assign(this, { xmin, xmax, ymin, ymax }); }
    get left() { return this.pad[3]; }
    get right() { return this.sim.width - this.pad[1]; }
    get top() { return this.pad[0]; }
    get bottom() { return this.sim.height - this.pad[2]; }
    X(x) { return this.left + ((x - this.xmin) / (this.xmax - this.xmin)) * (this.right - this.left); }
    Y(y) { return this.bottom - ((y - this.ymin) / (this.ymax - this.ymin)) * (this.bottom - this.top); }
    invX(px) { return this.xmin + ((px - this.left) / (this.right - this.left)) * (this.xmax - this.xmin); }
    invY(py) { return this.ymin + ((this.bottom - py) / (this.bottom - this.top)) * (this.ymax - this.ymin); }

    /* Ejes cartesianos con marcas y etiquetas. */
    axes(ctx, { xLabel = 'x', yLabel = 'y', xStep = null, yStep = null, grid = true, decimals = null } = {}) {
      const p = this.sim.palette;
      const niceStep = (span) => {
        const raw = span / 6; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const n = raw / mag; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
      };
      const xs = xStep || niceStep(this.xmax - this.xmin);
      const ys = yStep || niceStep(this.ymax - this.ymin);
      const fmt = (v, s) => {
        const d = decimals ?? Math.max(0, -Math.floor(Math.log10(s)));
        return Math.abs(v) < 1e-9 ? '0' : v.toFixed(d);
      };
      ctx.save();
      ctx.font = '10px "Fira Code", monospace';
      if (grid) {
        ctx.strokeStyle = p.grid; ctx.lineWidth = 1;
        for (let x = Math.ceil(this.xmin / xs) * xs; x <= this.xmax + 1e-9; x += xs) {
          ctx.beginPath(); ctx.moveTo(this.X(x), this.top); ctx.lineTo(this.X(x), this.bottom); ctx.stroke();
        }
        for (let y = Math.ceil(this.ymin / ys) * ys; y <= this.ymax + 1e-9; y += ys) {
          ctx.beginPath(); ctx.moveTo(this.left, this.Y(y)); ctx.lineTo(this.right, this.Y(y)); ctx.stroke();
        }
      }
      const x0 = this.X(Math.min(Math.max(0, this.xmin), this.xmax));
      const y0 = this.Y(Math.min(Math.max(0, this.ymin), this.ymax));
      ctx.strokeStyle = p.axis; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(this.left, y0); ctx.lineTo(this.right, y0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x0, this.bottom); ctx.lineTo(x0, this.top); ctx.stroke();
      ctx.fillStyle = p.muted;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let x = Math.ceil(this.xmin / xs) * xs; x <= this.xmax + 1e-9; x += xs) {
        ctx.fillText(fmt(x, xs), this.X(x), y0 + 4);
      }
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let y = Math.ceil(this.ymin / ys) * ys; y <= this.ymax + 1e-9; y += ys) {
        if (Math.abs(y) > 1e-9) ctx.fillText(fmt(y, ys), x0 - 5, this.Y(y));
      }
      ctx.fillStyle = p.text; ctx.font = '600 11px Inter, sans-serif';
      ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
      ctx.fillText(xLabel, this.right, y0 - 4);
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(yLabel, x0 + 6, this.top - 2);
      ctx.restore();
    }

    /* Traza y = f(x) en el rango visible. */
    plot(ctx, f, { color = '#38bdf8', width = 2.5, samples = 400, from = this.xmin, to = this.xmax, dash = null } = {}) {
      ctx.save();
      ctx.beginPath(); ctx.rect(this.left, this.top, this.right - this.left, this.bottom - this.top); ctx.clip();
      ctx.strokeStyle = color; ctx.lineWidth = width; if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      let pen = false;
      const span = this.ymax - this.ymin;
      for (let i = 0; i <= samples; i++) {
        const x = from + ((to - from) * i) / samples;
        const y = f(x);
        if (!Number.isFinite(y) || y > this.ymax + 20 * span || y < this.ymin - 20 * span) { pen = false; continue; }
        const px = this.X(x), py = this.Y(y);
        if (!pen) { ctx.moveTo(px, py); pen = true; } else ctx.lineTo(px, py);
      }
      ctx.stroke(); ctx.restore();
    }
  }

  /* ------------------------------------------------------------------------
     SimBase — clase base de todos los simuladores
     ------------------------------------------------------------------------ */
  class SimBase {
    constructor(canvas, options = {}) {
      this.canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;
      if (!this.canvas) throw new Error('SimBase: canvas no encontrado');
      this.ctx = this.canvas.getContext('2d');
      this.options = Object.assign({ fixedDt: 1 / 120, maxSteps: 8, timeScale: 1, autoplay: false }, options);
      this.container = this.canvas.closest('.sim-canvas-container') || this.canvas.parentElement;
      this.wrapper = this.canvas.closest('.sim-box-wrapper') || this.container;
      this.telemetryEl = this.container.querySelector('.sim-overlay-telemetry');
      this.width = 600; this.height = 250;
      this.running = false; this.visible = true; this._ready = false; this.dpr = 0;
      this.params = {};
      this.palette = readPalette(this.container);
      this.pointer = { x: 0, y: 0, down: false, id: null };
      this._acc = 0; this._last = 0; this._raf = null;
      this.D = Draw;

      this._bindPointer();
      this._observe();
      this.setup();
      this.resize();
      if (this.options.autoplay) this.play();
    }

    /* ----- Métodos que las subclases sobrescriben ----- */
    setup() {}
    reset() { this.draw(); }
    update(/* dt */) {}
    render(/* ctx, w, h */) {}
    telemetry() { return ''; }
    onPointerDown(/* p */) { return false; } // devolver true para capturar arrastre
    onPointerMove(/* p */) {}
    onPointerUp(/* p */) {}
    onParamChange(/* name, value */) { if (!this.running) this.draw(); }
    onResize() {}

    /* ----- API pública ----- */
    setParam(name, value) {
      this.params[name] = value;
      this.onParamChange(name, value);
    }
    play() {
      if (this.running) return;
      this.running = true; this._last = performance.now(); this._acc = 0;
      this._raf = requestAnimationFrame((t) => this._loop(t));
      this._syncButtons();
    }
    pause() {
      this.running = false;
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = null; this._syncButtons(); this.draw();
    }
    toggle() { this.running ? this.pause() : this.play(); }
    stepOnce() { this.update(this.options.fixedDt); this.draw(); }

    draw() {
      if (!this._ready || !this.dpr) return; // hasta que SimKit llame reset() y haya tamaño
      const ctx = this.ctx;
      ctx.save();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = this.palette.bg; ctx.fillRect(0, 0, this.width, this.height);
      try { this.render(ctx, this.width, this.height); }
      catch (err) { console.error(`[${this.constructor.name}] render:`, err); }
      ctx.restore();
      if (this.telemetryEl) {
        let html = '';
        try { html = this.telemetry(); } catch (err) { console.error(`[${this.constructor.name}] telemetry:`, err); }
        if (html !== this._lastTelemetry) { this.telemetryEl.innerHTML = html; this._lastTelemetry = html; }
      }
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return; // oculto: se reintenta luego
      this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.width = rect.width; this.height = rect.height;
      this.canvas.width = Math.round(rect.width * this.dpr);
      this.canvas.height = Math.round(rect.height * this.dpr);
      this.onResize(this.width, this.height);
      this.draw();
    }

    refreshPalette() { this.palette = readPalette(this.container); this.draw(); }

    viewport(opts) { return new Viewport(this, opts); }

    /* ----- Internos ----- */
    _loop(now) {
      if (!this.running) return;
      let frame = Math.min((now - this._last) / 1000, 0.1) * this.options.timeScale;
      this._last = now;
      if (this.visible) {
        this._acc += frame;
        const h = this.options.fixedDt;
        let n = 0;
        while (this._acc >= h && n < this.options.maxSteps) {
          const keep = this.update(h);
          this._acc -= h; n++;
          if (keep === false) { this.running = false; break; }
        }
        if (n >= this.options.maxSteps) this._acc = 0;
        this.draw();
      }
      if (this.running) this._raf = requestAnimationFrame((t) => this._loop(t));
      else this._syncButtons();
    }

    _localPoint(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    _bindPointer() {
      const c = this.canvas;
      c.style.touchAction = 'none';
      c.addEventListener('pointerdown', (e) => {
        const p = this._localPoint(e);
        Object.assign(this.pointer, p, { down: true });
        if (this.onPointerDown(p) === true) {
          this.pointer.id = e.pointerId;
          c.setPointerCapture(e.pointerId);
          c.classList.add('is-dragging');
          e.preventDefault();
        }
      });
      c.addEventListener('pointermove', (e) => {
        const p = this._localPoint(e);
        Object.assign(this.pointer, p);
        if (this.pointer.id === e.pointerId) { this.onPointerMove(p); if (!this.running) this.draw(); }
        else if (this.hitTest) c.style.cursor = this.hitTest(p) ? 'grab' : 'default';
      });
      const up = (e) => {
        if (this.pointer.id !== e.pointerId) { this.pointer.down = false; return; }
        this.pointer.down = false; this.pointer.id = null;
        c.classList.remove('is-dragging');
        this.onPointerUp(this._localPoint(e));
        if (!this.running) this.draw();
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
    }

    _observe() {
      if ('ResizeObserver' in window) {
        let pending = null;
        new ResizeObserver(() => {
          cancelAnimationFrame(pending);
          pending = requestAnimationFrame(() => this.resize());
        }).observe(this.container);
      } else {
        window.addEventListener('resize', () => this.resize());
      }
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((entries) => {
          this.visible = entries[0].isIntersecting;
        }, { threshold: 0.01 }).observe(this.canvas);
      }
    }

    _syncButtons() {
      const id = this.canvas.id;
      if (!id) return;
      document.querySelectorAll(`[data-sim-target="${id}"][data-action="toggle"]`).forEach((b) => {
        const playLbl = b.dataset.labelPlay || '<i class="fas fa-play"></i> Iniciar';
        const pauseLbl = b.dataset.labelPause || '<i class="fas fa-pause"></i> Pausar';
        b.innerHTML = this.running ? pauseLbl : playLbl;
        b.classList.toggle('is-running', this.running);
      });
    }
  }

  /* ------------------------------------------------------------------------
     SimKit — registro, auto-inicialización y enlazado declarativo
     ------------------------------------------------------------------------ */
  const registry = {};
  const instances = {};

  function fmtValue(v, decimals) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(decimals) : String(v);
  }

  function updateOutput(input, sim) {
    const dec = input.dataset.decimals !== undefined ? +input.dataset.decimals : 0;
    const unit = input.dataset.unit ? ` ${input.dataset.unit}` : '';
    const out = input.dataset.output
      ? document.querySelector(input.dataset.output)
      : input.closest('.control-card')?.querySelector('.control-val-badge');
    const val = input.type === 'checkbox' ? input.checked : (input.tagName === 'SELECT' ? input.value : parseFloat(input.value));
    if (out && input.type !== 'checkbox') {
      const shown = input.tagName === 'SELECT' ? input.options[input.selectedIndex].text : fmtValue(val, dec) + unit;
      if (input.tagName !== 'SELECT') out.textContent = shown;
    }
    return input.tagName === 'SELECT' && !isNaN(parseFloat(val)) ? parseFloat(val) : val;
  }

  function bindControls(id, sim) {
    // Controles de parámetros: range, number, checkbox, select
    document.querySelectorAll(`[data-sim-target="${id}"][data-param]`).forEach((input) => {
      const name = input.dataset.param;
      const apply = () => sim.setParam(name, updateOutput(input, sim));
      const evt = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
      input.addEventListener(evt, apply);
      // Valor inicial del HTML → parámetro del simulador (el HTML manda)
      sim.params[name] = updateOutput(input, sim);
    });
    // Botones de acción: play | pause | toggle | reset | step | <método propio>
    document.querySelectorAll(`[data-sim-target="${id}"][data-action]`).forEach((btn) => {
      btn.addEventListener('click', () => {
        const a = btn.dataset.action;
        if (typeof sim[a] === 'function') sim[a]();
        else console.warn(`SimKit: acción "${a}" no existe en ${sim.constructor.name}`);
        if (a === 'reset' && !sim.running) sim.draw();
      });
    });
    sim._syncButtons();
    sim._ready = true;
    sim.reset();
    sim.draw();
  }

  /* El HTML puede reflejar un parámetro modificado desde el canvas (arrastre). */
  function reflectParam(sim, name, value) {
    const id = sim.canvas.id;
    document.querySelectorAll(`[data-sim-target="${id}"][data-param="${name}"]`).forEach((input) => {
      if (input.type === 'checkbox') input.checked = !!value; else input.value = value;
      updateOutput(input, sim);
    });
    sim.params[name] = value;
  }

  function initAll(root = document) {
    root.querySelectorAll('canvas[data-sim]').forEach((canvas) => {
      const name = canvas.dataset.sim;
      const Cls = registry[name];
      if (!canvas.id) canvas.id = `sim_${name}_${Object.keys(instances).length}`;
      if (instances[canvas.id]) return;
      if (!Cls) { console.error(`SimKit: simulador "${name}" no registrado`); return; }
      try {
        const opts = canvas.dataset.simOptions ? JSON.parse(canvas.dataset.simOptions) : {};
        const sim = new Cls(canvas, opts);
        instances[canvas.id] = sim;
        bindControls(canvas.id, sim);
      } catch (err) {
        console.error(`SimKit: error iniciando "${name}"`, err);
        const box = canvas.closest('.sim-canvas-container');
        if (box) box.insertAdjacentHTML('beforeend', '<div class="sim-error">⚠ Simulador no disponible</div>');
      }
    });
    return instances;
  }

  function refreshAll() { Object.values(instances).forEach((s) => { s.refreshPalette(); s.resize(); }); }

  global.SimBase = SimBase;
  global.Viewport = Viewport;
  global.SimDraw = Draw;
  global.SimKit = {
    register(name, Cls) { registry[name] = Cls; },
    initAll, refreshAll, reflectParam,
    get instances() { return instances; },
    get(id) { return instances[id]; }
  };
})(window);
