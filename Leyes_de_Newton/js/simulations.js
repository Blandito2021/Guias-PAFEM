/* ==========================================================================
   SIMULADORES: Dinámica — las leyes de Newton
   Todos extienden SimBase (js/sim-kit.js). Unidades SI internas, una escala
   px/m por simulador y la geometría de dibujo/arrastre en un solo método.
   Las aceleraciones son constantes por tramos: se integra de forma exacta
   (x += v·dt + ½a·dt², v += a·dt).
   ========================================================================== */

const G_EARTH = 9.8;

/* --------------------------------------------------------------------------
   0. Mesa de fuerzas: superposición, componentes y equilibrante
   Dos fuerzas concurrentes con puntas arrastrables; R = F₁ + F₂.
   -------------------------------------------------------------------------- */
class ForceTableSim extends SimBase {
  setup() { this.params = { F1: 40, t1: 20, F2: 30, t2: 110, eq: false }; }
  reset() { this.draw(); }
  geometry() {
    const cx = this.width * 0.4, cy = this.height / 2;
    const s = (this.height / 2 - 22) / 50;                         // px por newton (F máx 50 N)
    const tip = (F, t) => { const r = (t * Math.PI) / 180; return { x: cx + F * s * Math.cos(r), y: cy - F * s * Math.sin(r) }; };
    return { cx, cy, s, p1: tip(this.params.F1, this.params.t1), p2: tip(this.params.F2, this.params.t2) };
  }
  resultant() {
    const { F1, t1, F2, t2 } = this.params, d = Math.PI / 180;
    const Rx = F1 * Math.cos(t1 * d) + F2 * Math.cos(t2 * d);
    const Ry = F1 * Math.sin(t1 * d) + F2 * Math.sin(t2 * d);
    let ang = Math.atan2(Ry, Rx) / d; if (ang < 0) ang += 360;
    return { Rx, Ry, R: Math.hypot(Rx, Ry), ang };
  }
  which(p) {
    const g = this.geometry();
    if (Math.hypot(p.x - g.p1.x, p.y - g.p1.y) < 18) return 1;
    if (Math.hypot(p.x - g.p2.x, p.y - g.p2.y) < 18) return 2;
    return 0;
  }
  hitTest(p) { return this.which(p) > 0; }
  onPointerDown(p) { this.dragging = this.which(p); return this.dragging > 0; }
  onPointerMove(p) {
    const g = this.geometry();
    const dx = (p.x - g.cx) / g.s, dy = (g.cy - p.y) / g.s;
    const F = Math.max(0, Math.min(50, Math.round(Math.hypot(dx, dy))));
    let t = Math.round((Math.atan2(dy, dx) * 180) / Math.PI); if (t < 0) t += 360;
    SimKit.reflectParam(this, `F${this.dragging}`, F);
    SimKit.reflectParam(this, `t${this.dragging}`, t);
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, g = this.geometry(), r = this.resultant();
    // cuadrícula de 10 N
    ctx.save(); ctx.strokeStyle = P.grid; ctx.lineWidth = 1;
    for (let k = -5; k <= 5; k++) {
      ctx.beginPath(); ctx.moveTo(g.cx + k * 10 * g.s, 8); ctx.lineTo(g.cx + k * 10 * g.s, h - 8); ctx.stroke();
      if (Math.abs(k) <= 4) { ctx.beginPath(); ctx.moveTo(g.cx - 50 * g.s, g.cy + k * 10 * g.s); ctx.lineTo(g.cx + 50 * g.s, g.cy + k * 10 * g.s); ctx.stroke(); }
    }
    ctx.restore();
    ctx.strokeStyle = P.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(g.cx - 52 * g.s, g.cy); ctx.lineTo(g.cx + 52 * g.s, g.cy); ctx.moveTo(g.cx, 8); ctx.lineTo(g.cx, h - 8); ctx.stroke();
    D.label(ctx, 'x', g.cx + 52 * g.s - 4, g.cy - 6, { color: P.muted, size: 12 });
    D.label(ctx, 'y', g.cx + 6, 18, { color: P.muted, size: 12 });
    D.label(ctx, 'cuadrícula: 10 N', 10, h - 10, { color: P.muted, size: 11 });
    // paralelogramo
    const Rt = { x: g.cx + r.Rx * g.s, y: g.cy - r.Ry * g.s };
    D.dashedLine(ctx, g.p1.x, g.p1.y, Rt.x, Rt.y, P.muted);
    D.dashedLine(ctx, g.p2.x, g.p2.y, Rt.x, Rt.y, P.muted);
    // componentes de R
    D.dashedLine(ctx, Rt.x, g.cy, Rt.x, Rt.y, P.secondary, 1.5, [3, 3]);
    D.dashedLine(ctx, g.cx, Rt.y, Rt.x, Rt.y, P.secondary, 1.5, [3, 3]);
    D.arrow(ctx, g.cx, g.cy, g.p1.x, g.p1.y, P.primary, 3.5, 11);
    D.arrow(ctx, g.cx, g.cy, g.p2.x, g.p2.y, P.good, 3.5, 11);
    if (r.R > 0.5) D.arrow(ctx, g.cx, g.cy, Rt.x, Rt.y, P.secondary, 4.5, 13);
    if (this.params.eq && r.R > 0.5) D.arrow(ctx, g.cx, g.cy, g.cx - r.Rx * g.s, g.cy + r.Ry * g.s, P.bad, 3, 11);
    [[g.p1, P.primary, 'F₁'], [g.p2, P.good, 'F₂']].forEach(([p, c, lab]) => {
      ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill(); ctx.restore();
      D.label(ctx, lab, p.x + 8, p.y - 8, { color: c, size: 14, weight: '800' });
    });
    if (r.R > 0.5) D.label(ctx, 'R', Rt.x + 8, Rt.y - 8, { color: P.secondary, size: 14, weight: '800' });
    if (this.params.eq && r.R > 0.5) D.label(ctx, 'E = −R', g.cx - r.Rx * g.s + 8, g.cy + r.Ry * g.s + 16, { color: P.bad, size: 12, weight: '700' });
    ctx.fillStyle = P.text; ctx.beginPath(); ctx.arc(g.cx, g.cy, 4, 0, 7); ctx.fill();
  }
  telemetry() {
    const r = this.resultant();
    return `R<sub>x</sub> = ΣF<sub>x</sub> = <b>${r.Rx.toFixed(1)} N</b> · R<sub>y</sub> = ΣF<sub>y</sub> = <b>${r.Ry.toFixed(1)} N</b><br>
      R = √(R<sub>x</sub>² + R<sub>y</sub>²) = <b>${r.R.toFixed(1)} N</b> a <b>${r.ang.toFixed(0)}°</b><br>
      ${this.params.eq ? `Equilibrante E = ${r.R.toFixed(1)} N a ${((r.ang + 180) % 360).toFixed(0)}° → ΣF = 0` : 'Activa la equilibrante para lograr ΣF = 0'}`;
  }
}
SimKit.register('ForceTableSim', ForceTableSim);

