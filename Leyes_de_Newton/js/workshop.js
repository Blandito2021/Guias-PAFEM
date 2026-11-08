/* ==========================================================================
   WORKSHOP — Motor genérico del taller evaluativo (NO editar por guía)
   Lee las preguntas de window.GUIDE.questions (definidas en guide-config.js).

   Tipos soportados:
     numeric   { answer, unit, tolRel=0.02, tolAbs=0 }       → |x−x*| ≤ max(tolRel·|x*|, tolAbs)
     choice    { options:[...], correct: índice }            → opciones barajadas de forma determinista
     multi     { options:[...], correct: [índices] }         → selección múltiple (todas y solo esas)
     truefalse { answer: true|false }
     match     { pairs: [[izq, der], ...] }                  → emparejamiento con listas desplegables
     text      { answers: ['respuesta', 'sinónimo'] }        → respuesta corta normalizada (sin tildes/mayúsc.)
     open      { rubric: '...' }                              → respuesta para el cuaderno (no se autocalifica)

   Campos comunes: id (único), topic, badge, bloom, question (HTML+KaTeX),
   hint, quick (true = entra en el modo rápido), feedback {índice: 'texto'}
   para distractores, solution { datos, formula, despeje, calculo, conclusion }
   o solution { steps: [{ label, html }] }.

   Nota (Colombia, Decreto 1290 / SIEE): nota = 1 + 4·f, redondeada a 1 decimal.
   ========================================================================== */

