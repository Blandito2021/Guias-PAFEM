/* ==========================================================================
   CORE — Orquestador genérico de la guía (NO editar por guía)
   Lee window.GUIDE (guide-config.js) y las secciones <section class="sheet-page">
   para GENERAR automáticamente:
     · barra superior (marca, pestañas, temas, PDF, progreso)
     · encabezado de cada hoja  (data-badge, data-title, data-subtitle, data-tag, data-tag-sub)
     · pie de página "Página n de N" y controles Anterior / Siguiente
     · modales (reporte de entrega y visor de figuras)
   Además: temas visuales, perfil del estudiante, KaTeX, impresión carta,
   reporte de resultados y Guide.audit() para control de calidad.
   ========================================================================== */

(function (global) {
  'use strict';

  const THEMES = [
    { id: 'theme-dark', label: '🌙 Oscuro clásico', dot: '#090d16' },
    { id: 'theme-light', label: '☀️ Claro universitario', dot: '#ffffff' },
    { id: 'theme-glassmorphism', label: '🧊 Vidriomorfismo', dot: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
    { id: 'theme-neumorphism', label: '🔘 Neomorfismo suave', dot: '#e2e8f0' },
    { id: 'theme-bentogrid', label: '🍱 Bento cyber (oscuro)', dot: 'linear-gradient(135deg,#818cf8,#a855f7)' },
    { id: 'theme-minimalism', label: '📐 Minimalismo suizo', dot: '#ffffff' },
    { id: 'theme-neobrutalism', label: '⚡ Neo-brutalismo pop', dot: '#fde047' }
  ];

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const Guide = {
    cfg: {},
    sheets: [],
    key(k) { return `${this.cfg.id || 'guia'}_${k}`; },

    init() {
      this.cfg = Object.assign({
        id: 'guia', title: 'Guía-taller', shortTitle: '', icon: 'fa-atom', subject: '',
        teacher: '', teacherRole: '', institutions: [], grades: ['10°', '11°'],
        footer: null, defaultTheme: 'theme-dark', questions: []
      }, global.GUIDE || {});
      this.sheets = $$('.sheet-page');

      this.buildNavbar();
      this.buildSheetChrome();
      this.buildModals();
      this.initThemes();
      this.initNavigation();
      this.initProfile();
      this.initLightbox();
      this.initSubmission();
      this.initProgress();
      this.initPrint();

      global.SimKit?.initAll();
      global.Workshop?.init();
      this.renderMath(document.body);
      document.body.classList.add('guide-ready');

      if (new URLSearchParams(location.search).has('audit')) {
        const whenLoaded = (fn) => (document.readyState === 'complete' ? fn() : addEventListener('load', fn, { once: true }));
        $$('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
        whenLoaded(() => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(() => {
          const res = JSON.stringify(this.audit());
          console.log('GUIDE_AUDIT', res);
          const el = document.createElement('script');
          el.type = 'application/json'; el.id = 'guide-audit-result'; el.textContent = res;
          document.body.appendChild(el);
        }, 1200)));
      }
    },

    /* --------------------------- Barra superior --------------------------- */
    buildNavbar() {
      if ($('.top-navbar')) return;
      const c = this.cfg;
      const tabs = this.sheets.map((s, i) => `
        <button type="button" class="nav-tab-btn${i === 0 ? ' active' : ''}" data-page="${s.id}">
          <span class="badge-num">${i + 1}</span> ${esc(s.dataset.nav || `Hoja ${i + 1}`)}
        </button>`).join('');
      const themeBtns = THEMES.map((t) => `
        <button type="button" class="theme-option-btn" data-set-theme="${t.id}" role="menuitemradio">
          <span class="theme-preview-dot" style="background:${t.dot}"></span><span>${t.label}</span>
        </button>`).join('');
      document.body.insertAdjacentHTML('afterbegin', `
      <header class="top-navbar" role="banner">
        <div class="brand-section">
          <div class="brand-icon" aria-hidden="true"><i class="fas ${esc(c.icon)}"></i></div>
          <div class="brand-text">
            <h1>${esc(c.brand || c.title)}</h1>
            <p>${esc([c.teacher, c.teacherRole].filter(Boolean).join(' — '))}</p>
          </div>
        </div>
        <nav class="nav-pages" aria-label="Hojas de la guía">${tabs}</nav>
        <div class="navbar-actions">
          <div class="theme-selector-dropdown">
            <button type="button" class="btn-theme-selector" id="btnThemeMenu" aria-haspopup="true" aria-expanded="false" title="Cambiar estilo visual">
              <i class="fas fa-palette"></i> <span>Estilos (${THEMES.length})</span> <i class="fas fa-chevron-down caret"></i>
            </button>
            <div class="theme-dropdown-menu" id="themeMenuPopover" role="menu">
              <div class="theme-menu-header"><span>Seleccionar estilo</span><i class="fas fa-paint-brush"></i></div>
              ${themeBtns}
            </div>
          </div>
          <button type="button" class="btn-action btn-pdf" data-export-pdf title="Imprimir o guardar como PDF tamaño carta">
            <i class="fas fa-file-pdf"></i> <span>Exportar PDF</span>
          </button>
        </div>
        <div class="nav-progress-container" aria-hidden="true"><div class="nav-progress-bar" id="navProgressBar"></div></div>
      </header>`);
      document.body.insertAdjacentHTML('beforeend', `
        <button type="button" class="btn-floating-top" id="btnBackToTop" aria-label="Volver arriba"><i class="fas fa-arrow-up"></i></button>`);
    },

    /* --------------------- Encabezado, pie y navegación --------------------- */
    buildSheetChrome() {
      const N = this.sheets.length;
      const footerText = this.cfg.footer || [this.cfg.teacher, this.cfg.teacherRole].filter(Boolean).join(' — ');
      this.sheets.forEach((s, i) => {
        if (!s.id) s.id = `sheet-${i + 1}`;
        const d = s.dataset;
        if (d.title && !$(':scope > .sheet-header', s)) {
          s.insertAdjacentHTML('afterbegin', `
          <header class="sheet-header">
            <div class="sheet-header-left">
              <div class="logo-badge">${esc(d.badge || 'GUÍA')}</div>
              <div class="sheet-title-group">
                <h2>${d.title}</h2>
                ${d.subtitle ? `<p>${d.subtitle}</p>` : ''}
              </div>
            </div>
            <div class="sheet-header-right">
              <strong>${esc(d.tag || '')}</strong>
              <span>${esc(d.tagSub || '')}</span>
            </div>
          </header>`);
        }
        const body = $(':scope > .sheet-body', s) || s;
        if (d.noNav === undefined && !$('.sheet-nav-controls', s)) {
          const prev = this.sheets[i - 1], next = this.sheets[i + 1];
          body.insertAdjacentHTML('beforeend', `
          <div class="sheet-nav-controls">
            ${prev ? `<button type="button" class="btn-nav-step" data-nav-target="${prev.id || `sheet-${i}`}"><i class="fas fa-arrow-left"></i> ${esc(prev.dataset.nav || 'Anterior')}</button>` : '<span></span>'}
            <span class="sheet-nav-status">Sección ${i + 1} de ${N}</span>
            ${next ? `<button type="button" class="btn-nav-step primary" data-nav-target="${next.id || `sheet-${i + 2}`}">${esc(next.dataset.nav || 'Siguiente')} <i class="fas fa-arrow-right"></i></button>`
              : `<button type="button" class="btn-nav-step primary" data-nav-target="${this.sheets[0].id || 'sheet-1'}"><i class="fas fa-home"></i> Volver a la portada</button>`}
          </div>`);
        }
        if (!$(':scope > .sheet-footer', s)) {
          s.insertAdjacentHTML('beforeend', `
          <footer class="sheet-footer">
            <div class="footer-coordinator"><i class="fas fa-user-tie"></i> ${esc(footerText)}</div>
            <div class="footer-page-num">Página ${i + 1} de ${N}</div>
          </footer>`);
        } else {
          const pn = $('.footer-page-num', s); if (pn) pn.textContent = `Página ${i + 1} de ${N}`;
        }
      });
    },

    buildModals() {
      if ($('#modalSubmission')) return;
      document.body.insertAdjacentHTML('beforeend', `
      <aside class="modal-backdrop" id="modalSubmission" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-window">
          <div class="modal-header">
            <h3 id="modalTitle"><i class="fas fa-clipboard-check"></i> Reporte oficial de entrega</h3>
            <button type="button" class="modal-close" data-close aria-label="Cerrar">&times;</button>
          </div>
          <div class="report-score-row" id="reportScoreRow"></div>
          <pre class="report-preview-box" id="reportPreviewText"></pre>
          <div class="modal-actions">
            <button type="button" class="btn-action btn-secondary" id="btnDownloadTxt"><i class="fas fa-download"></i> Descargar (.txt)</button>
            <button type="button" class="btn-action btn-primary" id="btnCopyReport"><i class="fas fa-copy"></i> Copiar para WhatsApp / correo</button>
          </div>
        </div>
      </aside>
      <aside class="lightbox-modal" id="imageLightboxModal" role="dialog" aria-modal="true" aria-label="Figura ampliada">
        <div class="lightbox-content">
          <button type="button" class="lightbox-close-btn" data-close title="Cerrar">&times;</button>
          <img id="lightboxImg" src="" alt="">
          <div class="lightbox-footer"><span id="lightboxCaption"></span></div>
        </div>
      </aside>
      <div class="toast" id="guideToast" role="status" aria-live="polite"></div>`);
      $$('.modal-backdrop, .lightbox-modal').forEach((m) => {
        m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('active'); });
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') $$('.modal-backdrop.active, .lightbox-modal.active').forEach((m) => m.classList.remove('active'));
      });
    },

    toast(msg, ms = 2600) {
      const t = $('#guideToast'); if (!t) return;
      t.innerHTML = msg; t.classList.add('show');
      clearTimeout(this._toastT); this._toastT = setTimeout(() => t.classList.remove('show'), ms);
    },

    /* ------------------------------- Temas ------------------------------- */
    initThemes() {
      const btn = $('#btnThemeMenu'), menu = $('#themeMenuPopover');
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.classList.toggle('active');
        btn.setAttribute('aria-expanded', open);
      });
      document.addEventListener('click', () => { menu?.classList.remove('active'); btn?.setAttribute('aria-expanded', 'false'); });
      $$('.theme-option-btn').forEach((b) => b.addEventListener('click', () => this.applyTheme(b.dataset.setTheme)));
      let saved = null;
      try { saved = localStorage.getItem(this.key('theme')); } catch (e) {}
      this.applyTheme(saved || this.cfg.defaultTheme, false);
    },

    applyTheme(theme, refresh = true) {
      if (!THEMES.some((t) => t.id === theme)) theme = 'theme-dark';
      THEMES.forEach((t) => document.body.classList.remove(t.id));
      document.body.classList.add(theme);
      $$('.theme-option-btn').forEach((b) => b.classList.toggle('active', b.dataset.setTheme === theme));
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.content = getComputedStyle(document.body).getPropertyValue('--app-bg-solid').trim() || '#0a0f1d';
      try { localStorage.setItem(this.key('theme'), theme); } catch (e) {}
      if (refresh) requestAnimationFrame(() => global.SimKit?.refreshAll());
    },

    /* ----------------------------- Navegación ----------------------------- */
    goTo(id) {
      const el = document.getElementById(id); if (!el) return;
      const nav = $('.top-navbar')?.offsetHeight || 60;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - nav - 10, behavior: 'smooth' });
    },

    initNavigation() {
      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-nav-target], .nav-tab-btn[data-page]');
        if (t) this.goTo(t.dataset.navTarget || t.dataset.page);
      });
      const tabs = $$('.nav-tab-btn');
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          tabs.forEach((t) => t.classList.toggle('active', t.dataset.page === en.target.id));
          const active = tabs.find((t) => t.dataset.page === en.target.id);
          active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      this.sheets.forEach((s) => io.observe(s));
    },

    /* --------------------------- Perfil estudiante --------------------------- */
    initProfile() {
      const name = $('#inputStudentName'), school = $('#selectSchool'), custom = $('#inputCustomSchool'),
        customWrap = $('#customSchoolWrapper'), grade = $('#selectGrade'), group = $('#inputGroup'), date = $('#inputDate');
      if (school && !school.options.length) {
        school.innerHTML = this.cfg.institutions.map((x) => `<option value="${esc(x)}">${esc(x)}</option>`).join('')
          + '<option value="Otra">Otra institución…</option>';
      }
      if (grade && !grade.options.length) {
        grade.innerHTML = this.cfg.grades.map((g) => `<option value="${esc(g)}">${esc(g)}</option>`).join('');
      }
      if (date) date.value = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });

      const read = () => ({
        name: name?.value.trim() || '',
        school: school?.value === 'Otra' ? (custom?.value.trim() || 'Otra') : (school?.value || ''),
        grade: grade?.value || '', group: group?.value || '', date: date?.value || ''
      });
      const show = (p) => {
        const el = $('#summaryStudentInfo');
        if (el) el.innerHTML = `<strong><i class="fas fa-user-graduate"></i> Estudiante:</strong> ${esc(p.name || 'Sin registrar')} ·
          <strong>Institución:</strong> ${esc(p.school || '—')} · <strong>Grado:</strong> ${esc(p.grade)} ${p.group ? `(${esc(p.group)})` : ''} ·
          <strong>Fecha:</strong> ${esc(p.date)}`;
      };
      const save = () => {
        if (customWrap) customWrap.style.display = school?.value === 'Otra' ? '' : 'none';
        const p = read();
        try { localStorage.setItem(this.key('profile'), JSON.stringify(p)); } catch (e) {}
        show(p);
      };
      try {
        const p = JSON.parse(localStorage.getItem(this.key('profile')) || 'null');
        if (p) {
          if (name) name.value = p.name || '';
          if (school) {
            if ([...school.options].some((o) => o.value === p.school)) school.value = p.school;
            else if (p.school) { school.value = 'Otra'; if (custom) custom.value = p.school; }
          }
          if (grade && p.grade) grade.value = p.grade;
          if (group && p.group) group.value = p.group;
        }
      } catch (e) {}
      [name, school, custom, grade, group].forEach((el) => el?.addEventListener('input', save));
      school?.addEventListener('change', save);
      save();
      this.profile = read;

      $('#btnValidateData')?.addEventListener('click', () => {
        const p = read();
        if (!p.name) { name?.focus(); name?.classList.add('is-invalid'); this.toast('<i class="fas fa-triangle-exclamation"></i> Escribe tu nombre completo.'); }
        else { name?.classList.remove('is-invalid'); this.toast(`<i class="fas fa-circle-check"></i> ¡Bienvenido(a), ${esc(p.name)}! Datos registrados.`); }
      });
      $('#btnStartGuide')?.addEventListener('click', () => this.sheets[1] && this.goTo(this.sheets[1].id));
    },

    /* ------------------------------- Lightbox ------------------------------- */
    initLightbox() {
      const modal = $('#imageLightboxModal'), img = $('#lightboxImg'), cap = $('#lightboxCaption');
      document.addEventListener('click', (e) => {
        const target = e.target.closest('.figure-img-wrapper, .cover-image-container');
        if (!target) return;
        const im = $('img', target); if (!im) return;
        img.src = im.currentSrc || im.src; img.alt = im.alt;
        cap.textContent = target.closest('.scientific-figure-card')?.querySelector('.figure-caption')?.innerText || im.alt;
        modal.classList.add('active');
      });
    },

    /* ------------------------ Reporte y exportación ------------------------ */
    initSubmission() {
      $$('[data-export-pdf], #btnExportPdfMain, #btnExportPdfTop').forEach((b) => b.addEventListener('click', () => this.print()));
      const modal = $('#modalSubmission'), pre = $('#reportPreviewText');
      $('#btnSubmitResults')?.addEventListener('click', () => {
        const r = global.quizInstance ? global.quizInstance.gradeAll() : null;
        pre.textContent = this.report(r);
        const row = $('#reportScoreRow');
        if (row && r) row.innerHTML = `<div class="score-chip lvl-${r.level.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}">
          <span class="score-num">${r.score}</span><span class="score-lvl">${r.level}</span></div>
          <div class="score-meta">${r.correctCount} de ${r.totalCount} retos correctos · ${r.percentage}% de logro${r.answered < r.totalCount ? ` · <strong>${r.totalCount - r.answered} sin responder</strong>` : ''}</div>`;
        modal.classList.add('active');
      });
      $('#btnCopyReport')?.addEventListener('click', () => {
        const txt = pre.textContent;
        (navigator.clipboard?.writeText(txt) || Promise.reject()).then(
          () => this.toast('<i class="fas fa-copy"></i> Reporte copiado. ¡Pégalo en WhatsApp o en el correo!'),
          () => { const r = document.createRange(); r.selectNodeContents(pre); getSelection().removeAllRanges(); getSelection().addRange(r); this.toast('Selecciona y copia el texto manualmente (Ctrl+C).'); });
      });
      $('#btnDownloadTxt')?.addEventListener('click', () => {
        const p = this.profile ? this.profile() : {};
        const blob = new Blob([pre.textContent], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Reporte_${(this.cfg.id || 'guia')}_${(p.name || 'estudiante').replace(/\s+/g, '_')}.txt`;
        a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      });
    },

    report(r) {
      const p = this.profile ? this.profile() : {};
      const c = this.cfg;
      const line = '='.repeat(58), thin = '-'.repeat(58);
      let t = `${line}\nREPORTE OFICIAL: ${c.title.toUpperCase()}\n`;
      if (c.program) t += `${c.program}\n`;
      if (c.teacher) t += `Docente: ${c.teacher}${c.teacherRole ? ' — ' + c.teacherRole : ''}\n`;
      t += `${line}\n\nESTUDIANTE: ${p.name || 'Sin nombre registrado'}\nINSTITUCIÓN: ${p.school || '—'}\n`;
      t += `GRADO/GRUPO: ${p.grade || '—'} ${p.group ? '- Grupo ' + p.group : ''}\nFECHA: ${p.date || new Date().toLocaleDateString('es-CO')}\n\n${thin}\n`;
      if (r) {
        t += `DESEMPEÑO EN EL TALLER (modo ${global.quizInstance?.mode === 'quick' ? 'rápido' : 'completo'})\n`;
        t += `Retos correctos: ${r.correctCount} / ${r.totalCount}  (${r.percentage}%)\n`;
        t += `Calificación (escala 1.0 – 5.0): ${r.score}\nNivel de desempeño: ${r.level}\n${thin}\n`;
        r.detail.forEach((d) => { t += `  ${String(d.n).padStart(2)}. [${d.status.toUpperCase()}] ${d.topic || ''}\n`; });
        t += `${thin}\n\n`;
      }
      if (c.notebookMandate !== false) {
        t += 'COMPROMISO ACADÉMICO:\nDeclaro que transcribí de puño y letra en mi cuaderno todo el\ndesarrollo conceptual, diagramas y procedimientos de esta guía.\n\n';
      }
      t += `Firma del estudiante: ______________________________\n`;
      if (c.teacher) t += `Vo.Bo. docente: ${c.teacher}\n`;
      return t;
    },

    /* --------------------------- Progreso y arriba --------------------------- */
    initProgress() {
      const bar = $('#navProgressBar'), top = $('#btnBackToTop');
      const onScroll = () => {
        const h = document.documentElement.scrollHeight - innerHeight;
        if (bar) bar.style.width = `${h > 0 ? (scrollY / h) * 100 : 0}%`;
        top?.classList.toggle('show', scrollY > 500);
      };
      addEventListener('scroll', onScroll, { passive: true }); onScroll();
      top?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));
    },

    /* ------------------------------ Impresión ------------------------------ */
    /* Mide cada hoja con la geometría de impresión (8.5 in de ancho) y calcula
       un zoom ≥ minZoom para que quepa en una carta; si no cabe, fluye. */
    measureSheets(apply = false) {
      const minZoom = this.cfg.printMinZoom ?? 0.82;
      const wasPrinting = document.body.classList.contains('is-printing');
      document.body.classList.add('is-printing', 'print-measure');
      const out = this.sheets.map((s) => {
        s.style.removeProperty('--pz');
        const hIn = s.scrollHeight / 96;
        let z = 1;
        if (hIn > 10.9 && 10.9 / hIn >= minZoom) z = Math.max(minZoom, Math.floor((10.8 / hIn) * 100) / 100);
        if (apply && z < 1) s.style.setProperty('--pz', z);
        return { id: s.id, inches: +hIn.toFixed(2), zoom: z, pages: z < 1 || hIn <= 11.05 ? 1 : Math.ceil(hIn / 11) };
      });
      document.body.classList.remove('print-measure');
      if (!wasPrinting) document.body.classList.remove('is-printing');
      return out;
    },

    initPrint() {
      const before = () => {
        document.body.classList.add('is-printing');
        if (this.cfg.printFit !== false) this.measureSheets(true);
        $$('.solution-details-box, .hint-box').forEach((b) => b.classList.toggle('print-open', !!this.cfg.printSolutions));
        global.SimKit?.refreshAll();
      };
      const after = () => {
        document.body.classList.remove('is-printing');
        this.sheets.forEach((s) => s.style.removeProperty('--pz'));
        global.SimKit?.refreshAll();
      };
      addEventListener('beforeprint', before);
      addEventListener('afterprint', after);
      const q = new URLSearchParams(location.search);
      if (q.has('solutions')) this.cfg.printSolutions = true;
      if (q.has('print')) {
        // Medir solo cuando imágenes, fuentes y KaTeX ya ocupan su tamaño final
        $$('img[loading="lazy"]').forEach((im) => { im.loading = 'eager'; });
        const ready = () => (document.fonts?.ready || Promise.resolve()).then(() => setTimeout(before, 250));
        if (document.readyState === 'complete') ready(); else addEventListener('load', ready, { once: true });
      }
    },
    print() { setTimeout(() => window.print(), 60); },

    /* -------------------------------- KaTeX -------------------------------- */
    renderMath(el) {
      if (!el) return;
      const go = () => global.renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true }, { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false }
          // '$...$' NO es delimitador: los precios ("$5000") se romperían. Usa \( ... \).
        ],
        ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code', 'option'],
        throwOnError: false
      });
      if (typeof global.renderMathInElement === 'function') go();
      else addEventListener('load', () => typeof global.renderMathInElement === 'function' && go(), { once: true });
    },

    /* ------------------------- Auditoría de calidad ------------------------- */
    audit() {
      const issues = [];
      const add = (sev, where, msg) => issues.push({ sev, where, msg });
      $$('img[src]:not(#lightboxImg)').forEach((im) => {
        if (!im.getAttribute('src')) return;
        if (im.loading === 'lazy' && !im.complete) return; // aún no visible: no es un error
        if (!im.complete || im.naturalWidth === 0) add('ERROR', im.getAttribute('src'), 'Imagen rota o no cargada');
        if (!im.alt || im.alt.length < 8) add('WARN', im.getAttribute('src'), 'Texto alternativo ausente o pobre');
        if (getComputedStyle(im).objectFit === 'cover' && im.closest('.scientific-figure-card')) add('ERROR', im.getAttribute('src'), 'object-fit: cover recorta una figura científica');
      });
      $$('.katex-error').forEach((k) => add('ERROR', k.closest('[id]')?.id || 'katex', `KaTeX: ${k.getAttribute('title') || k.textContent.slice(0, 60)}`));
      $$('.sheet-page').forEach((s) => {
        const txt = s.innerText;
        const m = txt.match(/\$[^$\n]{1,80}\$/); if (m) add('WARN', s.id, `Posible fórmula sin renderizar: ${m[0]}`);
        if (/\{\{|\bTODO\b|PLACEHOLDER|Lorem ipsum/.test(s.innerHTML)) add('ERROR', s.id, 'Quedan marcadores de plantilla ({{...}}, TODO o Lorem)');
      });
      const ids = {};
      $$('[id]').forEach((e) => { if (ids[e.id]) add('ERROR', e.id, 'id duplicado'); ids[e.id] = 1; });
      $$('canvas[data-sim]').forEach((c) => { if (!global.SimKit?.get(c.id)) add('ERROR', c.id, 'Simulador no inicializado'); });
      // Ajuste a carta (11 in): zoom automático hasta printMinZoom; si no alcanza, fluye
      const fit = this.measureSheets(false);
      fit.forEach((f) => {
        const isQuiz = !!document.getElementById(f.id)?.querySelector('#quizQuestionsContainer');
        if (f.pages > 1 && !isQuiz) add('WARN', f.id, `Mide ≈${f.inches} in en impresión: no cabe en una carta ni con zoom ${this.cfg.printMinZoom ?? 0.82}; se partirá en ${f.pages} páginas (condensa o divide la hoja)`);
      });
      global.SimKit?.refreshAll();
      (this.cfg.questions || []).forEach((q, i) => {
        if (q.type === 'numeric' && !Number.isFinite(q.answer)) add('ERROR', `pregunta ${i + 1}`, 'Respuesta numérica inválida');
        if (q.type === 'choice' && !(q.correct >= 0 && q.correct < (q.options || []).length)) add('ERROR', `pregunta ${i + 1}`, 'Índice correcto fuera de rango');
        if (!q.solution && q.type !== 'open') add('WARN', `pregunta ${i + 1}`, 'Sin solución paso a paso');
      });
      return { ok: !issues.some((x) => x.sev === 'ERROR'), sheets: this.sheets.length, printFit: fit,
        sims: $$('canvas[data-sim]').length, questions: (this.cfg.questions || []).length, issues };
    }
  };

  global.Guide = Guide;
  document.addEventListener('DOMContentLoaded', () => Guide.init());
})(window);