/* --------------------------------------------------------------------------
   1. Primera ley: disco que se desliza sobre superficies distintas
   -------------------------------------------------------------------------- */
class InertiaSim extends SimBase {
  setup() { this.params = { v0: 4, mu: 0.1 }; this.L = 20; }      // pista de 20 m
  reset() { this.x = 2.5; this.v = this.params.v0; this.t = 0; this.marks = []; this.nextMark = 0; this.pause(); }
  onParamChange() { this.reset(); }
  launch() { this.reset(); this.play(); }
  update(dt) {
    const a = this.v > 0 ? -this.params.mu * G_EARTH : 0;
    const stopT = a < 0 ? this.v / -a : Infinity;
    const h = Math.min(dt, stopT);
    this.x += this.v * h + 0.5 * a * h * h;
    this.v = Math.max(0, this.v + a * h);
    this.t += dt;
    if (this.t >= this.nextMark) { this.marks.push(this.x % this.L); this.nextMark += 0.5; if (this.marks.length > 40) this.marks.shift(); }
    if (this.x > this.L) { this.x -= this.L; this.marks = []; }           // MRU: reaparece por el borde
    return this.v > 0 && this.t < 60;
  }
  layout() { const scale = (this.width - 40) / this.L; return { scale, x0: 20, y: this.height - 60 }; }
  render(ctx, w) {
    const P = this.palette, D = this.D, L = this.layout();
    const surf = this.params.mu === 0 ? 'Hielo ideal (μₖ = 0)' : this.params.mu < 0.08 ? 'Hielo real' : this.params.mu < 0.2 ? 'Madera' : 'Concreto';
    ctx.fillStyle = this.params.mu === 0 ? 'rgba(125,211,252,0.18)' : P.ground;
    ctx.fillRect(0, L.y, w, 60);
    ctx.strokeStyle = P.axis; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, L.y); ctx.lineTo(w, L.y); ctx.stroke();
    for (let m = 0; m <= this.L; m += 5) D.label(ctx, `${m} m`, L.x0 + m * L.scale, L.y + 22, { color: P.muted, size: 10, align: 'center', font: '"Fira Code", monospace' });
    D.label(ctx, surf, w - 12, L.y + 44, { color: P.text, size: 12, align: 'right', weight: '700' });
    // marcas estroboscópicas (cada 0.5 s)
    ctx.save(); ctx.globalAlpha = 0.35;
    this.marks.forEach((mx) => { ctx.fillStyle = P.primary; ctx.beginPath(); ctx.ellipse(L.x0 + mx * L.scale, L.y - 8, 14, 6, 0, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
    const px = L.x0 + (this.x % this.L) * L.scale;
    ctx.fillStyle = '#0f172a'; ctx.strokeStyle = P.primary; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, L.y - 8, 16, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (this.v > 0.01) {
      D.arrow(ctx, px, L.y - 34, px + 12 + this.v * 9, L.y - 34, P.accent, 3, 10);
      D.label(ctx, 'v', px + 16 + this.v * 9, L.y - 38, { color: P.accent, size: 13, weight: '700' });
    }
    if (this.params.mu > 0 && this.v > 0.01) {
      D.arrow(ctx, px - 16, L.y - 6, px - 16 - 40 * this.params.mu / 0.3 - 10, L.y - 6, P.warn, 3, 9);
      D.label(ctx, 'fₖ', px - 30 - 40 * this.params.mu / 0.3, L.y - 14, { color: P.warn, size: 12, align: 'right' });
    }
    D.label(ctx, 'Marcas cada 0.5 s', 12, 22, { color: P.muted, size: 11 });
  }
  telemetry() {
    const a = this.v > 0 ? -this.params.mu * G_EARTH : 0;
    return `v = <b>${this.v.toFixed(2)} m/s</b> · t = ${this.t.toFixed(1)} s<br>
      ΣF/m = a = −μₖg = <b>${a.toFixed(2)} m/s²</b><br>
      ${this.params.mu === 0 ? 'ΣF = 0 → v constante (inercia)' : this.v > 0 ? 'La fricción cambia el estado de movimiento' : 'Detenido: ΣF = 0, reposo'}`;
  }
}
SimKit.register('InertiaSim', InertiaSim);

/* --------------------------------------------------------------------------
   2. Segunda ley: carro con fuerza y masa variables + gráfica a–F
   -------------------------------------------------------------------------- */
class SecondLawSim extends SimBase {
  setup() { this.params = { F: 20, m: 4 }; this.L = 10; this.points = []; }
  get a() { return this.params.F / this.params.m; }
  reset() { this.x = 0; this.v = 0; this.t = 0; this.pause(); }
  onParamChange() { this.reset(); }
  push() { this.reset(); this.play(); }
  record() {
    this.points.push({ F: this.params.F, a: this.a, m: this.params.m });
    if (this.points.length > 24) this.points.shift();
    this.draw();
  }
  clearPoints() { this.points = []; this.draw(); }
  update(dt) {
    const a = this.a;
    this.x += this.v * dt + 0.5 * a * dt * dt; this.v += a * dt; this.t += dt;
    if (this.x >= this.L) { this.x = this.L; return false; }
    return true;
  }
  layout() { const split = this.width * 0.55; return { split, x0: 24, scale: (split - 90) / this.L, y: this.height - 54 }; }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, L = this.layout();
    ctx.fillStyle = P.ground; ctx.fillRect(0, L.y, L.split, 54);
    ctx.strokeStyle = P.axis; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, L.y); ctx.lineTo(L.split, L.y); ctx.stroke();
    for (let m = 0; m <= this.L; m += 2) D.label(ctx, `${m}`, L.x0 + 28 + m * L.scale, L.y + 20, { color: P.muted, size: 10, align: 'center', font: '"Fira Code", monospace' });
    const cx = L.x0 + this.x * L.scale, cw = 56, ch = 30;
    D.roundRect(ctx, cx, L.y - ch - 10, cw, ch, 5, '#0369a1', P.primary);
    ctx.fillStyle = '#0f172a'; [cx + 12, cx + cw - 12].forEach((wx) => { ctx.beginPath(); ctx.arc(wx, L.y - 6, 6, 0, 7); ctx.fill(); });
    D.label(ctx, `${this.params.m} kg`, cx + cw / 2, L.y - ch / 2 - 5, { color: '#fff', size: 11, weight: '700', align: 'center' });
    if (this.params.F > 0) {
      const len = 10 + this.params.F * 1.4;
      D.arrow(ctx, cx + cw, L.y - ch / 2 - 10, cx + cw + len, L.y - ch / 2 - 10, P.accent, 3.5, 11);
      D.label(ctx, `F = ${this.params.F} N`, cx + cw + 4, L.y - ch - 18, { color: P.accent, size: 12, weight: '700' });
    }
    D.label(ctx, `a = F/m = ${this.a.toFixed(2)} m/s²`, 14, 22, { color: P.text, size: 12, weight: '700' });
    // gráfica a vs F
    const vp = this.viewport({ xmin: 0, xmax: 50, ymin: 0, ymax: 25, pad: [22, 14, 30, L.split + 34] });
    vp.axes(ctx, { xLabel: 'F (N)', yLabel: 'a (m/s²)', xStep: 10, yStep: 5 });
    vp.plot(ctx, (F) => F / this.params.m, { color: P.primary, width: 2, dash: [6, 4] });
    const masses = [...new Set(this.points.map((p) => p.m))];
    this.points.forEach((p) => {
      ctx.fillStyle = masses.indexOf(p.m) % 2 ? P.secondary : P.accent;
      ctx.beginPath(); ctx.arc(vp.X(p.F), vp.Y(Math.min(p.a, 25)), 4.5, 0, 7); ctx.fill();
    });
    D.label(ctx, `pendiente = 1/m = ${(1 / this.params.m).toFixed(3)} kg⁻¹`, vp.right - 4, vp.top + 14, { color: P.primary, size: 11, align: 'right' });
  }
  telemetry() {
    return `ΣF = <b>${this.params.F} N</b> · m = <b>${this.params.m} kg</b><br>
      a = <b>${this.a.toFixed(2)} m/s²</b> · v = ${this.v.toFixed(2)} m/s<br>
      x = ${this.x.toFixed(2)} m · puntos: ${this.points.length}`;
  }
}
SimKit.register('SecondLawSim', SecondLawSim);