(function (global) {
  'use strict';

  const G = () => global.GUIDE || {};
  const LEVELS = () => G().gradeLevels || [
    { min: 4.6, name: 'SUPERIOR' }, { min: 4.0, name: 'ALTO' },
    { min: 3.0, name: 'BÁSICO' }, { min: 1.0, name: 'BAJO' }
  ];

  /* Barajado determinista: misma permutación en cada carga e impresión. */
  function seededShuffle(n, seed) {
    let s = 0;
    for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const idx = [...Array(n).keys()];
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  }

  const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9.,\-+/^ ]/g, '').replace(/\s+/g, ' ').trim();

  const parseNum = (s) => {
    if (typeof s === 'number') return s;
    const t = String(s ?? '').trim().replace(/\s/g, '').replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.');
    return t === '' ? NaN : Number(t.replace(/×10\^?/i, 'e').replace(/x10\^?/i, 'e'));
  };

  const LETTERS = 'ABCDEFGHIJ';

  class Workshop {
    constructor(container) {
      this.container = container;
      this.questions = (G().questions || []).map((q, i) => Object.assign({ id: i + 1 }, q));
      this.mode = 'full';
      this.key = `${G().id || 'guia'}_workshop_v2`;
      this.answers = {};
      this.load();
    }

    get active() {
      if (this.mode === 'quick') {
        const q = this.questions.filter((x) => x.quick);
        return q.length ? q : this.questions.slice(0, Math.min(5, this.questions.length));
      }
      return this.questions;
    }

    /* ------------------------------ Render ------------------------------ */
    render() {
      const list = this.active;
      const total = list.length;
      this.container.innerHTML = list.map((q, i) => this.cardHTML(q, i, total)).join('');
      this.container.querySelectorAll('.question-card').forEach((card) => this.bindCard(card));
      this.restoreInputs();
      global.Guide?.renderMath(this.container);
      this.updateHeaderCount();
    }

    updateHeaderCount() {
      const full = document.getElementById('btnModeFull');
      const quick = document.getElementById('btnModeQuick');
      const nq = this.questions.filter((x) => x.quick).length || Math.min(5, this.questions.length);
      if (full) full.textContent = `Taller completo (${this.questions.length} retos)`;
      if (quick) quick.textContent = `Modo rápido (${nq} retos)`;
    }

    cardHTML(q, i, total) {
      const bloom = q.bloom ? `<span class="bloom-tag">${q.bloom}</span>` : '';
      return `
      <article class="question-card" id="qcard_${q.id}" data-qid="${q.id}" data-type="${q.type}">
        <div class="question-meta-row">
          <span class="question-badge">Problema ${i + 1} de ${total} • ${q.badge || this.typeLabel(q.type)}</span>
          <span class="question-topic">${q.topic || ''} ${bloom}</span>
        </div>
        <div class="question-text">${q.question}</div>
        ${this.inputHTML(q)}
        <div class="question-feedback" role="status" aria-live="polite"></div>
        <div class="question-tools">
          ${q.hint ? `<button type="button" class="btn-solution-toggle" data-toggle="hint"><i class="fas fa-key"></i> Pista</button>` : ''}
          ${q.solution ? `<button type="button" class="btn-solution-toggle" data-toggle="sol"><i class="fas fa-lightbulb"></i> Ver procedimiento paso a paso</button>` : ''}
        </div>
        ${q.hint ? `<div class="hint-box" data-box="hint"><i class="fas fa-key"></i> ${q.hint}</div>` : ''}
        ${q.solution ? `<div class="solution-details-box" data-box="sol">${this.solutionHTML(q)}</div>` : ''}
      </article>`;
    }

    typeLabel(t) {
      return { numeric: 'Cálculo numérico', choice: 'Selección única', multi: 'Selección múltiple',
        truefalse: 'Verdadero o falso', match: 'Emparejamiento', text: 'Respuesta corta',
        open: 'Argumentación (cuaderno)' }[t] || 'Reto';
    }

    inputHTML(q) {
      const id = q.id;
      switch (q.type) {
        case 'numeric':
          return `<div class="calc-input-row">
            <label for="q_input_${id}">Tu resultado:</label>
            <input type="text" inputmode="decimal" id="q_input_${id}" class="calc-input-field" placeholder="Ej: 12.5" autocomplete="off">
            <span class="calc-unit-tag">${q.unit || ''}</span>
            <button type="button" class="btn-action btn-secondary btn-check" data-check><i class="fas fa-check"></i> Verificar</button>
          </div>`;
        case 'choice':
        case 'multi': {
          const order = q.shuffle === false ? q.options.map((_, k) => k) : seededShuffle(q.options.length, `${G().id}-${id}`);
          const kind = q.type === 'choice' ? 'radio' : 'checkbox';
          return `<div class="options-grid" role="${kind === 'radio' ? 'radiogroup' : 'group'}">
            ${order.map((orig, pos) => `
              <label class="option-item" data-orig="${orig}">
                <input type="${kind}" name="opt_${id}" value="${orig}">
                <span class="option-letter">${LETTERS[pos]}</span>
                <span class="option-text">${q.options[orig]}</span>
              </label>`).join('')}
          </div>
          ${q.type === 'multi' ? '<button type="button" class="btn-action btn-secondary btn-check" data-check><i class="fas fa-check"></i> Verificar selección</button>' : ''}`;
        }
        case 'truefalse':
          return `<div class="options-grid tf-grid" role="radiogroup">
            <label class="option-item" data-orig="true"><input type="radio" name="opt_${id}" value="true"><span class="option-letter">V</span><span class="option-text">Verdadero</span></label>
            <label class="option-item" data-orig="false"><input type="radio" name="opt_${id}" value="false"><span class="option-letter">F</span><span class="option-text">Falso</span></label>
          </div>`;
        case 'match': {
          const right = seededShuffle(q.pairs.length, `${G().id}-${id}-m`).map((k) => q.pairs[k][1]);
          return `<div class="match-grid">
            ${q.pairs.map((p, k) => `
              <div class="match-row">
                <span class="match-left">${p[0]}</span>
                <i class="fas fa-arrow-right-long" aria-hidden="true"></i>
                <select class="form-control match-select" data-row="${k}">
                  <option value="">— Selecciona —</option>
                  ${right.map((r) => `<option value="${encodeURIComponent(r)}">${r.replace(/<[^>]+>/g, '')}</option>`).join('')}
                </select>
              </div>`).join('')}
          </div>
          <button type="button" class="btn-action btn-secondary btn-check" data-check><i class="fas fa-check"></i> Verificar emparejamiento</button>`;
        }
        case 'text':
          return `<div class="calc-input-row">
            <input type="text" id="q_input_${id}" class="calc-input-field wide" placeholder="Escribe tu respuesta" autocomplete="off">
            <button type="button" class="btn-action btn-secondary btn-check" data-check><i class="fas fa-check"></i> Verificar</button>
          </div>`;
        case 'open':
          return `<div class="open-answer">
            <textarea id="q_input_${id}" class="form-control" rows="3" placeholder="Escribe un borrador aquí y luego transcríbelo en tu cuaderno..."></textarea>
            ${q.rubric ? `<p class="open-rubric"><i class="fas fa-clipboard-list"></i> <strong>Criterio de evaluación docente:</strong> ${q.rubric}</p>` : ''}
          </div>`;
        default:
          return `<p class="sim-error">Tipo de pregunta desconocido: ${q.type}</p>`;
      }
    }

    solutionHTML(q) {
      const s = q.solution;
      const steps = s.steps || [
        { label: '1. Datos e incógnita', html: s.datos },
        { label: '2. Modelo / ecuación fundamental', html: s.formula },
        { label: '3. Despeje y sustitución', html: s.despeje },
        { label: '4. Cálculo', html: s.calculo },
        { label: '5. Interpretación', html: s.conclusion, cls: 'sol-conclusion' }
      ].filter((st) => st.html);
      return `<strong><i class="fas fa-check-circle"></i> Procedimiento analítico paso a paso</strong>
        ${steps.map((st) => `<div class="sol-step ${st.cls || ''}"><span class="sol-label">${st.label}:</span> ${st.html}</div>`).join('')}
        ${G().notebookMandate !== false ? `<div class="notebook-note"><i class="fas fa-pen-fancy"></i> <strong>Mandato del docente:</strong> transcribe este procedimiento completo y legible en tu cuaderno.</div>` : ''}`;
    }

    /* ------------------------------ Eventos ------------------------------ */
    bindCard(card) {
      const q = this.questions.find((x) => String(x.id) === card.dataset.qid);
      card.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
        card.querySelector(`[data-box="${b.dataset.toggle}"]`)?.classList.toggle('active');
      }));
      card.querySelector('[data-check]')?.addEventListener('click', () => this.check(q, card, true));
      const enter = card.querySelector('.calc-input-field');
      enter?.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.check(q, card, true); });
      if (q.type === 'choice' || q.type === 'truefalse') {
        card.querySelectorAll('input[type=radio]').forEach((r) => r.addEventListener('change', () => this.check(q, card, true)));
      }
      if (q.type === 'open') {
        card.querySelector('textarea')?.addEventListener('input', (e) => { this.answers[q.id] = e.target.value; this.save(); });
      }
      card.querySelectorAll('.option-item input').forEach((inp) => inp.addEventListener('change', () => {
        card.querySelectorAll('.option-item').forEach((o) => o.classList.toggle('selected', o.querySelector('input').checked));
      }));
    }

    readAnswer(q, card) {
      switch (q.type) {
        case 'numeric': case 'text': return card.querySelector('.calc-input-field')?.value ?? '';
        case 'choice': { const c = card.querySelector('input:checked'); return c ? +c.value : null; }
        case 'truefalse': { const c = card.querySelector('input:checked'); return c ? c.value === 'true' : null; }
        case 'multi': return [...card.querySelectorAll('input:checked')].map((c) => +c.value).sort();
        case 'match': return [...card.querySelectorAll('.match-select')].map((s) => decodeURIComponent(s.value));
        case 'open': return card.querySelector('textarea')?.value ?? '';
        default: return null;
      }
    }

    /* Devuelve true | false | null (sin responder / no calificable). */
    evaluate(q, a) {
      switch (q.type) {
        case 'numeric': {
          const x = parseNum(a);
          if (!Number.isFinite(x)) return null;
          const tol = Math.max((q.tolRel ?? G().defaultTolRel ?? 0.02) * Math.abs(q.answer), q.tolAbs ?? 0, 1e-12);
          return Math.abs(x - q.answer) <= tol;
        }
        case 'choice': return a === null ? null : a === q.correct;
        case 'truefalse': return a === null ? null : a === q.answer;
        case 'multi': {
          if (!a || !a.length) return null;
          const c = [...q.correct].sort();
          return a.length === c.length && a.every((v, k) => v === c[k]);
        }
        case 'match':
          if (!a || a.some((v) => !v)) return null;
          return a.every((v, k) => v === q.pairs[k][1]);
        case 'text': {
          if (!String(a).trim()) return null;
          return (q.answers || []).some((r) => normalize(r) === normalize(a));
        }
        default: return null;
      }
    }

    check(q, card, showFeedback) {
      const a = this.readAnswer(q, card);
      this.answers[q.id] = a; this.save();
      const ok = this.evaluate(q, a);
      card.classList.remove('status-correct', 'status-incorrect');
      card.querySelectorAll('.option-item').forEach((o) => o.classList.remove('is-right', 'is-wrong'));
      const fb = card.querySelector('.question-feedback');
      if (ok === null) {
        if (showFeedback && fb) fb.innerHTML = '<span class="fb-neutral"><i class="fas fa-circle-info"></i> Responde antes de verificar (usa punto o coma decimal).</span>';
        return null;
      }
      card.classList.add(ok ? 'status-correct' : 'status-incorrect');
      if (showFeedback && fb) {
        let msg = ok
          ? (q.feedbackOk || '¡Correcto! Excelente razonamiento.')
          : (q.feedbackBad || 'Aún no. Revisa el modelo, las unidades y los signos; usa la pista si la necesitas.');
        if (!ok && (q.type === 'choice') && q.feedback && q.feedback[a] !== undefined) msg = q.feedback[a];
        if (!ok && q.type === 'numeric') {
          const x = parseNum(a);
          const r = x / q.answer;
          if (Number.isFinite(r) && [10, 100, 1000, 0.1, 0.01, 0.001].some((f) => Math.abs(r / f - 1) < 0.03)) {
            msg += ' <em>Pista: tu resultado difiere en una potencia de 10; revisa las conversiones de unidades.</em>';
          } else if (Number.isFinite(r) && Math.abs(r + 1) < 0.03) {
            msg += ' <em>Pista: el valor es correcto pero el signo no.</em>';
          }
        }
        fb.innerHTML = `<span class="${ok ? 'fb-ok' : 'fb-bad'}"><i class="fas ${ok ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> ${msg}</span>`;
        global.Guide?.renderMath(fb);
      }
      return ok;
    }

    gradeAll() {
      const list = this.active;
      let correct = 0, gradable = 0, answered = 0;
      const detail = [];
      list.forEach((q, i) => {
        const card = document.getElementById(`qcard_${q.id}`);
        if (q.type === 'open') { detail.push({ n: i + 1, topic: q.topic, status: 'docente' }); return; }
        gradable++;
        const ok = card ? this.check(q, card, true) : this.evaluate(q, this.answers[q.id]);
        if (ok !== null) answered++;
        if (ok) correct++;
        detail.push({ n: i + 1, topic: q.topic, status: ok === null ? 'sin responder' : ok ? 'correcta' : 'incorrecta' });
      });
      const f = gradable ? correct / gradable : 0;
      const score = Math.round((1 + 4 * f) * 10) / 10;
      const level = LEVELS().find((l) => score >= l.min - 1e-9)?.name || 'BAJO';
      return { correctCount: correct, totalCount: gradable, answered, score: score.toFixed(1),
        scoreNum: score, percentage: Math.round(f * 100), level, detail };
    }

    /* ------------------------------ Estado ------------------------------ */
    save() { try { localStorage.setItem(this.key, JSON.stringify({ answers: this.answers, mode: this.mode })); } catch (e) {} }
    load() {
      try {
        const s = JSON.parse(localStorage.getItem(this.key) || '{}');
        this.answers = s.answers || {}; this.mode = s.mode || 'full';
      } catch (e) { this.answers = {}; }
    }
    restoreInputs() {
      Object.entries(this.answers).forEach(([id, a]) => {
        const q = this.questions.find((x) => String(x.id) === id);
        const card = document.getElementById(`qcard_${id}`);
        if (!q || !card || a === null || a === undefined) return;
        if (['numeric', 'text', 'open'].includes(q.type)) {
          const el = card.querySelector('.calc-input-field, textarea'); if (el) el.value = a;
        } else if (q.type === 'choice' || q.type === 'truefalse') {
          const el = card.querySelector(`input[value="${a}"]`); if (el) el.checked = true;
        } else if (q.type === 'multi') {
          (a || []).forEach((v) => { const el = card.querySelector(`input[value="${v}"]`); if (el) el.checked = true; });
        } else if (q.type === 'match') {
          card.querySelectorAll('.match-select').forEach((s, k) => { if (a[k]) s.value = encodeURIComponent(a[k]); });
        }
        card.querySelectorAll('.option-item').forEach((o) => o.classList.toggle('selected', !!o.querySelector('input')?.checked));
        if (q.type !== 'open' && String(a).length) this.check(q, card, false);
      });
    }
    reset() { this.answers = {}; this.save(); this.render(); }

    setMode(mode) {
      this.mode = mode; this.save(); this.render();
      document.getElementById('btnModeFull')?.classList.toggle('active', mode === 'full');
      document.getElementById('btnModeQuick')?.classList.toggle('active', mode === 'quick');
    }

    static init() {
      const c = document.getElementById('quizQuestionsContainer');
      if (!c) return null;
      const w = new Workshop(c);
      global.quizInstance = w;
      document.getElementById('btnModeFull')?.addEventListener('click', () => w.setMode('full'));
      document.getElementById('btnModeQuick')?.addEventListener('click', () => w.setMode('quick'));
      document.getElementById('btnResetQuiz')?.addEventListener('click', () => {
        if (confirm('¿Borrar todas tus respuestas del taller?')) w.reset();
      });
      w.setMode(w.mode);
      return w;
    }
  }

  global.Workshop = Workshop;
  global.WorkshopUtils = { parseNum, normalize, seededShuffle };
})(window);
