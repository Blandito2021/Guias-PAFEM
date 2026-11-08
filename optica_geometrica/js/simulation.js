/* ==========================================================================
   SIMULADOR ÓPTICO MULTIMODAL CIENTÍFICO AVANZADO
   Coordinación: Luis Hernando Blandón Dávila — Coordinador de Física PAFEM
   Colegios: I.E. Diego Maya, I.E. Jaime Salazar Robledo, I.E. Hugo Ángel Mejía
   Modos de simulación física en tiempo real:
   1. 'snell': Mesa de Reflexión, Refracción & RIT (Leyes de Snell-Descartes)
   2. 'mirrors': Banco Óptico de Espejos (Plano, Cóncavo, Convexo)
   3. 'lenses': Banco Óptico de Lentes Delgadas (Convergente, Divergente)
   4. 'eye': Simulador Anatómico del Ojo Humano & Lentes Correctivas
   ========================================================================== */

class OpticalSimulator {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Modo activo
    this.currentMode = 'snell'; // 'snell' | 'mirrors' | 'lenses' | 'eye'

    // Constante universal de la velocidad de la luz en el vacío
    this.SPEED_OF_LIGHT = 299792; // km/s (c)

    // ------------------------------------------------------------------------
    // ESTADO MODO 1: LEY DE SNELL (REFLEXIÓN Y REFRACCIÓN)
    // ------------------------------------------------------------------------
    this.theta1 = 45.0; // Ángulo de incidencia (grados sexagesimales)
    this.n1 = 1.000;    // Medio 1 (superior)
    this.n2 = 1.333;    // Medio 2 (inferior)
    this.medium1Name = 'Aire';
    this.medium2Name = 'Agua';
    this.laserColor = '#ff2a4b';
    this.laserWavelength = 650; // nm
    this.showProtractor = true;
    this.showNormal = true;
    this.showAngles = true;
    this.showParticles = true;
    this.particles = [];
    this.lastFrameTime = performance.now();

    // ------------------------------------------------------------------------
    // ESTADO MODO 2: BANCO DE ESPEJOS (PLANO, CÓNCAVO, CONVEXO)
    // ------------------------------------------------------------------------
    this.mirrorType = 'concave'; // 'concave' | 'convex' | 'plane'
    this.mirrorFocalLength = 120; // px (equiv. f = 20.0 cm)
    this.mirrorObjectDist = 180;  // px (equiv. do = 30.0 cm)
    this.mirrorObjectHeight = 65; // px (equiv. ho = 10.8 cm)

    // ------------------------------------------------------------------------
    // ESTADO MODO 3: BANCO DE LENTES DELGADAS (CONVERGENTE, DIVERGENTE)
    // ------------------------------------------------------------------------
    this.lensType = 'converging'; // 'converging' | 'diverging'
    this.lensFocalLength = 120;   // px (equiv. f = 20.0 cm)
    this.lensObjectDist = 180;    // px (equiv. do = 30.0 cm)
    this.lensObjectHeight = 65;   // px (equiv. ho = 10.8 cm)

    // ------------------------------------------------------------------------
    // ESTADO MODO 4: OJO HUMANO Y LENTES CORRECTIVAS
    // ------------------------------------------------------------------------
    this.eyeCondition = 'normal'; // 'normal' | 'myopia' | 'hyperopia'
    this.eyeHasLens = false;
    this.eyeLensPower = -2.50; // Dioptrías
    this.eyeAnimationPhase = 0;

    // Estado de interacción general
    this.isDragging = false;
    this.isDraggingObject = false;