/* --------------------------------------------------------------------------
   3. Tercera ley: dos bloques en contacto empujados por F (Serway, ej. 5.7)
   -------------------------------------------------------------------------- */
class ContactSim extends SimBase {
  setup() { this.params = { F: 30, m1: 4, m2: 2 }; }
  get a() { return this.params.F / (this.params.m1 + this.params.m2); }
  get P() { return this.params.m2 * this.a; }
  reset() { this.x = 0; this.v = 0; this.pause(); }
  onParamChange() { this.reset(); }
  update(dt) {
    this.x += this.v * dt + 0.5 * this.a * dt * dt; this.v += this.a * dt;
    const g = this.geometry();
    return g.x2 + g.s2 < this.width * 0.57;                        // se detiene al final de la pista
  }
  geometry() {
    const scale = (this.width * 0.36) / 6, groundY = this.height * 0.52;
    const s1 = 30 + 6 * this.params.m1, s2 = 30 + 6 * this.params.m2;
    const x1 = 112 + this.x * scale, x2 = x1 + s1;                  // deja sitio a F máx (82 px)
    const fLen = 10 + this.params.F * 1.2;
    return { scale, groundY, s1, s2, x1, x2, fLen, tipX: x1 - fLen - 8, tipY: groundY - s1 / 2 };
  }
  hitTest(p) { const g = this.geometry(); return Math.hypot(p.x - g.tipX, p.y - g.tipY) < 22; }
  onPointerDown(p) { return !this.running && this.hitTest(p); }
  onPointerMove(p) {
    const g = this.geometry();
    const F = Math.max(0, Math.min(60, Math.round((g.x1 - 8 - p.x - 10) / 1.2)));
    SimKit.reflectParam(this, 'F', F); this.x = 0;
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, g = this.geometry();
    ctx.fillStyle = P.ground; ctx.fillRect(0, g.groundY, w * 0.58, 10);
    ctx.strokeStyle = P.axis; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, g.groundY); ctx.lineTo(w * 0.58, g.groundY); ctx.stroke();
    D.label(ctx, 'superficie sin fricción', 8, g.groundY + 26, { color: P.muted, size: 11 });
    D.roundRect(ctx, g.x1, g.groundY - g.s1, g.s1, g.s1, 4, '#0369a1', P.primary);
    D.roundRect(ctx, g.x2, g.groundY - g.s2, g.s2, g.s2, 4, '#7c3aed', P.secondary);
    D.label(ctx, 'm₁', g.x1 + g.s1 / 2, g.groundY - g.s1 / 2 + 5, { color: '#fff', size: 13, weight: '800', align: 'center' });
    D.label(ctx, 'm₂', g.x2 + g.s2 / 2, g.groundY - g.s2 / 2 + 5, { color: '#fff', size: 13, weight: '800', align: 'center' });
    D.arrow(ctx, g.tipX, g.tipY, g.x1 - 2, g.tipY, P.accent, 4, 12);
    ctx.save(); ctx.fillStyle = P.accent; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.arc(g.tipX, g.tipY, 10, 0, 7); ctx.fill(); ctx.restore();
    D.label(ctx, `F = ${this.params.F} N`, g.tipX, g.tipY - 14, { color: P.accent, size: 12, weight: '700' });
    // DCL de cada bloque (columna derecha)
    const by = h * 0.55, k = 1.6;
    const dcl = (cx, title, color, forces) => {
      D.roundRect(ctx, cx - 14, by - 14, 28, 28, 3, color, null);
      D.label(ctx, title, cx, by - 46, { color: P.text, size: 11, weight: '700', align: 'center' });
      forces.forEach(([dx, dy, c, lab]) => {
        D.arrow(ctx, cx, by, cx + dx, by + dy, c, 2.5, 8);
        D.label(ctx, lab, cx + dx + (dx >= 0 ? 4 : -4), by + dy + (dy > 0 ? 12 : dy < 0 ? -4 : -6), { color: c, size: 11, align: dx >= 0 ? 'left' : 'right', weight: '700' });
      });
    };
    const Pk = Math.min(70, 10 + this.P * k), Fk = Math.min(90, 10 + this.params.F * k);
    dcl(w * 0.7, 'DCL de m₁', '#0369a1', [[Fk, 0, P.accent, 'F'], [-Pk, 0, P.bad, 'P₂₁'], [0, 26, P.muted, 'm₁g'], [0, -26, P.good, 'n₁']]);
    dcl(w * 0.9, 'DCL de m₂', '#7c3aed', [[Pk, 0, P.bad, 'P₁₂'], [0, 26, P.muted, 'm₂g'], [0, -26, P.good, 'n₂']]);
    D.label(ctx, 'Par acción–reacción: P₁₂ = −P₂₁', w * 0.8, h - 14, { color: P.bad, size: 11, align: 'center', weight: '700' });
  }
  telemetry() {
    return `a = F/(m₁+m₂) = <b>${this.a.toFixed(2)} m/s²</b><br>
      P₁₂ = m₂a = <b>${this.P.toFixed(2)} N</b> · P₂₁ = <b>−${this.P.toFixed(2)} N</b><br>
      ΣF sobre m₁ = F − P = ${(this.params.F - this.P).toFixed(2)} N = m₁a`;
  }
}
SimKit.register('ContactSim', ContactSim);

/* --------------------------------------------------------------------------
   4. Fricción en un plano inclinado (ángulo arrastrable)
   -------------------------------------------------------------------------- */
class InclineSim extends SimBase {
  setup() { this.params = { theta: 20, mus: 0.4, muk: 0.3, m: 2 }; this.L = 4; }   // rampa de 4 m
  get r() { return (this.params.theta * Math.PI) / 180; }
  get muk() { return Math.min(this.params.muk, this.params.mus); }
  state() {
    const { m, mus } = this.params, g = G_EARTH, r = this.r;
    const n = m * g * Math.cos(r), along = m * g * Math.sin(r);
    const slips = Math.tan(r) > mus + 1e-9;
    const f = slips ? this.muk * n : along;
    const a = slips ? Math.max(0, g * (Math.sin(r) - this.muk * Math.cos(r))) : 0;
    return { n, along, f, a, slips, thetaC: (Math.atan(mus) * 180) / Math.PI };
  }
  reset() { this.s = 0; this.v = 0; this.t = 0; this.pause(); }
  onParamChange() { this.reset(); }
  release() { this.reset(); this.play(); }
  update(dt) {
    const { a, slips } = this.state();
    if (!slips) return false;
    this.s += this.v * dt + 0.5 * a * dt * dt; this.v += a * dt; this.t += dt;
    if (this.s >= this.L) { this.s = this.L; return false; }
    if (a === 0 && this.v === 0) return false;
    return true;
  }
  geometry() {
    const baseX = 40, baseY = this.height - 30;
    const len = Math.min(this.width * 0.55, (this.height - 60) / Math.max(Math.sin(this.r), 0.35));
    const topX = baseX + len * Math.cos(this.r), topY = baseY - len * Math.sin(this.r);
    return { baseX, baseY, len, topX, topY, scale: len / this.L };
  }
  hitTest(p) { const g = this.geometry(); return Math.hypot(p.x - g.topX, p.y - g.topY) < 22; }
  onPointerDown(p) { return !this.running && this.hitTest(p); }
  onPointerMove(p) {
    const g = this.geometry();
    const th = Math.max(0, Math.min(60, Math.round((Math.atan2(g.baseY - p.y, p.x - g.baseX) * 180) / Math.PI)));
    SimKit.reflectParam(this, 'theta', th); this.s = 0; this.v = 0;
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D, g = this.geometry(), st = this.state(), r = this.r;
    // rampa (el bloque baja desde la cima hacia la base)
    ctx.fillStyle = P.ground; ctx.beginPath(); ctx.moveTo(g.baseX, g.baseY); ctx.lineTo(g.topX, g.topY); ctx.lineTo(g.topX, g.baseY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = P.axis; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(g.topX, g.topY, 7, 0, 7); ctx.fill();
    ctx.save(); ctx.strokeStyle = P.accent; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.baseX, g.baseY, 40, -r, 0); ctx.stroke(); ctx.restore();
    D.label(ctx, `θ = ${this.params.theta}°`, g.baseX + 46, g.baseY - 8, { color: P.accent, size: 12, weight: '700' });
    // bloque: posición medida desde la cima
    const d = (this.L - this.s) * g.scale - 30;
    const ux = Math.cos(r), uy = -Math.sin(r);                      // hacia arriba de la rampa
    const nx = Math.sin(r), ny = Math.cos(r);                       // normal saliente (pantalla: −y arriba)
    const cx = g.baseX + Math.max(18, d) * ux, cy = g.baseY + Math.max(18, d) * uy;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-r);
    D.roundRect(ctx, -18, -30, 36, 30, 4, '#0369a1', P.primary);
    D.label(ctx, `${this.params.m} kg`, 0, -11, { color: '#fff', size: 10, weight: '700', align: 'center' });
    ctx.restore();
    const ox = cx - nx * 15, oy = cy - ny * 15, k = 2.2;
    D.arrow(ctx, ox, oy, ox, oy + this.params.m * G_EARTH * k, P.muted, 2.5, 8);
    D.label(ctx, 'mg', ox + 6, oy + this.params.m * G_EARTH * k, { color: P.muted, size: 11, weight: '700' });
    D.arrow(ctx, ox, oy, ox - nx * st.n * k, oy - ny * st.n * k, P.good, 2.5, 8);
    D.label(ctx, 'n', ox - nx * st.n * k - 12, oy - ny * st.n * k, { color: P.good, size: 12, weight: '700' });
    if (st.f > 0.05) {
      D.arrow(ctx, ox, oy, ox + ux * st.f * k, oy + uy * st.f * k, P.warn, 2.5, 8);
      D.label(ctx, st.slips ? 'fₖ' : 'fₛ', ox + ux * st.f * k + 4, oy + uy * st.f * k - 6, { color: P.warn, size: 12, weight: '700' });
    }
    D.label(ctx, st.slips ? '⇣ DESLIZA: tanθ > μₛ' : '■ EN REPOSO: tanθ ≤ μₛ', w - 12, 22, { color: st.slips ? P.bad : P.good, size: 13, align: 'right', weight: '800' });
    D.label(ctx, `θc = arctan μₛ = ${st.thetaC.toFixed(1)}°`, w - 12, 42, { color: P.text, size: 12, align: 'right' });
    D.label(ctx, 'Arrastra el punto amarillo para cambiar θ', w - 12, h - 10, { color: P.muted, size: 11, align: 'right' });
  }
  telemetry() {
    const st = this.state();
    return `n = mg·cosθ = <b>${st.n.toFixed(1)} N</b> · mg·senθ = <b>${st.along.toFixed(1)} N</b><br>
      ${st.slips ? `fₖ = μₖn = <b>${st.f.toFixed(1)} N</b>` : `fₛ = <b>${st.f.toFixed(1)} N</b> ≤ μₛn = ${(this.params.mus * st.n).toFixed(1)} N`}<br>
      a = <b>${st.a.toFixed(2)} m/s²</b> · v = ${this.v.toFixed(2)} m/s`;
  }
}
SimKit.register('InclineSim', InclineSim);