    // Inicialización del lienzo y eventos
    this.initCanvas();
    this.bindEvents();
    this.startAnimationLoop();
  }

  setMode(mode) {
    if (['snell', 'mirrors', 'lenses', 'eye'].includes(mode)) {
      this.currentMode = mode;
      this.updateUIPanels();
      this.render();
    }
  }

  resetExperiment() {
    if (this.currentMode === 'snell') {
      this.theta1 = 45.0;
      this.n1 = 1.000;
      this.n2 = 1.333;
      this.medium1Name = 'Aire';
      this.medium2Name = 'Agua';
      const sT1 = document.getElementById('sliderTheta1');
      const vT1 = document.getElementById('valTheta1');
      if (sT1) sT1.value = '45.0';
      if (vT1) vT1.textContent = '45.0°';
      const sN1 = document.getElementById('sliderN1');
      const vN1 = document.getElementById('valN1');
      if (sN1) sN1.value = '1.000';
      if (vN1) vN1.textContent = '1.000';
      const sN2 = document.getElementById('sliderN2');
      const vN2 = document.getElementById('valN2');
      if (sN2) sN2.value = '1.333';
      if (vN2) vN2.textContent = '1.333';
      const selM1 = document.getElementById('selectMedio1');
      const selM2 = document.getElementById('selectMedio2');
      if (selM1) selM1.value = '1.000';
      if (selM2) selM2.value = '1.333';
    } else if (this.currentMode === 'mirrors') {
      this.mirrorType = 'concave';
      this.mirrorObjectDist = 180;
      this.mirrorObjectHeight = 65;
      this.mirrorFocalLength = 120;
    } else if (this.currentMode === 'lenses') {
      this.lensType = 'converging';
      this.lensObjectDist = 180;
      this.lensObjectHeight = 65;
      this.lensFocalLength = 120;
    } else if (this.currentMode === 'eye') {
      this.eyeCondition = 'normal';
      this.eyeHasLens = false;
    }
    this.updateTelemetry();
    this.render();
  }

  initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.originX = this.width / 2;
    this.originY = this.height / 2;
    this.render();
  }

  /* ==========================================================================
     INTERACCIÓN TÁCTIL Y MOUSE POLIVALENTE
     ========================================================================== */
  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(e));
    window.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    window.addEventListener('mouseup', () => this.handlePointerUp());

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handlePointerDown(touch);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging) {
        e.preventDefault();
        const touch = e.touches[0];
        this.handlePointerMove(touch);
      }
    }, { passive: false });

    window.addEventListener('touchend', () => this.handlePointerUp());
  }

  handlePointerDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.currentMode === 'snell') {
      if (y < this.originY + 15) {
        this.isDragging = true;
        this.updateAngleFromPointer(x, y);
      }
    } else if (this.currentMode === 'mirrors') {
      const vx = this.width * 0.28;
      const objX = vx + this.mirrorObjectDist;
      const cy = this.originY;
      const tipY = cy - this.mirrorObjectHeight;
      const distToObj = Math.hypot(x - objX, y - tipY);
      if (distToObj < 45 || Math.abs(x - objX) < 30) {
        this.isDragging = true;
        this.isDraggingObject = true;
        this.updateMirrorObjectFromPointer(x, y);
      }
    } else if (this.currentMode === 'lenses') {
      const lx = this.width * 0.5;
      const objX = lx - this.lensObjectDist;
      const cy = this.originY;
      const tipY = cy - this.lensObjectHeight;
      const distToObj = Math.hypot(x - objX, y - tipY);
      if (distToObj < 45 || Math.abs(x - objX) < 30) {
        this.isDragging = true;
        this.isDraggingObject = true;
        this.updateLensObjectFromPointer(x, y);
      }
    } else if (this.currentMode === 'eye') {
      if (x < this.width * 0.45) {
        this.eyeHasLens = !this.eyeHasLens;
        this.updateEyeUI();
        this.render();
      }
    }
  }

  handlePointerMove(e) {
    if (!this.isDragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.currentMode === 'snell') {
      this.updateAngleFromPointer(x, y);
    } else if (this.currentMode === 'mirrors' && this.isDraggingObject) {
      this.updateMirrorObjectFromPointer(x, y);
    } else if (this.currentMode === 'lenses' && this.isDraggingObject) {
      this.updateLensObjectFromPointer(x, y);
    }
  }

  handlePointerUp() {
    this.isDragging = false;
    this.isDraggingObject = false;
  }

  /* ==========================================================================
     LÓGICA DE ACTUALIZACIÓN DE INTERFAZ & TELEMETRÍA
     ========================================================================== */
  updateUIPanels() {
    const snellCtrl = document.getElementById('snellControls');
    const mirrorCtrl = document.getElementById('mirrorControls');
    const lensCtrl = document.getElementById('lensControls');
    const eyeCtrl = document.getElementById('eyeControls');

    if (snellCtrl) snellCtrl.style.display = this.currentMode === 'snell' ? 'grid' : 'none';
    if (mirrorCtrl) mirrorCtrl.style.display = this.currentMode === 'mirrors' ? 'grid' : 'none';
    if (lensCtrl) lensCtrl.style.display = this.currentMode === 'lenses' ? 'grid' : 'none';
    if (eyeCtrl) eyeCtrl.style.display = this.currentMode === 'eye' ? 'grid' : 'none';

    document.querySelectorAll('.sim-mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === this.currentMode);
    });

    const tirAlert = document.getElementById('simAlertOverlay');
    if (tirAlert && this.currentMode !== 'snell') {
      tirAlert.classList.remove('tir-active');
    }

    this.updateTelemetry();
  }

  updateTelemetry() {
    if (this.currentMode === 'snell') {
      this.updateSnellTelemetry();
    } else if (this.currentMode === 'mirrors') {
      this.updateMirrorsTelemetry();
    } else if (this.currentMode === 'lenses') {
      this.updateLensesTelemetry();
    } else if (this.currentMode === 'eye') {
      this.updateEyeTelemetry();
    }
  }

  /* --------------------------------------------------------------------------
     MÉTODOS ESPECÍFICOS MODO SNELL
     -------------------------------------------------------------------------- */
  updateAngleFromPointer(x, y) {
    const dx = this.originX - x;
    const dy = this.originY - y;
    if (dy <= 0) return;

    let angleRad = Math.atan2(dx, dy);
    let angleDeg = angleRad * (180 / Math.PI);
    if (angleDeg < 0) angleDeg = Math.abs(angleDeg);
    angleDeg = Math.max(0, Math.min(89.5, angleDeg));
    this.setTheta1(angleDeg);

    const slider = document.getElementById('sliderTheta1');
    const valDisplay = document.getElementById('valTheta1');
    if (slider) slider.value = angleDeg.toFixed(1);
    if (valDisplay) valDisplay.textContent = `${angleDeg.toFixed(1)}°`;
  }

  setTheta1(deg) {
    this.theta1 = parseFloat(deg);
    this.updateSnellTelemetry();
  }

  setN1(n, name = 'Personalizado') {
    this.n1 = parseFloat(n);
    this.medium1Name = name;
    this.updateSnellTelemetry();
  }

  setN2(n, name = 'Personalizado') {
    this.n2 = parseFloat(n);
    this.medium2Name = name;
    this.updateSnellTelemetry();
  }

  swapMedia() {
    const tempN = this.n1;
    this.n1 = this.n2;
    this.n2 = tempN;
    const tempName = this.medium1Name;
    this.medium1Name = this.medium2Name;
    this.medium2Name = tempName;
    this.updateSnellTelemetry();
  }

  setLaserColor(hex, wavelength) {
    this.laserColor = hex;
    this.laserWavelength = wavelength;
  }

  calculateSnellPhysics() {
    const theta1Rad = (this.theta1 * Math.PI) / 180;
    const v1 = this.SPEED_OF_LIGHT / this.n1;
    const v2 = this.SPEED_OF_LIGHT / this.n2;

    let criticalAngleDeg = null;
    let criticalAngleRad = null;
    let isTIR = false;
    let theta2Rad = null;
    let theta2Deg = null;

    if (this.n1 > this.n2) {
      const sinCrit = this.n2 / this.n1;
      criticalAngleRad = Math.asin(sinCrit);
      criticalAngleDeg = (criticalAngleRad * 180) / Math.PI;
      if (this.theta1 > criticalAngleDeg) {
        isTIR = true;
      }
    }

    if (!isTIR) {
      const sinTheta2 = (this.n1 * Math.sin(theta1Rad)) / this.n2;
      if (sinTheta2 <= 1.0) {
        theta2Rad = Math.asin(sinTheta2);
        theta2Deg = (theta2Rad * 180) / Math.PI;
      } else {
        isTIR = true;
      }
    }

    let reflectance = 0.05;
    if (isTIR) {
      reflectance = 1.0;
    } else if (theta2Rad !== null) {
      const cos1 = Math.cos(theta1Rad);
      const cos2 = Math.cos(theta2Rad);
      const rs = Math.pow((this.n1 * cos1 - this.n2 * cos2) / (this.n1 * cos1 + this.n2 * cos2), 2);
      const rp = Math.pow((this.n1 * cos2 - this.n2 * cos1) / (this.n1 * cos2 + this.n2 * cos1), 2);
      reflectance = Math.min(1.0, Math.max(0.04, (rs + rp) / 2));
    }
    const transmittance = 1.0 - reflectance;

    return {
      theta1Rad,
      theta2Rad,
      theta2Deg,
      criticalAngleDeg,
      criticalAngleRad,
      isTIR,
      v1,
      v2,
      reflectance,
      transmittance
    };
  }

  updateSnellTelemetry() {
    const data = this.calculateSnellPhysics();
    const tirAlert = document.getElementById('simAlertOverlay');
    if (tirAlert) {
      if (data.isTIR) {
        tirAlert.classList.add('tir-active');
        tirAlert.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ¡REFLEXIÓN INTERNA TOTAL ACTIVA! (100% de la energía se refleja en el medio 1)';
      } else {
        tirAlert.classList.remove('tir-active');
      }
    }

    const l1 = document.getElementById('lblTelemetry1');
    const l2 = document.getElementById('lblTelemetry2');
    const l3 = document.getElementById('lblTelemetry3');
    const l4 = document.getElementById('lblTelemetry4');
    if (l1) l1.textContent = 'Ángulo Refracción (θ₂)';
    if (l2) l2.textContent = 'Ángulo Crítico (θc)';
    if (l3) l3.textContent = 'Velocidad v₁';
    if (l4) l4.textContent = 'Velocidad v₂';

    const t1 = document.getElementById('telemetryTheta2');
    const t2 = document.getElementById('telemetryCrit');
    const t3 = document.getElementById('telemetryV1');
    const t4 = document.getElementById('telemetryV2');
    const tState = document.getElementById('telemetryState');
    const btnCrit = document.getElementById('btnGoCrit');

    if (t1) {
      t1.textContent = data.isTIR ? 'Ninguno (RIT)' : `${data.theta2Deg.toFixed(1)}°`;
      t1.parentElement?.classList.toggle('alert', data.isTIR);
    }
    if (t2) {
      t2.textContent = data.criticalAngleDeg !== null ? `${data.criticalAngleDeg.toFixed(2)}°` : 'No existe (n₁ ≤ n₂)';
    }
    if (t3) t3.textContent = `${(data.v1 / 1000).toFixed(0)} × 10³ km/s`;
    if (t4) t4.textContent = `${(data.v2 / 1000).toFixed(0)} × 10³ km/s`;

    // Mensajes pedagógicos dinámicos exactos según requerimientos de la instrucción
    if (tState) {
      if (data.isTIR) {
        tState.innerHTML = '<span style="color:#f43f5e;font-weight:bold;"><i class="fas fa-ban"></i> Ocurre reflexión interna total (θ₁ &gt; θc)</span>';
      } else if (data.criticalAngleDeg !== null && Math.abs(this.theta1 - data.criticalAngleDeg) < 0.3) {
        tState.innerHTML = '<span style="color:#eab308;font-weight:bold;"><i class="fas fa-crosshairs"></i> Se alcanzó el ángulo crítico (Rayo rasante a 90°)</span>';
      } else if (this.theta1 === 0) {
        tState.innerHTML = '<span style="color:#10b981;"><i class="fas fa-arrow-down"></i> Existe rayo refractado (Incidencia perpendicular normal, sin desviación angular)</span>';
      } else if (this.n2 > this.n1) {
        tState.innerHTML = '<span style="color:#38bdf8;"><i class="fas fa-arrow-right"></i> Existe rayo refractado (Se acerca a la normal, θ₂ &lt; θ₁)</span>';
      } else if (this.n2 < this.n1) {
        tState.innerHTML = '<span style="color:#f59e0b;"><i class="fas fa-arrow-right"></i> Existe rayo refractado (Se aleja de la normal, θ₂ &gt; θ₁)</span>';
      } else {
        tState.innerHTML = '<span style="color:#94a3b8;"><i class="fas fa-equals"></i> Existe rayo refractado (Medios de igual densidad óptica, luz rectilínea)</span>';
      }
    }

    if (btnCrit) {
      if (data.criticalAngleDeg !== null) {
        btnCrit.style.display = 'inline-flex';
        btnCrit.textContent = `Ir a θc = ${data.criticalAngleDeg.toFixed(1)}°`;
      } else {
        btnCrit.style.display = 'none';
      }
    }
  }

  /* --------------------------------------------------------------------------
     MÉTODOS ESPECÍFICOS MODO ESPEJOS
     -------------------------------------------------------------------------- */
  setMirrorType(type) {
    this.mirrorType = type;
    this.updateMirrorsTelemetry();
    this.render();
  }

  setMirrorObjectDist(pixels) {
    this.mirrorObjectDist = Math.max(30, Math.min(320, parseFloat(pixels)));
    this.updateMirrorsTelemetry();
    this.render();
  }

  setMirrorObjectHeight(pixels) {
    this.mirrorObjectHeight = Math.max(20, Math.min(100, parseFloat(pixels)));
    this.updateMirrorsTelemetry();
    this.render();
  }

  setMirrorFocalLength(pixels) {
    this.mirrorFocalLength = Math.max(50, Math.min(180, parseFloat(pixels)));
    this.updateMirrorsTelemetry();
    this.render();
  }

  updateMirrorObjectFromPointer(x, y) {
    const vx = this.width * 0.28;
    const cy = this.originY;
    let newDist = x - vx; // Objeto siempre a la derecha del vértice
    newDist = Math.max(35, Math.min(this.width - vx - 40, newDist));
    this.mirrorObjectDist = newDist;

    let newHeight = cy - y;
    newHeight = Math.max(25, Math.min(100, newHeight));
    this.mirrorObjectHeight = newHeight;

    const sDist = document.getElementById('sliderMirrorDist');
    const sH = document.getElementById('sliderMirrorHeight');
    if (sDist) sDist.value = (newDist / 6).toFixed(1);
    if (sH) sH.value = (newHeight / 6).toFixed(1);

    const valDist = document.getElementById('valMirrorDist');
    const valH = document.getElementById('valMirrorHeight');
    if (valDist) valDist.textContent = `${(newDist / 6).toFixed(1)} cm`;
    if (valH) valH.textContent = `${(newHeight / 6).toFixed(1)} cm`;

    this.updateMirrorsTelemetry();
  }

  calculateMirrorsPhysics() {
    const scale = 6; // 6 px = 1 cm
    const do_cm = this.mirrorObjectDist / scale;
    const ho_cm = this.mirrorObjectHeight / scale;
    let f_cm = this.mirrorFocalLength / scale;

    let di_cm = null;
    let di_px = null;
    let M = null;
    let hi_cm = null;
    let hi_px = null;
    let nature = '';
    let orientation = '';
    let size = '';

    if (this.mirrorType === 'concave') {
      if (Math.abs(do_cm - f_cm) < 0.2) {
        nature = 'En el Infinito (Rayos paralelos, no hay imagen)';
        orientation = '—';
        size = '—';
        M = 0;
      } else {
        di_cm = (f_cm * do_cm) / (do_cm - f_cm);
        di_px = di_cm * scale;
        M = -di_cm / do_cm;
        hi_cm = M * ho_cm;
        hi_px = M * this.mirrorObjectHeight;

        nature = di_cm > 0 ? 'Real (delante del espejo)' : 'Virtual (detrás del espejo)';
        orientation = M < 0 ? 'Invertida' : 'Derecha';
        if (Math.abs(M) > 1.05) size = 'Aumentada (Mayor)';
        else if (Math.abs(M) < 0.95) size = 'Disminuida (Menor)';
        else size = 'Mismo tamaño';
      }
    } else if (this.mirrorType === 'convex') {
      f_cm = -f_cm;
      di_cm = (f_cm * do_cm) / (do_cm - f_cm);
      di_px = di_cm * scale;
      M = -di_cm / do_cm;
      hi_cm = M * ho_cm;
      hi_px = M * this.mirrorObjectHeight;

      nature = 'Virtual (detrás del espejo)';
      orientation = 'Derecha';
      size = 'Disminuida (Menor)';
    } else {
      di_cm = -do_cm;
      di_px = -this.mirrorObjectDist;
      M = 1.0;
      hi_cm = ho_cm;
      hi_px = this.mirrorObjectHeight;

      nature = 'Virtual (simétrica detrás)';
      orientation = 'Derecha';
      size = 'Mismo tamaño (1:1)';
    }

    return {
      do_cm,
      ho_cm,
      f_cm: this.mirrorType === 'concave' ? f_cm : (this.mirrorType === 'convex' ? -Math.abs(f_cm) : Infinity),
      di_cm,
      di_px,
      M,
      hi_cm,
      hi_px,
      nature,
      orientation,
      size
    };
  }

  updateMirrorsTelemetry() {
    const data = this.calculateMirrorsPhysics();

    const t1 = document.getElementById('telemetryMirrorDi');
    const t2 = document.getElementById('telemetryMirrorM');
    const t3 = document.getElementById('telemetryMirrorNature');
    const t4 = document.getElementById('telemetryMirrorR');

    if (t1) t1.textContent = data.di_cm !== null ? `${data.di_cm > 0 ? '+' : ''}${data.di_cm.toFixed(1)} cm` : '∞ (Infinito)';
    if (t2) t2.textContent = data.M !== null ? `${data.M.toFixed(2)}x` : '—';
    if (t3) t3.textContent = `${data.nature} — ${data.orientation} (${data.size})`;
    if (t4) {
      if (this.mirrorType === 'plane') t4.textContent = 'R = ∞';
      else t4.textContent = `R = ${(Math.abs(data.f_cm) * 2).toFixed(1)} cm`;
    }

    // Actualizar barra principal de telemetría de Hoja 6
    const l1 = document.getElementById('lblTelemetry1');
    const l2 = document.getElementById('lblTelemetry2');
    const l3 = document.getElementById('lblTelemetry3');
    const l4 = document.getElementById('lblTelemetry4');
    if (l1) l1.textContent = 'Distancia Imagen (dᵢ)';
    if (l2) l2.textContent = 'Aumento Lateral (m)';
    if (l3) l3.textContent = 'Distancia Focal (|f|)';
    if (l4) l4.textContent = 'Radio Curvatura (R)';

    const mt1 = document.getElementById('telemetryTheta2');
    const mt2 = document.getElementById('telemetryCrit');
    const mt3 = document.getElementById('telemetryV1');
    const mt4 = document.getElementById('telemetryV2');
    if (mt1) mt1.textContent = data.di_cm !== null ? `${data.di_cm > 0 ? '+' : ''}${data.di_cm.toFixed(1)} cm` : '∞ (Infinito)';
    if (mt2) mt2.textContent = data.M !== null ? `${data.M.toFixed(2)}x` : '—';
    if (mt3) mt3.textContent = this.mirrorType === 'plane' ? 'f = ∞' : `${Math.abs(data.f_cm).toFixed(1)} cm`;
    if (mt4) mt4.textContent = this.mirrorType === 'plane' ? 'R = ∞' : `${(Math.abs(data.f_cm) * 2).toFixed(1)} cm`;

    const tState = document.getElementById('telemetryState');
    if (tState) {
      if (this.mirrorType === 'concave') {
        if (Math.abs(data.do_cm - Math.abs(data.f_cm)) < 0.2) {
          tState.innerHTML = '<span style="color:#eab308;font-weight:bold;"><i class="fas fa-arrows-alt-h"></i> Objeto en el Foco (do = f): Rayos paralelos. Imagen en el infinito.</span>';
        } else if (data.di_cm > 0) {
          tState.innerHTML = '<span style="color:#10b981;font-weight:bold;"><i class="fas fa-check-circle"></i> Espejo Cóncavo: Imagen REAL e INVERTIDA (' + data.size + ') a ' + data.di_cm.toFixed(1) + ' cm del vértice.</span>';
        } else {
          tState.innerHTML = '<span style="color:#06b6d4;font-weight:bold;"><i class="fas fa-magic"></i> Espejo Cóncavo (do &lt; f): Imagen VIRTUAL y DERECHA (Aumentada) detrás del espejo.</span>';
        }
      } else if (this.mirrorType === 'convex') {
        tState.innerHTML = '<span style="color:#06b6d4;font-weight:bold;"><i class="fas fa-shield-alt"></i> Espejo Convexo: Foco virtual — Imagen siempre VIRTUAL, DERECHA y MENOR detrás del espejo.</span>';
      } else {
        tState.innerHTML = '<span style="color:#38bdf8;font-weight:bold;"><i class="fas fa-arrows-alt-v"></i> Espejo Plano: Imagen VIRTUAL simétrica (di = -do), derecha y de idéntico tamaño (m = +1.0).</span>';
      }
    }
  }

  /* --------------------------------------------------------------------------
     MÉTODOS ESPECÍFICOS MODO LENTES DELGADAS
     -------------------------------------------------------------------------- */
  setLensType(type) {
    this.lensType = type;
    this.updateLensesTelemetry();
    this.render();
  }

  setLensObjectDist(pixels) {
    this.lensObjectDist = Math.max(30, Math.min(320, parseFloat(pixels)));
    this.updateLensesTelemetry();
    this.render();
  }

  setLensObjectHeight(pixels) {
    this.lensObjectHeight = Math.max(20, Math.min(100, parseFloat(pixels)));
    this.updateLensesTelemetry();
    this.render();
  }

  setLensFocalLength(pixels) {
    this.lensFocalLength = Math.max(50, Math.min(180, parseFloat(pixels)));
    this.updateLensesTelemetry();
    this.render();
  }

  updateLensObjectFromPointer(x, y) {
    const lx = this.width * 0.5;
    const cy = this.originY;
    let newDist = lx - x;
    newDist = Math.max(35, Math.min(lx - 20, newDist));
    this.lensObjectDist = newDist;

    let newHeight = cy - y;
    newHeight = Math.max(25, Math.min(100, newHeight));
    this.lensObjectHeight = newHeight;

    const sDist = document.getElementById('sliderLensDist');
    const sH = document.getElementById('sliderLensHeight');
    if (sDist) sDist.value = (newDist / 6).toFixed(1);
    if (sH) sH.value = (newHeight / 6).toFixed(1);

    const valDist = document.getElementById('valLensDist');
    const valH = document.getElementById('valLensHeight');
    if (valDist) valDist.textContent = `${(newDist / 6).toFixed(1)} cm`;
    if (valH) valH.textContent = `${(newHeight / 6).toFixed(1)} cm`;

    this.updateLensesTelemetry();
  }

  calculateLensesPhysics() {
    const scale = 6; // 6 px = 1 cm
    const do_cm = this.lensObjectDist / scale;
    const ho_cm = this.lensObjectHeight / scale;
    let f_cm = this.lensFocalLength / scale;

    let di_cm = null;
    let di_px = null;
    let M = null;
    let hi_cm = null;
    let hi_px = null;
    let nature = '';
    let orientation = '';
    let size = '';

    if (this.lensType === 'converging') {
      if (Math.abs(do_cm - f_cm) < 0.2) {
        nature = 'En el Infinito (Rayos refractados paralelos)';
        orientation = '—';
        size = '—';
        M = 0;
      } else {
        di_cm = (f_cm * do_cm) / (do_cm - f_cm);
        di_px = di_cm * scale;
        M = -di_cm / do_cm;
        hi_cm = M * ho_cm;
        hi_px = M * this.lensObjectHeight;

        nature = di_cm > 0 ? 'Real (detrás de la lente)' : 'Virtual (delante de la lente)';
        orientation = M < 0 ? 'Invertida' : 'Derecha';
        if (Math.abs(M) > 1.05) size = 'Aumentada';
        else if (Math.abs(M) < 0.95) size = 'Disminuida';
        else size = 'Mismo tamaño';
      }
    } else {
      // Divergente: f < 0
      f_cm = -f_cm;
      di_cm = (f_cm * do_cm) / (do_cm - f_cm);
      di_px = di_cm * scale;
      M = -di_cm / do_cm;
      hi_cm = M * ho_cm;
      hi_px = M * this.lensObjectHeight;

      nature = 'Virtual (delante de la lente)';
      orientation = 'Derecha';
      size = 'Disminuida';
    }

    const power_D = 100 / (this.lensType === 'converging' ? Math.abs(f_cm) : -Math.abs(f_cm));

    return {
      do_cm,
      ho_cm,
      f_cm: this.lensType === 'converging' ? f_cm : -Math.abs(f_cm),
      di_cm,
      di_px,
      M,
      hi_cm,
      hi_px,
      nature,
      orientation,
      size,
      power_D
    };
  }

  updateLensesTelemetry() {
    const data = this.calculateLensesPhysics();
    const t1 = document.getElementById('telemetryLensDi');
    const t2 = document.getElementById('telemetryLensM');
    const t3 = document.getElementById('telemetryLensNature');
    const t4 = document.getElementById('telemetryLensPower');

    if (t1) t1.textContent = data.di_cm !== null ? `${data.di_cm > 0 ? '+' : ''}${data.di_cm.toFixed(1)} cm` : '∞ (Infinito)';
    if (t2) t2.textContent = data.M !== null ? `${data.M.toFixed(2)}x` : '—';
    if (t3) t3.textContent = `${data.nature} — ${data.orientation} (${data.size})`;
    if (t4) t4.textContent = `${data.power_D > 0 ? '+' : ''}${data.power_D.toFixed(2)} D`;

    // Actualizar barra principal de telemetría de Hoja 6
    const l1 = document.getElementById('lblTelemetry1');
    const l2 = document.getElementById('lblTelemetry2');
    const l3 = document.getElementById('lblTelemetry3');
    const l4 = document.getElementById('lblTelemetry4');
    if (l1) l1.textContent = 'Distancia Imagen (dᵢ)';
    if (l2) l2.textContent = 'Aumento Lateral (m)';
    if (l3) l3.textContent = 'Distancia Focal (|f|)';
    if (l4) l4.textContent = 'Potencia Óptica (P)';

    const mt1 = document.getElementById('telemetryTheta2');
    const mt2 = document.getElementById('telemetryCrit');
    const mt3 = document.getElementById('telemetryV1');
    const mt4 = document.getElementById('telemetryV2');
    if (mt1) mt1.textContent = data.di_cm !== null ? `${data.di_cm > 0 ? '+' : ''}${data.di_cm.toFixed(1)} cm` : '∞ (Infinito)';
    if (mt2) mt2.textContent = data.M !== null ? `${data.M.toFixed(2)}x` : '—';
    if (mt3) mt3.textContent = `${Math.abs(data.f_cm).toFixed(1)} cm`;
    if (mt4) mt4.textContent = `${data.power_D > 0 ? '+' : ''}${data.power_D.toFixed(2)} D`;

    const tState = document.getElementById('telemetryState');
    if (tState) {
      if (this.lensType === 'converging') {
        if (Math.abs(data.do_cm - Math.abs(data.f_cm)) < 0.2) {
          tState.innerHTML = '<span style="color:#eab308;font-weight:bold;"><i class="fas fa-arrows-alt-h"></i> Objeto en el Foco (do = f): Rayos refractados paralelos. Imagen en el infinito.</span>';
        } else if (data.di_cm > 0) {
          tState.innerHTML = '<span style="color:#10b981;font-weight:bold;"><i class="fas fa-check-circle"></i> Lente Convergente (f &gt; 0): Imagen REAL e INVERTIDA (' + data.size + ') en el lado opuesto a +' + data.di_cm.toFixed(1) + ' cm.</span>';
        } else {
          tState.innerHTML = '<span style="color:#06b6d4;font-weight:bold;"><i class="fas fa-search-plus"></i> Lente Convergente: Efecto Lupa (do &lt; f) — Imagen VIRTUAL, DERECHA y AUMENTADA en el mismo lado.</span>';
        }
      } else {
        tState.innerHTML = '<span style="color:#06b6d4;font-weight:bold;"><i class="fas fa-expand"></i> Lente Divergente (f &lt; 0): Rayos divergentes — Imagen siempre VIRTUAL, DERECHA y REDUCIDA del mismo lado.</span>';
      }
    }
  }

  /* --------------------------------------------------------------------------
     MÉTODOS ESPECÍFICOS MODO OJO HUMANO & LENTES
     -------------------------------------------------------------------------- */
  setEyeCondition(cond) {
    this.eyeCondition = cond;
    if (cond === 'normal') {
      this.eyeHasLens = false;
      this.eyeLensPower = 0.0;
    } else if (cond === 'myopia') {
      this.eyeLensPower = -2.50;
    } else if (cond === 'hyperopia') {
      this.eyeLensPower = +2.50;
    }
    this.updateEyeUI();
    this.updateEyeTelemetry();
    this.render();
  }

  toggleEyeLens(active) {
    this.eyeHasLens = active;
    this.updateEyeUI();
    this.updateEyeTelemetry();
    this.render();
  }

  updateEyeUI() {
    const btnToggle = document.getElementById('btnToggleEyeLens');
    if (btnToggle) {
      btnToggle.classList.toggle('active', this.eyeHasLens);
      btnToggle.innerHTML = this.eyeHasLens 
        ? '<i class="fas fa-glasses"></i> Quitar Lente Correctiva' 
        : '<i class="fas fa-glasses"></i> Aplicar Lente Correctiva';
    }

    document.querySelectorAll('.eye-cond-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.condition === this.eyeCondition);
    });
  }

  updateEyeTelemetry() {
    const tAcuity = document.getElementById('telemetryEyeAcuity');
    const tFocal = document.getElementById('telemetryEyeFocal');
    const tLens = document.getElementById('telemetryEyeLens');
    const tDiag = document.getElementById('telemetryEyeDiagnostic');

    let acuity = '20/20 (Visión Nítida Perfecta)';
    let focalPos = 'Exactamente en la Fóvea Retiniana';
    let diagnostic = 'Ojo Emétrope: Sistema óptico en equilibrio perfecto.';
    let lensText = this.eyeHasLens ? `${this.eyeLensPower > 0 ? '+' : ''}${this.eyeLensPower.toFixed(2)} D` : 'Sin gafa / lente';

    if (this.eyeCondition === 'myopia') {
      if (this.eyeHasLens) {
        acuity = '20/20 (Corregida con Lente Divergente)';
        focalPos = 'Enfocado sobre la Retina';
        diagnostic = 'Miopía corregida: La lente bicóncava (potencia negativa) abre los rayos para compensar el exceso refractivo.';
      } else {
        acuity = '20/80 (Visión Borrosa Lejana)';
        focalPos = '4.5 mm ANTES de la Retina';
        diagnostic = 'Miopía sin corrección: Globo ocular alargado o córnea hiperconvergente. Los rayos se cruzan prematuramente.';
      }
    } else if (this.eyeCondition === 'hyperopia') {
      if (this.eyeHasLens) {
        acuity = '20/20 (Corregida con Lente Convergente)';
        focalPos = 'Enfocado sobre la Retina';
        diagnostic = 'Hipermetropía corregida: La lente biconvexa (potencia positiva) aporta la convergencia faltante.';
      } else {
        acuity = '20/60 (Visión Borrosa Cercana)';
        focalPos = '5.2 mm DETRÁS de la Retina';
        diagnostic = 'Hipermetropía sin corrección: Globo ocular corto o potencia insuficiente. Los rayos chocan la retina antes de converger.';
      }
    }

    if (tAcuity) tAcuity.textContent = acuity;
    if (tFocal) tFocal.textContent = focalPos;
    if (tLens) tLens.textContent = lensText;
    if (tDiag) tDiag.textContent = diagnostic;

    // Actualizar barra principal de telemetría de Hoja 6
    const l1 = document.getElementById('lblTelemetry1');
    const l2 = document.getElementById('lblTelemetry2');
    const l3 = document.getElementById('lblTelemetry3');
    const l4 = document.getElementById('lblTelemetry4');
    if (l1) l1.textContent = 'Condición Visual';
    if (l2) l2.textContent = 'Punto Focal';
    if (l3) l3.textContent = 'Lente Oftálmica';
    if (l4) l4.textContent = 'Agudeza Visual';

    const mt1 = document.getElementById('telemetryTheta2');
    const mt2 = document.getElementById('telemetryCrit');
    const mt3 = document.getElementById('telemetryV1');
    const mt4 = document.getElementById('telemetryV2');
    if (mt1) mt1.textContent = this.eyeCondition === 'normal' ? 'Normal' : (this.eyeCondition === 'myopia' ? 'Miopía' : 'Hipermetropía');
    if (mt2) mt2.textContent = this.eyeCondition === 'normal' ? 'En Retina' : (this.eyeHasLens ? 'Retina (Corregido)' : (this.eyeCondition === 'myopia' ? 'Pre-retiniano' : 'Retro-retiniano'));
    if (mt3) mt3.textContent = lensText;
    if (mt4) mt4.textContent = this.eyeHasLens || this.eyeCondition === 'normal' ? '20/20 Nítida' : (this.eyeCondition === 'myopia' ? '20/80 Lejana' : '20/60 Cercana');

    const tState = document.getElementById('telemetryState');
    if (tState) {
      tState.innerHTML = `<span style="color:#10b981;font-weight:bold;"><i class="fas fa-eye"></i> ${diagnostic}</span>`;
    }
  }

  /* ==========================================================================
     MOTOR PRINCIPAL DE RENDERIZADO
     ========================================================================== */
  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (this.currentMode === 'snell') {
      this.renderSnell();
    } else if (this.currentMode === 'mirrors') {
      this.renderMirrors();
    } else if (this.currentMode === 'lenses') {
      this.renderLenses();
    } else if (this.currentMode === 'eye') {
      this.renderEye();
    }
  }

  /* ==========================================================================
     RENDERIZADO MODO SNELL
     ========================================================================== */
  renderSnell() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const ox = this.originX;
    const oy = this.originY;

    const data = this.calculateSnellPhysics();

    const alpha1 = Math.min(0.65, 0.12 + (this.n1 - 1.0) * 0.25);
    const grad1 = ctx.createLinearGradient(0, 0, 0, oy);
    grad1.addColorStop(0, '#0a101d');
    grad1.addColorStop(1, `rgba(30, 58, 138, ${alpha1})`);
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, oy);

    const alpha2 = Math.min(0.85, 0.18 + (this.n2 - 1.0) * 0.28);
    const grad2 = ctx.createLinearGradient(0, oy, 0, h);
    grad2.addColorStop(0, `rgba(6, 182, 212, ${alpha2})`);
    grad2.addColorStop(1, '#05192d');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, oy, w, h - oy);

    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(w, oy);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.font = '600 12px "Outfit", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`Medio 1: ${this.medium1Name} (n₁ = ${this.n1.toFixed(3)})`, 16, 26);
    ctx.fillText(`Medio 2: ${this.medium2Name} (n₂ = ${this.n2.toFixed(3)})`, 16, oy + 26);

    if (this.showProtractor) this.drawProtractor(ctx, ox, oy);
    if (this.showNormal) this.drawNormalLine(ctx, ox, h);
    this.drawSnellRays(ctx, ox, oy, data);
    if (this.showAngles) this.drawSnellAngles(ctx, ox, oy, data);
    this.drawLaserEmitter(ctx, ox, oy, data.theta1Rad);
    if (this.showParticles) this.drawSnellPhotons(ctx, ox, oy, data);
  }

  drawProtractor(ctx, ox, oy) {
    const radius = Math.min(ox - 35, oy - 25);
    if (radius <= 40) return;

    ctx.save();
    ctx.translate(ox, oy);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.font = '9px "Fira Code", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let deg = 0; deg < 360; deg += 5) {
      const rad = (deg * Math.PI) / 180;
      const isMajor = deg % 10 === 0;
      const tickLength = isMajor ? 10 : 5;

      const x1 = Math.cos(rad) * radius;
      const y1 = Math.sin(rad) * radius;
      const x2 = Math.cos(rad) * (radius - tickLength);
      const y2 = Math.sin(rad) * (radius - tickLength);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = isMajor ? 'rgba(255, 255, 255, 0.6)' : 'rgba(148, 163, 184, 0.3)';
      ctx.lineWidth = isMajor ? 1.2 : 0.8;
      ctx.stroke();

      if (isMajor && deg % 30 === 0) {
        let labelAngle = Math.abs((deg + 90) % 180 - 90);
        const tx = Math.cos(rad) * (radius - 20);
        const ty = Math.sin(rad) * (radius - 20);
        ctx.fillText(`${labelAngle}°`, tx, ty);
      }
    }
    ctx.restore();
  }

  drawNormalLine(ctx, ox, h) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.moveTo(ox, 0);
    ctx.lineTo(ox, h);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#93c5fd';
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.fillText('Normal (N)', ox + 8, 20);
    ctx.fillText('Normal (N)', ox + 8, h - 12);
    ctx.restore();
  }

  drawLaserEmitter(ctx, ox, oy, theta1Rad) {
    const laserRayDist = Math.min(ox - 45, oy - 35);
    const lx = ox - laserRayDist * Math.sin(theta1Rad);
    const ly = oy - laserRayDist * Math.cos(theta1Rad);

    const angleToOrigin = Math.atan2(oy - ly, ox - lx);

    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(angleToOrigin);

    const bodyLength = 48;
    const bodyRadius = 11;

    const bodyGrad = ctx.createLinearGradient(-bodyLength, -bodyRadius, -bodyLength, bodyRadius);
    bodyGrad.addColorStop(0, '#334155');
    bodyGrad.addColorStop(0.5, '#0f172a');
    bodyGrad.addColorStop(1, '#1e293b');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-bodyLength, -bodyRadius, bodyLength - 8, bodyRadius * 2, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-8, -bodyRadius + 2, 8, (bodyRadius - 2) * 2, 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.laserColor;
    ctx.shadowColor = this.laserColor;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.restore();
  }

  drawSnellRays(ctx, ox, oy, data) {
    const rayLength = Math.max(this.width, this.height) * 1.2;
    const laserRayDist = Math.min(ox - 45, oy - 35);

    const lx = ox - laserRayDist * Math.sin(data.theta1Rad);
    const ly = oy - laserRayDist * Math.cos(data.theta1Rad);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(ox, oy);
    ctx.strokeStyle = this.laserColor;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = this.laserColor;
    ctx.shadowBlur = 14;
    ctx.stroke();

    const incidentAngle = Math.atan2(oy - ly, ox - lx);
    this.drawArrowhead(ctx, (lx + ox) / 2, (ly + oy) / 2, incidentAngle, this.laserColor);

    ctx.beginPath();
    ctx.arc(ox, oy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.laserColor;
    ctx.shadowBlur = 18;
    ctx.fill();

    const rx = ox + rayLength * Math.sin(data.theta1Rad);
    const ry = oy - rayLength * Math.cos(data.theta1Rad);

    const reflAlpha = data.isTIR ? 1.0 : Math.max(0.35, data.reflectance * 1.5);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(rx, ry);
    ctx.strokeStyle = this.laserColor;
    ctx.globalAlpha = reflAlpha;
    ctx.lineWidth = data.isTIR ? 4.5 : 2.5;
    ctx.shadowColor = this.laserColor;
    ctx.shadowBlur = data.isTIR ? 22 : 10;
    ctx.stroke();

    const reflAngle = Math.atan2(ry - oy, rx - ox);
    const midReflX = ox + 85 * Math.sin(data.theta1Rad);
    const midReflY = oy - 85 * Math.cos(data.theta1Rad);
    this.drawArrowhead(ctx, midReflX, midReflY, reflAngle, this.laserColor);

    if (!data.isTIR && data.theta2Rad !== null) {
      const tx = ox + rayLength * Math.sin(data.theta2Rad);
      const ty = oy + rayLength * Math.cos(data.theta2Rad);

      const transAlpha = Math.max(0.2, data.transmittance);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = this.laserColor;
      ctx.globalAlpha = transAlpha;
      ctx.lineWidth = 3.2;
      ctx.shadowColor = this.laserColor;
      ctx.shadowBlur = 12;
      ctx.stroke();

      const refrAngle = Math.atan2(ty - oy, tx - ox);
      const midRefrX = ox + 85 * Math.sin(data.theta2Rad);
      const midRefrY = oy + 85 * Math.cos(data.theta2Rad);
      this.drawArrowhead(ctx, midRefrX, midRefrY, refrAngle, this.laserColor);
    }
    ctx.restore();
  }

  drawSnellAngles(ctx, ox, oy, data) {
    const arcRadius = 55;
    ctx.save();

    if (this.theta1 > 1.5) {
      ctx.beginPath();
      ctx.arc(ox, oy, arcRadius, -Math.PI / 2 - data.theta1Rad, -Math.PI / 2, false);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      const textAngle1 = -Math.PI / 2 - data.theta1Rad / 2;
      const tx1 = ox + (arcRadius + 18) * Math.cos(textAngle1);
      const ty1 = oy + (arcRadius + 18) * Math.sin(textAngle1);
      ctx.fillStyle = '#fef08a';
      ctx.font = '700 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`θ₁ = ${this.theta1.toFixed(1)}°`, tx1, ty1);
    }

    if (this.theta1 > 1.5) {
      ctx.beginPath();
      ctx.arc(ox, oy, arcRadius - 8, -Math.PI / 2, -Math.PI / 2 + data.theta1Rad, false);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const textAngleR = -Math.PI / 2 + data.theta1Rad / 2;
      const txR = ox + (arcRadius + 14) * Math.cos(textAngleR);
      const tyR = oy + (arcRadius + 14) * Math.sin(textAngleR);
      ctx.fillStyle = '#fed7aa';
      ctx.font = '600 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`θr = ${this.theta1.toFixed(1)}°`, txR, tyR);
    }

    if (!data.isTIR && data.theta2Rad !== null && data.theta2Deg > 1.5) {
      ctx.beginPath();
      ctx.arc(ox, oy, arcRadius, Math.PI / 2 - data.theta2Rad, Math.PI / 2, false);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      const textAngle2 = Math.PI / 2 - data.theta2Rad / 2;
      const tx2 = ox + (arcRadius + 20) * Math.cos(textAngle2);
      const ty2 = oy + (arcRadius + 20) * Math.sin(textAngle2);
      ctx.fillStyle = '#bae6fd';
      ctx.font = '700 11px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`θ₂ = ${data.theta2Deg.toFixed(1)}°`, tx2, ty2);
    }
    ctx.restore();
  }

  drawSnellPhotons(ctx, ox, oy, data) {
    const now = performance.now();
    const dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (Math.random() < 0.35) {
      this.particles.push({ type: 'incident', progress: 0.0 });
    }

    const laserRayDist = Math.min(ox - 45, oy - 35);
    const lx = ox - laserRayDist * Math.sin(data.theta1Rad);
    const ly = oy - laserRayDist * Math.cos(data.theta1Rad);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.progress += dt * 1.5;

      if (p.type === 'incident') {
        const px = lx + (ox - lx) * p.progress;
        const py = ly + (oy - ly) * p.progress;
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.laserColor;
        ctx.shadowBlur = 8;
        ctx.fill();

        if (p.progress >= 1.0) {
          this.particles.splice(i, 1);
          this.particles.push({ type: 'reflected', progress: 0.0 });
          if (!data.isTIR && data.theta2Rad !== null) {
            this.particles.push({ type: 'refracted', progress: 0.0 });
          }
        }
      } else if (p.type === 'reflected') {
        const rayLen = 280;
        const px = ox + rayLen * Math.sin(data.theta1Rad) * p.progress;
        const py = oy - rayLen * Math.cos(data.theta1Rad) * p.progress;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.laserColor;
        ctx.shadowBlur = 6;
        ctx.fill();
        if (p.progress >= 1.0) this.particles.splice(i, 1);
      } else if (p.type === 'refracted' && !data.isTIR && data.theta2Rad !== null) {
        const rayLen = 280;
        const px = ox + rayLen * Math.sin(data.theta2Rad) * p.progress;
        const py = oy + rayLen * Math.cos(data.theta2Rad) * p.progress;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = this.laserColor;
        ctx.shadowBlur = 6;
        ctx.fill();
        if (p.progress >= 1.0) this.particles.splice(i, 1);
      }
    }
  }

  /* ==========================================================================
     RENDERIZADO MODO BANCO DE ESPEJOS
     ========================================================================== */
  renderMirrors() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cy = this.originY;
    const vx = w * 0.28; // Vértice en origen (x = 0)

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(1, '#0e172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Eje Óptico Principal
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const data = this.calculateMirrorsPhysics();
    const f_px = this.mirrorFocalLength;
    const do_px = this.mirrorObjectDist;
    const ho_px = this.mirrorObjectHeight;

    // En espejo cóncavo: C y F se encuentran a la DERECHA del vértice (f > 0)
    // En espejo convexo: C y F se encuentran a la IZQUIERDA del vértice (f < 0)
    let fx = vx + f_px;
    let cx_pt = vx + 2 * f_px;
    if (this.mirrorType === 'convex') {
      fx = vx - f_px;
      cx_pt = vx - 2 * f_px;
    }

    this.drawMirrorSurface(ctx, vx, cy, h);
    this.drawCardinalPoint(ctx, vx, cy, 'V', '#38bdf8');
    if (this.mirrorType !== 'plane') {
      this.drawCardinalPoint(ctx, fx, cy, 'F', '#f59e0b');
      this.drawCardinalPoint(ctx, cx_pt, cy, 'C', '#a855f7');
    }

    // El objeto SIEMPRE se dibuja a la DERECHA del vértice:
    const objX = vx + do_px;
    const objY = cy - ho_px;
    this.drawArrow(ctx, objX, cy, objX, objY, '#f59e0b', 4, 'Objeto (do)');

    if (this.mirrorType === 'concave') {
      this.drawConcaveRays(ctx, objX, objY, vx, cy, fx, cx_pt, data);
    } else if (this.mirrorType === 'convex') {
      this.drawConvexRays(ctx, objX, objY, vx, cy, fx, cx_pt, data);
    } else {
      this.drawPlaneRays(ctx, objX, objY, vx, cy, data);
    }

    if (data.di_px !== null) {
      // Imagen: si di > 0, real a la derecha del vértice; si di < 0, virtual a la izquierda
      const imgX = vx + data.di_px;
      const imgY = cy - data.hi_px;
      const isReal = data.di_px > 0;
      const imgColor = isReal ? '#10b981' : '#06b6d4';
      const label = isReal ? 'Imagen Real' : 'Imagen Virtual';
      this.drawArrow(ctx, imgX, cy, imgX, imgY, imgColor, 3, label, !isReal);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💡 Arrastra la flecha naranja para cambiar la distancia o altura del objeto', 16, 24);
  }

  drawMirrorSurface(ctx, vx, cy, h) {
    const mirrorHeight = 240;
    ctx.save();

    if (this.mirrorType === 'concave') {
      // Espejo Cóncavo: concavidad reflectora abierta hacia la DERECHA (hacia el objeto)
      ctx.beginPath();
      ctx.arc(vx + 320, cy, 320, Math.PI - 0.38, Math.PI + 0.38);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Hachurado en la parte posterior exterior (a la izquierda)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2;
      for (let y = cy - 110; y <= cy + 110; y += 10) {
        ctx.beginPath();
        const arcX = vx + 320 - Math.sqrt(Math.max(0, 320 * 320 - (y - cy) * (y - cy)));
        ctx.moveTo(arcX, y);
        ctx.lineTo(arcX - 12, y - 6);
        ctx.stroke();
      }
    } else if (this.mirrorType === 'convex') {
      // Espejo Convexo: curvatura reflectora saliente hacia la DERECHA (hacia el objeto)
      ctx.beginPath();
      ctx.arc(vx - 320, cy, 320, -0.38, 0.38);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4.5;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.stroke();

      // Hachurado en la parte posterior interna (a la izquierda)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2;
      for (let y = cy - 110; y <= cy + 110; y += 10) {
        ctx.beginPath();
        const arcX = vx - 320 + Math.sqrt(Math.max(0, 320 * 320 - (y - cy) * (y - cy)));
        ctx.moveTo(arcX, y);
        ctx.lineTo(arcX - 12, y - 6);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.moveTo(vx, cy - mirrorHeight / 2);
      ctx.lineTo(vx, cy + mirrorHeight / 2);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      for (let y = cy - mirrorHeight / 2 + 5; y <= cy + mirrorHeight / 2; y += 10) {
        ctx.beginPath();
        ctx.moveTo(vx, y);
        ctx.lineTo(vx - 10, y - 6);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawCardinalPoint(ctx, x, y, name, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y - 10);
    ctx.restore();
  }

  drawArrow(ctx, x1, y1, x2, y2, color, width, label, isDashed = false) {
    ctx.save();
    ctx.beginPath();
    if (isDashed) ctx.setLineDash([4, 4]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    this.drawArrowhead(ctx, x2, y2, angle, color, 8);

    ctx.fillStyle = color;
    ctx.font = '700 11px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x2, y2 + (y2 < y1 ? -12 : 18));
    ctx.restore();
  }

  drawConcaveRays(ctx, objX, objY, vx, cy, fx, cx_pt, data) {
    ctx.save();
    const endX = this.width - 20;

    // Rayo 1 (Paralelo): sale horizontal a la izquierda hasta vx, se refleja pasando por F (a la derecha)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, objY);
    ctx.stroke();

    const slope1 = (cy - objY) / (fx - vx);
    const endY1 = objY + slope1 * (endX - vx);
    ctx.beginPath();
    ctx.moveTo(vx, objY);
    ctx.lineTo(endX, endY1);
    ctx.stroke();

    if (data.di_px !== null && data.di_px < 0) {
      // Imagen virtual a la izquierda del vértice
      const imgX = vx + data.di_px;
      const imgY = cy - data.hi_px;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.moveTo(vx, objY);
      ctx.lineTo(imgX, imgY);
      ctx.stroke();
    }

    // Rayo 2 (Vértice): incide en V(vx, cy), se refleja simétricamente hacia la derecha
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b82f6';
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, cy);
    const slope2 = (cy - objY) / (objX - vx);
    const endY2 = cy + slope2 * (endX - vx);
    ctx.lineTo(endX, endY2);
    ctx.stroke();

    if (data.di_px !== null && data.di_px < 0) {
      const imgX = vx + data.di_px;
      const imgY = cy - data.hi_px;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.moveTo(vx, cy);
      ctx.lineTo(imgX, imgY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawConvexRays(ctx, objX, objY, vx, cy, fx, cx_pt, data) {
    ctx.save();
    const endX = this.width - 20;

    // Rayo 1 (Paralelo): incide horizontal a la izquierda hasta vx, se refleja divergiendo como si proviniera de F (a la izquierda)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, objY);
    ctx.stroke();

    const slope1 = (objY - cy) / (vx - fx);
    const endY1 = objY + slope1 * (endX - vx);
    ctx.beginPath();
    ctx.moveTo(vx, objY);
    ctx.lineTo(endX, endY1);
    ctx.stroke();

    // Prolongación virtual hacia F a la izquierda
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.moveTo(vx, objY);
    ctx.lineTo(fx, cy);
    ctx.stroke();

    // Rayo 2 (Vértice): incide en V(vx, cy), se refleja simétricamente hacia la derecha
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b82f6';
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, cy);
    const slope2 = (cy - objY) / (objX - vx);
    const endY2 = cy + slope2 * (endX - vx);
    ctx.lineTo(endX, endY2);
    ctx.stroke();

    if (data.di_px !== null) {
      // Imagen virtual a la izquierda de V
      const imgX = vx + data.di_px;
      const imgY = cy - data.hi_px;
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.moveTo(vx, cy);
      ctx.lineTo(imgX, imgY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlaneRays(ctx, objX, objY, vx, cy, data) {
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, objY);
    ctx.stroke();

    const imgX = vx - this.mirrorObjectDist; // Virtual a la izquierda
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.moveTo(vx, objY);
    ctx.lineTo(imgX, objY);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b82f6';
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, cy);
    const reflY = cy + (cy - objY);
    ctx.lineTo(objX, reflY);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
    ctx.moveTo(vx, cy);
    ctx.lineTo(imgX, objY);
    ctx.stroke();
    ctx.restore();
  }

  /* ==========================================================================
     RENDERIZADO MODO BANCO DE LENTES DELGADAS
     ========================================================================== */
  renderLenses() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cy = this.originY;
    const lx = w * 0.5; // Centro óptico de la lente

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(1, '#0e172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Eje Óptico Principal
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const data = this.calculateLensesPhysics();
    const f_px = this.lensFocalLength;
    const do_px = this.lensObjectDist;
    const ho_px = this.lensObjectHeight;

    const f1_x = lx - f_px;
    const f2_x = lx + f_px;

    // Dibujar la lente delgada física
    this.drawThinLensProfile(ctx, lx, cy, 240);

    // Puntos focales F y F'
    this.drawCardinalPoint(ctx, lx, cy, 'O', '#38bdf8');
    this.drawCardinalPoint(ctx, f1_x, cy, 'F₁', '#f59e0b');
    this.drawCardinalPoint(ctx, f2_x, cy, 'F₂', '#f59e0b');

    // Objeto (Flecha dorada)
    const objX = lx - do_px;
    const objY = cy - ho_px;
    this.drawArrow(ctx, objX, cy, objX, objY, '#f59e0b', 4, 'Objeto (do)');

    // Trazado de dos rayos principales de lentes delgadas
    this.drawLensRays(ctx, objX, objY, lx, cy, f1_x, f2_x, data);

    // Dibujar imagen formada
    if (data.di_px !== null) {
      let imgX, isReal;
      if (this.lensType === 'converging') {
        isReal = data.di_px > 0;
        imgX = isReal ? lx + data.di_px : lx - Math.abs(data.di_px);
      } else {
        isReal = false;
        imgX = lx - Math.abs(data.di_px);
      }
      const imgY = cy - data.hi_px;
      const imgColor = isReal ? '#10b981' : '#06b6d4';
      const label = isReal ? 'Imagen Real' : 'Imagen Virtual';
      this.drawArrow(ctx, imgX, cy, imgX, imgY, imgColor, 3, label, !isReal);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💡 Arrastra la flecha naranja para mover el objeto frente a la lente', 16, 24);
  }

  drawThinLensProfile(ctx, lx, cy, height) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(lx, cy - height / 2);
    ctx.lineTo(lx, cy + height / 2);
    ctx.stroke();

    // Flechas en los extremos: convergente hacia afuera, divergente hacia adentro
    if (this.lensType === 'converging') {
      this.drawArrowhead(ctx, lx, cy - height / 2, -Math.PI / 2, '#38bdf8', 7);
      this.drawArrowhead(ctx, lx, cy + height / 2, Math.PI / 2, '#38bdf8', 7);
    } else {
      this.drawArrowhead(ctx, lx, cy - height / 2, Math.PI / 2, '#38bdf8', 7);
      this.drawArrowhead(ctx, lx, cy + height / 2, -Math.PI / 2, '#38bdf8', 7);
    }
    ctx.restore();
  }

  drawLensRays(ctx, objX, objY, lx, cy, f1_x, f2_x, data) {
    ctx.save();

    // Rayo 1 (Paralelo al eje): entra paralelo, se refracta pasando por el foco F2 (convergente) o divergente desde F1
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(lx, objY);
    ctx.stroke();

    if (this.lensType === 'converging') {
      const slope1 = (cy - objY) / (f2_x - lx);
      const endX1 = this.width - 20;
      const endY1 = objY + slope1 * (endX1 - lx);
      ctx.beginPath();
      ctx.moveTo(lx, objY);
      ctx.lineTo(endX1, endY1);
      ctx.stroke();

      if (data.di_px !== null && data.di_px < 0) {
        const imgX = lx - Math.abs(data.di_px);
        const imgY = cy - data.hi_px;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.moveTo(lx, objY);
        ctx.lineTo(imgX, imgY);
        ctx.stroke();
      }
    } else {
      // Divergente: refracta divergiendo como si saliera del foco F1 (a la izquierda)
      const slopeDiv = (objY - cy) / (lx - f1_x);
      const endXDiv = this.width - 20;
      const endYDiv = objY + slopeDiv * (endXDiv - lx);
      ctx.beginPath();
      ctx.moveTo(lx, objY);
      ctx.lineTo(endXDiv, endYDiv);
      ctx.stroke();

      // Prolongación punteada hacia F1
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.moveTo(lx, objY);
      ctx.lineTo(f1_x, cy);
      ctx.stroke();
    }

    // Rayo 2 (Por el centro óptico): pasa en línea recta por (lx, cy) sin desviación
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.strokeStyle = '#3b82f6';
    const slope2 = (cy - objY) / (lx - objX);
    const endX2 = this.width - 20;
    const endY2 = cy + slope2 * (endX2 - lx);
    ctx.moveTo(objX, objY);
    ctx.lineTo(endX2, endY2);
    ctx.stroke();

    if (data.di_px !== null && data.di_px < 0) {
      const imgX = lx - Math.abs(data.di_px);
      const startXLeft = 20;
      const startYLeft = cy - slope2 * (lx - startXLeft);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.moveTo(objX, objY);
      ctx.lineTo(imgX, cy - data.hi_px);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ==========================================================================
     RENDERIZADO MODO OJO HUMANO & LENTES CORRECTIVAS
     ========================================================================== */
  renderEye() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cy = this.originY;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060d1f');
    bgGrad.addColorStop(1, '#0c1a30');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const eyeCenterX = w * 0.65;
    const eyeRadiusX = this.eyeCondition === 'myopia' ? 125 : (this.eyeCondition === 'hyperopia' ? 95 : 110);
    const eyeRadiusY = 100;
    const corneaX = eyeCenterX - eyeRadiusX;
    const retinaX = eyeCenterX + eyeRadiusX;

    this.drawEyeAnatomy(ctx, eyeCenterX, cy, eyeRadiusX, eyeRadiusY, corneaX, retinaX);

    const lensX = corneaX - 60;
    if (this.eyeHasLens) {
      this.drawSpectacleLens(ctx, lensX, cy);
    }

    this.drawEyeLightRays(ctx, lensX, corneaX, eyeCenterX, retinaX, cy);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Condición: ${this.eyeCondition.toUpperCase()} ${this.eyeHasLens ? '(CON LENTE CORRECTIVA)' : '(SIN CORRECCIÓN)'}`, 20, 28);
  }

  drawEyeAnatomy(ctx, cx, cy, rx, ry, corneaX, retinaX) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(241, 245, 249, 0.1)';
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 3, ry - 3, 0, -Math.PI / 2.5, Math.PI / 2.5);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 6;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(retinaX - 3, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15';
    ctx.fill();

    const vitreousGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, rx);
    vitreousGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
    vitreousGrad.addColorStop(1, 'rgba(30, 58, 138, 0.25)');
    ctx.fillStyle = vitreousGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 4, ry - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(corneaX + 22, cy, 48, Math.PI - 0.9, Math.PI + 0.9);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.stroke();

    const irisX = corneaX + 28;
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(irisX, cy - 45);
    ctx.lineTo(irisX, cy - 18);
    ctx.moveTo(irisX, cy + 18);
    ctx.lineTo(irisX, cy + 45);
    ctx.stroke();

    const lensX = irisX + 12;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(lensX, cy, 10, 32, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Córnea', corneaX + 10, cy - 55);
    ctx.fillText('Cristalino', lensX, cy - 40);
    ctx.fillText('Retina', retinaX - 10, cy - 50);
    ctx.fillText('Fóvea', retinaX + 18, cy + 4);
    ctx.restore();
  }

  drawSpectacleLens(ctx, lx, cy) {
    ctx.save();
    const lh = 75;

    if (this.eyeCondition === 'myopia') {
      ctx.beginPath();
      ctx.moveTo(lx - 8, cy - lh / 2);
      ctx.quadraticCurveTo(lx - 2, cy, lx - 8, cy + lh / 2);
      ctx.lineTo(lx + 8, cy + lh / 2);
      ctx.quadraticCurveTo(lx + 2, cy, lx + 8, cy - lh / 2);
      ctx.closePath();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#34d399';
      ctx.font = '700 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lente Divergente (-2.5 D)', lx, cy - lh / 2 - 8);
    } else if (this.eyeCondition === 'hyperopia') {
      ctx.beginPath();
      ctx.ellipse(lx, cy, 8, lh / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#67e8f9';
      ctx.font = '700 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lente Convergente (+2.5 D)', lx, cy - lh / 2 - 8);
    }
    ctx.restore();
  }

  drawEyeLightRays(ctx, lensX, corneaX, eyeCenterX, retinaX, cy) {
    ctx.save();
    const offsets = [-28, 0, 28];
    const crystallineX = corneaX + 40;

    let focusX = retinaX;

    if (this.eyeCondition === 'myopia') {
      focusX = this.eyeHasLens ? retinaX : retinaX - 42;
    } else if (this.eyeCondition === 'hyperopia') {
      focusX = this.eyeHasLens ? retinaX : retinaX + 42;
    }

    const rayColor = (focusX === retinaX) ? '#10b981' : '#f43f5e';
    ctx.strokeStyle = rayColor;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = rayColor;
    ctx.shadowBlur = 8;

    offsets.forEach(offY => {
      ctx.beginPath();
      ctx.moveTo(30, cy + offY);

      if (this.eyeHasLens) {
        ctx.lineTo(lensX, cy + offY);
        let postLensY = cy + offY;
        if (this.eyeCondition === 'myopia') {
          postLensY += (offY > 0 ? 4 : (offY < 0 ? -4 : 0));
        } else if (this.eyeCondition === 'hyperopia') {
          postLensY += (offY > 0 ? -4 : (offY < 0 ? 4 : 0));
        }
        ctx.lineTo(corneaX, postLensY);
        ctx.lineTo(crystallineX, postLensY);
        ctx.lineTo(focusX, cy);

        if (focusX < retinaX) {
          const slope = (cy - postLensY) / (focusX - crystallineX);
          const hitRetinaY = cy + slope * (retinaX - focusX);
          ctx.lineTo(retinaX, hitRetinaY);
        }
      } else {
        ctx.lineTo(corneaX, cy + offY);
        ctx.lineTo(crystallineX, cy + offY);
        ctx.lineTo(focusX, cy);

        if (focusX < retinaX) {
          const slope = (cy - (cy + offY)) / (focusX - crystallineX);
          const hitRetinaY = cy + slope * (retinaX - focusX);
          ctx.lineTo(retinaX, hitRetinaY);
        }
      }
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.arc(focusX, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = rayColor;
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.font = '700 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    if (focusX === retinaX) {
      ctx.fillStyle = '#34d399';
      ctx.fillText('✨ ¡Foco Perfecto en la Retina (Visión Nítida)!', eyeCenterX, cy + 70);
    } else if (focusX < retinaX) {
      ctx.fillStyle = '#f87171';
      ctx.fillText('❌ Foco Anterior a la Retina (Desenfoque Miope)', eyeCenterX, cy + 70);
    } else {
      ctx.fillStyle = '#fb923c';
      ctx.fillText('❌ Foco Posterior a la Retina (Desenfoque Hipermétrope)', eyeCenterX, cy + 70);
    }
    ctx.restore();
  }

  drawArrowhead(ctx, x, y, angle, color, size = 6) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size * 1.5, -size);
    ctx.lineTo(-size * 1.5, size);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  startAnimationLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Exponer globalmente
window.OpticalSimulator = OpticalSimulator;

/* ==========================================================================
   SIMULADOR INTERACTIVO DEDICADO PARA LA HOJA 4 (ESPEJOS Y LENTES DELGADAS)
   Coordinación: Luis Hernando Blandón Dávila — PAFEM Física
   ========================================================================== */
class Sheet4MirrorLensSimulator {
  constructor(canvasId = 'sheet4OpticalCanvas') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.mode = 'concave'; // 'concave', 'convex', 'plane', 'converging', 'diverging'
    this.do_cm = 30.0;
    this.ho_cm = 10.0;
    this.f_cm = 20.0;
    this.scale = 5.5; // 5.5 px per cm

    this.isDragging = false;
    this.initCanvas();
    this.bindEvents();
    this.updateTelemetry();
    this.render();
  }

  initCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.render();
    });
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width || 800;
    this.height = rect.height || 310;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.originX = this.width / 2;
    this.originY = this.height / 2;
  }

  bindEvents() {
    // Botones de Modo (5 Opciones)
    document.querySelectorAll('.s4-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.s4-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setMode(btn.dataset.s4Mode);
      });
    });

    // Deslizadores
    const sDo = document.getElementById('s4SliderDo');
    const sHo = document.getElementById('s4SliderHo');
    const sF = document.getElementById('s4SliderF');
    const vDo = document.getElementById('s4ValDo');
    const vHo = document.getElementById('s4ValHo');
    const vF = document.getElementById('s4ValF');

    if (sDo) {
      sDo.addEventListener('input', (e) => {
        this.do_cm = parseFloat(e.target.value);
        if (vDo) vDo.textContent = `${this.do_cm.toFixed(1)} cm`;
        this.updateTelemetry();
        this.render();
      });
    }

    if (sHo) {
      sHo.addEventListener('input', (e) => {
        this.ho_cm = parseFloat(e.target.value);
        if (vHo) vHo.textContent = `${this.ho_cm.toFixed(1)} cm`;
        this.updateTelemetry();
        this.render();
      });
    }

    if (sF) {
      sF.addEventListener('input', (e) => {
        this.f_cm = parseFloat(e.target.value);
        if (vF) vF.textContent = `${this.f_cm.toFixed(1)} cm`;
        this.updateTelemetry();
        this.render();
      });
    }

    // Botón Restablecer
    const btnReset = document.getElementById('btnS4Reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.do_cm = 30.0;
        this.ho_cm = 10.0;
        this.f_cm = 20.0;
        if (sDo) sDo.value = '30.0';
        if (sHo) sHo.value = '10.0';
        if (sF) sF.value = '20.0';
        if (vDo) vDo.textContent = '30.0 cm';
        if (vHo) vHo.textContent = '10.0 cm';
        if (vF) vF.textContent = '20.0 cm';
        this.updateTelemetry();
        this.render();
      });
    }

    // Botón Alternar Infografía Teórica
    const btnToggle = document.getElementById('btnS4ToggleTheory');
    const fig3 = document.getElementById('fig3Card');
    if (btnToggle && fig3) {
      btnToggle.addEventListener('click', () => {
        const isHidden = fig3.style.display === 'none';
        fig3.style.display = isHidden ? 'block' : 'none';
        btnToggle.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i> Ocultar Infografía' : '<i class="fas fa-image"></i> Ver Infografía';
        if (isHidden) {
          fig3.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // Botón Sincronizar al Laboratorio Multimodal de Hoja 6
    const btnSync = document.getElementById('btnS4SyncToLab');
    if (btnSync) {
      btnSync.addEventListener('click', () => {
        if (window.simInstance) {
          if (['concave', 'convex', 'plane'].includes(this.mode)) {
            window.simInstance.setMode('mirrors');
            window.simInstance.setMirrorType(this.mode);
            window.simInstance.setMirrorObjectDist(this.do_cm * 6);
            window.simInstance.setMirrorObjectHeight(this.ho_cm * 6);
            window.simInstance.setMirrorFocalLength(this.f_cm * 6);
          } else {
            window.simInstance.setMode('lenses');
            window.simInstance.setLensType(this.mode);
            window.simInstance.setLensObjectDist(this.do_cm * 6);
            window.simInstance.setLensObjectHeight(this.ho_cm * 6);
            window.simInstance.setLensFocalLength(this.f_cm * 6);
          }
        }
        const sheet6 = document.getElementById('sheet-6');
        if (sheet6) {
          sheet6.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    // Arrastre interactivo con mouse o touch
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const pos = getPos(e);
      const isMirrorMode = ['concave', 'convex', 'plane'].includes(this.mode);
      const elementX = isMirrorMode ? this.width * 0.28 : this.width * 0.50;
      const objX = isMirrorMode ? elementX + this.do_cm * this.scale : elementX - this.do_cm * this.scale;
      const objTipY = this.originY - this.ho_cm * this.scale;
      const dist = Math.hypot(pos.x - objX, pos.y - objTipY);
      if (dist < 45 || Math.abs(pos.x - objX) < 25) {
        this.isDragging = true;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const pos = getPos(e);
      const isMirrorMode = ['concave', 'convex', 'plane'].includes(this.mode);
      const elementX = isMirrorMode ? this.width * 0.28 : this.width * 0.50;
      let newDo;
      if (isMirrorMode) {
        newDo = (pos.x - elementX) / this.scale; // Objeto a la derecha del vértice
      } else {
        newDo = (elementX - pos.x) / this.scale;
      }
      newDo = Math.max(6, Math.min(50, newDo));
      let newHo = (this.originY - pos.y) / this.scale;
      newHo = Math.max(4, Math.min(16, newHo));

      this.do_cm = newDo;
      this.ho_cm = newHo;

      if (sDo) sDo.value = newDo.toFixed(1);
      if (sHo) sHo.value = newHo.toFixed(1);
      if (vDo) vDo.textContent = `${newDo.toFixed(1)} cm`;
      if (vHo) vHo.textContent = `${newHo.toFixed(1)} cm`;

      this.updateTelemetry();
      this.render();
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener('touchstart', (e) => {
      const pos = getPos(e);
      const isMirrorMode = ['concave', 'convex', 'plane'].includes(this.mode);
      const elementX = isMirrorMode ? this.width * 0.28 : this.width * 0.50;
      const objX = isMirrorMode ? elementX + this.do_cm * this.scale : elementX - this.do_cm * this.scale;
      const objTipY = this.originY - this.ho_cm * this.scale;
      const dist = Math.hypot(pos.x - objX, pos.y - objTipY);
      if (dist < 50 || Math.abs(pos.x - objX) < 30) {
        this.isDragging = true;
        e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!this.isDragging) return;
      e.preventDefault();
      const pos = getPos(e);
      const isMirrorMode = ['concave', 'convex', 'plane'].includes(this.mode);
      const elementX = isMirrorMode ? this.width * 0.28 : this.width * 0.50;
      let newDo;
      if (isMirrorMode) {
        newDo = (pos.x - elementX) / this.scale; // Objeto a la derecha del vértice
      } else {
        newDo = (elementX - pos.x) / this.scale;
      }
      newDo = Math.max(6, Math.min(50, newDo));
      let newHo = (this.originY - pos.y) / this.scale;
      newHo = Math.max(4, Math.min(16, newHo));

      this.do_cm = newDo;
      this.ho_cm = newHo;

      if (sDo) sDo.value = newDo.toFixed(1);
      if (sHo) sHo.value = newHo.toFixed(1);
      if (vDo) vDo.textContent = `${newDo.toFixed(1)} cm`;
      if (vHo) vHo.textContent = `${newHo.toFixed(1)} cm`;

      this.updateTelemetry();
      this.render();
    }, { passive: false });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  setMode(mode) {
    this.mode = mode;
    this.updateTelemetry();
    this.render();
  }

  calculatePhysics() {
    const do_cm = this.do_cm;
    const ho_cm = this.ho_cm;
    let f_cm = this.f_cm;

    let di_cm = null;
    let M = null;
    let hi_cm = null;
    let nature = '';
    let specialLabel = 'Radio (R)';
    let specialVal = `${(this.f_cm * 2).toFixed(1)} cm`;

    if (this.mode === 'concave') {
      f_cm = this.f_cm;
      specialLabel = 'Radio de Curvatura (R)';
      specialVal = `${(f_cm * 2).toFixed(1)} cm`;
      if (Math.abs(do_cm - f_cm) < 0.2) {
        di_cm = null;
        M = null;
        nature = 'En el Infinito (Rayos paralelos)';
      } else {
        di_cm = (f_cm * do_cm) / (do_cm - f_cm);
        M = -di_cm / do_cm;
        hi_cm = M * ho_cm;
        nature = di_cm > 0 ? 'Real — Invertida (' + (Math.abs(M) > 1.05 ? 'Mayor' : (Math.abs(M) < 0.95 ? 'Menor' : 'Igual')) + ')'
                           : 'Virtual — Derecha (Mayor)';
      }
    } else if (this.mode === 'convex') {
      f_cm = -this.f_cm;
      specialLabel = 'Radio de Curvatura (R)';
      specialVal = `${(Math.abs(f_cm) * 2).toFixed(1)} cm`;
      di_cm = (f_cm * do_cm) / (do_cm - f_cm);
      M = -di_cm / do_cm;
      hi_cm = M * ho_cm;
      nature = 'Virtual — Derecha (Menor)';
    } else if (this.mode === 'plane') {
      f_cm = Infinity;
      specialLabel = 'Radio (R)';
      specialVal = 'R = ∞';
      di_cm = -do_cm;
      M = 1.0;
      hi_cm = ho_cm;
      nature = 'Virtual — Derecha (Mismo tamaño)';
    } else if (this.mode === 'converging') {
      f_cm = this.f_cm;
      const power = 100 / f_cm;
      specialLabel = 'Potencia Óptica (P)';
      specialVal = `+${power.toFixed(2)} D`;
      if (Math.abs(do_cm - f_cm) < 0.2) {
        di_cm = null;
        M = null;
        nature = 'En el Infinito (Rayos paralelos)';
      } else {
        di_cm = (f_cm * do_cm) / (do_cm - f_cm);
        M = -di_cm / do_cm;
        hi_cm = M * ho_cm;
        nature = di_cm > 0 ? 'Real — Invertida (' + (Math.abs(M) > 1.05 ? 'Mayor' : (Math.abs(M) < 0.95 ? 'Menor' : 'Igual')) + ')'
                           : 'Virtual — Derecha (Mayor, Lupa)';
      }
    } else if (this.mode === 'diverging') {
      f_cm = -this.f_cm;
      const power = -100 / Math.abs(f_cm);
      specialLabel = 'Potencia Óptica (P)';
      specialVal = `${power.toFixed(2)} D`;
      di_cm = (f_cm * do_cm) / (do_cm - f_cm);
      M = -di_cm / do_cm;
      hi_cm = M * ho_cm;
      nature = 'Virtual — Derecha (Menor)';
    }

    return {
      do_cm,
      ho_cm,
      f_cm,
      di_cm,
      M,
      hi_cm,
      nature,
      specialLabel,
      specialVal
    };
  }

  updateTelemetry() {
    const phys = this.calculatePhysics();
    const tDi = document.getElementById('s4TelemetryDi');
    const tM = document.getElementById('s4TelemetryM');
    const tSpecLabel = document.getElementById('s4LabelSpecial');
    const tSpecVal = document.getElementById('s4TelemetrySpecial');
    const tNat = document.getElementById('s4TelemetryNature');

    if (tDi) tDi.textContent = phys.di_cm !== null ? `${phys.di_cm > 0 ? '+' : ''}${phys.di_cm.toFixed(1)} cm` : '∞ (Infinito)';
    if (tM) tM.textContent = phys.M !== null ? `${phys.M.toFixed(2)}x` : '—';
    if (tSpecLabel) tSpecLabel.textContent = phys.specialLabel;
    if (tSpecVal) tSpecVal.textContent = phys.specialVal;
    if (tNat) {
      tNat.textContent = phys.nature;
      tNat.style.color = (phys.di_cm !== null && phys.di_cm > 0) ? '#10b981' : '#06b6d4';
    }
  }

  render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cy = this.originY;

    ctx.clearRect(0, 0, w, h);

    // Fondo degradado
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0f1d');
    bg.addColorStop(1, '#0e172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Eje Óptico Principal
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const isMirror = ['concave', 'convex', 'plane'].includes(this.mode);
    const elementX = isMirror ? w * 0.28 : w * 0.50;
    const phys = this.calculatePhysics();
    const f_px = Math.abs(phys.f_cm) * this.scale;
    const do_px = phys.do_cm * this.scale;
    const ho_px = phys.ho_cm * this.scale;

    // Dibujar el elemento óptico
    ctx.save();
    if (this.mode === 'concave') {
      // Espejo Cóncavo: concavidad reflectora abierta a la derecha hacia el objeto
      ctx.beginPath();
      ctx.arc(elementX + 280, cy, 280, Math.PI - 0.40, Math.PI + 0.40);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Hachurado detrás del espejo cóncavo (a la izquierda)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2;
      for (let y = cy - 100; y <= cy + 100; y += 10) {
        const arcX = elementX + 280 - Math.sqrt(Math.max(0, 280 * 280 - (y - cy) * (y - cy)));
        ctx.beginPath();
        ctx.moveTo(arcX, y);
        ctx.lineTo(arcX - 10, y - 6);
        ctx.stroke();
      }

      this.drawPoint(ctx, elementX, cy, 'V', '#38bdf8');
      this.drawPoint(ctx, elementX + f_px, cy, 'F', '#f59e0b');
      this.drawPoint(ctx, elementX + 2 * f_px, cy, 'C', '#a855f7');
    } else if (this.mode === 'convex') {
      // Espejo Convexo: curvatura reflectora convexa hacia la derecha hacia el objeto
      ctx.beginPath();
      ctx.arc(elementX - 280, cy, 280, -0.40, 0.40);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.stroke();

      // Hachurado detrás del espejo convexo (a la izquierda)
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2;
      for (let y = cy - 100; y <= cy + 100; y += 10) {
        const arcX = elementX - 280 + Math.sqrt(Math.max(0, 280 * 280 - (y - cy) * (y - cy)));
        ctx.beginPath();
        ctx.moveTo(arcX, y);
        ctx.lineTo(arcX - 10, y - 6);
        ctx.stroke();
      }

      this.drawPoint(ctx, elementX, cy, 'V', '#38bdf8');
      this.drawPoint(ctx, elementX - f_px, cy, 'F', '#f59e0b');
      this.drawPoint(ctx, elementX - 2 * f_px, cy, 'C', '#a855f7');
    } else if (this.mode === 'plane') {
      ctx.beginPath();
      ctx.moveTo(elementX, cy - 110);
      ctx.lineTo(elementX, cy + 110);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.2;
      for (let y = cy - 105; y <= cy + 105; y += 10) {
        ctx.beginPath();
        ctx.moveTo(elementX, y);
        ctx.lineTo(elementX - 10, y - 6);
        ctx.stroke();
      }

      this.drawPoint(ctx, elementX, cy, 'V', '#38bdf8');
    } else if (this.mode === 'converging') {
      // Lente biconvexa
      ctx.beginPath();
      ctx.arc(elementX - 220, cy, 240, -0.28, 0.28);
      ctx.arc(elementX + 220, cy, 240, Math.PI - 0.28, Math.PI + 0.28);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
      this.drawPoint(ctx, elementX, cy, 'O', '#38bdf8');
      this.drawPoint(ctx, elementX - f_px, cy, 'F₁', '#f59e0b');
      this.drawPoint(ctx, elementX + f_px, cy, 'F₂', '#f59e0b');
    } else if (this.mode === 'diverging') {
      // Lente bicóncava
      ctx.beginPath();
      ctx.moveTo(elementX - 16, cy - 110);
      ctx.lineTo(elementX + 16, cy - 110);
      ctx.quadraticCurveTo(elementX + 4, cy, elementX + 16, cy + 110);
      ctx.lineTo(elementX - 16, cy + 110);
      ctx.quadraticCurveTo(elementX - 4, cy, elementX - 16, cy - 110);
      ctx.closePath();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.stroke();
      this.drawPoint(ctx, elementX, cy, 'O', '#38bdf8');
      this.drawPoint(ctx, elementX - f_px, cy, 'F₁', '#f59e0b');
      this.drawPoint(ctx, elementX + f_px, cy, 'F₂', '#f59e0b');
    }
    ctx.restore();

    // Dibujar Objeto (Flecha dorada)
    // En espejos: el objeto SIEMPRE se dibuja a la derecha del vértice
    const objX = isMirror ? elementX + do_px : elementX - do_px;
    const objY = cy - ho_px;
    this.drawArrow(ctx, objX, cy, objX, objY, '#f59e0b', 3.5, 'Objeto (do)');

    // Trazado de los dos rayos principales
    if (isMirror) {
      this.drawMirrorRays(ctx, objX, objY, elementX, cy, f_px, phys);
    } else {
      this.drawLensRays(ctx, objX, objY, elementX, cy, f_px, phys);
    }

    // Dibujar Imagen si existe
    if (phys.di_cm !== null) {
      let imgX;
      if (isMirror) {
        // En espejos: di > 0 real a la derecha; di < 0 virtual a la izquierda
        imgX = elementX + phys.di_cm * this.scale;
      } else {
        imgX = elementX + phys.di_cm * this.scale;
      }
      const imgY = cy - phys.hi_cm * this.scale;
      const isReal = phys.di_cm > 0;
      const col = isReal ? '#10b981' : '#06b6d4';
      const label = isReal ? 'Imagen Real' : 'Imagen Virtual';
      this.drawArrow(ctx, imgX, cy, imgX, imgY, col, 3, label, !isReal);
    }

    // Leyenda de ayuda
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '11px "Outfit", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💡 Arrastra la flecha dorada con el mouse/dedo para mover la distancia do o altura ho', 15, 20);
  }

  drawPoint(ctx, x, y, label, col) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 10px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 8);
    ctx.restore();
  }

  drawArrow(ctx, x1, y1, x2, y2, col, w, label, dashed = false) {
    ctx.save();
    ctx.beginPath();
    if (dashed) ctx.setLineDash([4, 4]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.stroke();

    // Cabeza de flecha
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8 * Math.cos(angle - Math.PI / 6), y2 - 8 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - 8 * Math.cos(angle + Math.PI / 6), y2 - 8 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();

    ctx.fillStyle = col;
    ctx.font = '700 10px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x2, y2 + (y2 < y1 ? -10 : 16));
    ctx.restore();
  }

  drawMirrorRays(ctx, objX, objY, vx, cy, f_px, phys) {
    ctx.save();
    const endX = this.width - 20;

    // Rayo 1: Paralelo al eje (sale a la izquierda hacia el espejo en vx)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(vx, objY);
    ctx.stroke();

    if (this.mode === 'concave') {
      const fx = vx + f_px; // Foco a la DERECHA del vértice
      const slope = (cy - objY) / (fx - vx);
      const endY = objY + slope * (endX - vx);
      ctx.beginPath();
      ctx.moveTo(vx, objY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Prolongación virtual si di < 0 (hacia la izquierda, detrás del espejo)
      if (phys.di_cm !== null && phys.di_cm < 0) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#06b6d4';
        const imgX = vx + phys.di_cm * this.scale;
        const imgY = cy - phys.hi_cm * this.scale;
        ctx.moveTo(vx, objY);
        ctx.lineTo(imgX, imgY);
        ctx.stroke();
      }

      // Rayo 2: Hacia el vértice V -> se refleja simétrico hacia la derecha
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8';
      ctx.setLineDash([]);
      ctx.moveTo(objX, objY);
      ctx.lineTo(vx, cy);
      const slope2 = (cy - objY) / (objX - vx);
      const reflEndY = cy + slope2 * (endX - vx);
      ctx.lineTo(endX, reflEndY);
      ctx.stroke();

      if (phys.di_cm !== null && phys.di_cm < 0) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#06b6d4';
        const imgX = vx + phys.di_cm * this.scale;
        const imgY = cy - phys.hi_cm * this.scale;
        ctx.moveTo(vx, cy);
        ctx.lineTo(imgX, imgY);
        ctx.stroke();
      }
    } else if (this.mode === 'convex') {
      const fx = vx - f_px; // Foco a la IZQUIERDA del vértice
      const slope = (objY - cy) / (vx - fx);
      const endY = objY + slope * (endX - vx);
      ctx.beginPath();
      ctx.moveTo(vx, objY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Prolongación virtual hacia F a la izquierda
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#06b6d4';
      ctx.moveTo(vx, objY);
      ctx.lineTo(fx, cy);
      ctx.stroke();

      // Rayo 2: Hacia V -> se refleja simétrico hacia la derecha
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#38bdf8';
      ctx.moveTo(objX, objY);
      ctx.lineTo(vx, cy);
      const slope2 = (cy - objY) / (objX - vx);
      ctx.lineTo(endX, cy + slope2 * (endX - vx));
      ctx.stroke();

      // Prolongación virtual del rayo 2 hacia la izquierda al punto imagen
      if (phys.di_cm !== null) {
        const imgX = vx + phys.di_cm * this.scale;
        const imgY = cy - phys.hi_cm * this.scale;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#06b6d4';
        ctx.moveTo(vx, cy);
        ctx.lineTo(imgX, imgY);
        ctx.stroke();
      }
    } else if (this.mode === 'plane') {
      // Espejo plano
      ctx.beginPath();
      ctx.moveTo(vx, objY);
      ctx.lineTo(objX, objY);
      ctx.stroke();

      const imgX = vx - phys.do_cm * this.scale; // Virtual a la izquierda
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#06b6d4';
      ctx.moveTo(vx, objY);
      ctx.lineTo(imgX, objY);
      ctx.stroke();

      // Rayo a V
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#38bdf8';
      ctx.moveTo(objX, objY);
      ctx.lineTo(vx, cy);
      ctx.lineTo(objX, cy + (cy - objY));
      ctx.stroke();

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#06b6d4';
      ctx.moveTo(vx, cy);
      ctx.lineTo(imgX, objY);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLensRays(ctx, objX, objY, lx, cy, f_px, phys) {
    ctx.save();
    // Rayo 1: Paralelo -> se refracta por F2 (o divergiendo desde F1)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(objX, objY);
    ctx.lineTo(lx, objY);
    ctx.stroke();

    if (this.mode === 'converging') {
      const f2x = lx + f_px;
      const slope = (cy - objY) / (f2x - lx);
      const endX = this.width - 20;
      const endY = objY + slope * (endX - lx);
      ctx.beginPath();
      ctx.moveTo(lx, objY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      if (phys.di_cm !== null && phys.di_cm < 0) {
        // Prolongación virtual hacia atrás
        const imgX = lx + phys.di_cm * this.scale;
        const imgY = cy - phys.hi_cm * this.scale;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#06b6d4';
        ctx.moveTo(lx, objY);
        ctx.lineTo(imgX, imgY);
        ctx.stroke();
      }

      // Rayo 2: Recto por el centro O
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#38bdf8';
      ctx.moveTo(objX, objY);
      ctx.lineTo(lx, cy);
      ctx.lineTo(endX, cy + ((cy - objY) / (lx - objX)) * (endX - lx));
      ctx.stroke();

      if (phys.di_cm !== null && phys.di_cm < 0) {
        const imgX = lx + phys.di_cm * this.scale;
        const imgY = cy - phys.hi_cm * this.scale;
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#06b6d4';
        ctx.moveTo(lx, cy);
        ctx.lineTo(imgX, imgY);
        ctx.stroke();
      }
    } else if (this.mode === 'diverging') {
      const f1x = lx - f_px;
      const slope = (objY - cy) / (lx - f1x);
      const endX = this.width - 20;
      const endY = objY + slope * (endX - lx);
      ctx.beginPath();
      ctx.moveTo(lx, objY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Prolongación virtual hacia F1
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#06b6d4';
      ctx.moveTo(lx, objY);
      ctx.lineTo(f1x, cy);
      ctx.stroke();

      // Rayo 2: Recto por O
      ctx.beginPath();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#38bdf8';
      ctx.moveTo(objX, objY);
      ctx.lineTo(lx, cy);
      ctx.lineTo(endX, cy + ((cy - objY) / (lx - objX)) * (endX - lx));
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Exponer globalmente
window.Sheet4MirrorLensSimulator = Sheet4MirrorLensSimulator;