/* --------------------------------------------------------------------------
   5. Máquina de Atwood (Serway, ej. 5.9)
   -------------------------------------------------------------------------- */
class AtwoodSim extends SimBase {
  setup() { this.params = { m1: 3, m2: 5 }; this.range = 1.6; }    // recorrido máximo ±1.6 m
  get a() { const { m1, m2 } = this.params; return ((m2 - m1) * G_EARTH) / (m1 + m2); }   // + : m2 baja
  get T() { const { m1, m2 } = this.params; return (2 * m1 * m2 * G_EARTH) / (m1 + m2); }
  reset() { this.y = 0; this.v = 0; this.t = 0; this.pause(); }
  onParamChange() { this.reset(); }
  update(dt) {
    const a = this.a;
    this.y += this.v * dt + 0.5 * a * dt * dt; this.v += a * dt; this.t += dt;
    if (Math.abs(this.y) >= this.range) { this.y = Math.sign(this.y) * this.range; return false; }
    return a !== 0;
  }
  render(ctx, w, h) {
    const P = this.palette, D = this.D;
    const cx = w * 0.3, top = 26, R = 34, scale = (h - top - 110) / (2 * this.range);
    ctx.fillStyle = P.ground; ctx.fillRect(cx - 70, 0, 140, 10);
    ctx.strokeStyle = P.axis; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, top + R); ctx.stroke();
    ctx.strokeStyle = P.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, top + R, R, 0, 7); ctx.stroke();
    const mid = top + R + 40 + this.range * scale;
    const y1 = mid - this.y * scale, y2 = mid + this.y * scale;       // m2 baja cuando y > 0
    const box = (x, y, m, color, lab) => {
      const s = 22 + 3.2 * m;
      ctx.strokeStyle = P.text; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, top + R); ctx.lineTo(x, y); ctx.stroke();
      D.roundRect(ctx, x - s / 2, y, s, s, 4, color, null);
      D.label(ctx, lab, x, y + s / 2 + 5, { color: '#fff', size: 12, weight: '800', align: 'center' });
      return s;
    };
    const s1 = box(cx - R, y1, this.params.m1, '#0369a1', 'm₁');
    const s2 = box(cx + R, y2, this.params.m2, '#7c3aed', 'm₂');
    const k = 1.1;
    D.arrow(ctx, cx - R, y1, cx - R, y1 - this.T * k, P.good, 2.5, 8);
    D.label(ctx, 'T', cx - R - 16, y1 - this.T * k + 8, { color: P.good, size: 12, weight: '700' });
    D.arrow(ctx, cx - R, y1 + s1, cx - R, y1 + s1 + this.params.m1 * G_EARTH * k, P.bad, 2.5, 8);
    D.label(ctx, 'm₁g', cx - R - 34, y1 + s1 + this.params.m1 * G_EARTH * k, { color: P.bad, size: 11 });
    D.arrow(ctx, cx + R, y2, cx + R, y2 - this.T * k, P.good, 2.5, 8);
    D.label(ctx, 'T', cx + R + 6, y2 - this.T * k + 8, { color: P.good, size: 12, weight: '700' });
    D.arrow(ctx, cx + R, y2 + s2, cx + R, y2 + s2 + this.params.m2 * G_EARTH * k, P.bad, 2.5, 8);
    D.label(ctx, 'm₂g', cx + R + 6, y2 + s2 + this.params.m2 * G_EARTH * k, { color: P.bad, size: 11 });
    // gráfica v(t)
    const vp = this.viewport({ xmin: 0, xmax: 3, ymin: -6, ymax: 6, pad: [24, 14, 26, w * 0.58] });
    vp.axes(ctx, { xLabel: 't (s)', yLabel: 'v de m₂ (m/s)', xStep: 1, yStep: 2 });
    vp.plot(ctx, (t) => this.a * t, { color: P.primary, width: 1.5, dash: [5, 4], from: 0, to: 3 });
    ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(vp.X(Math.min(this.t, 3)), vp.Y(Math.max(-6, Math.min(6, this.v))), 5, 0, 7); ctx.fill();
  }
  telemetry() {
    const { m1, m2 } = this.params;
    return `a = (m₂−m₁)g/(m₁+m₂) = <b>${this.a.toFixed(2)} m/s²</b><br>
      T = 2m₁m₂g/(m₁+m₂) = <b>${this.T.toFixed(2)} N</b><br>
      ${m1 === m2 ? 'm₁ = m₂: equilibrio (ΣF = 0)' : `baja ${m2 > m1 ? 'm₂' : 'm₁'} · v = ${Math.abs(this.v).toFixed(2)} m/s`}`;
  }
}
SimKit.register('AtwoodSim', AtwoodSim);
