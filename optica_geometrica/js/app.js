/* ==========================================================================
   APLICACIÓN PRINCIPAL: CONTROLADOR GENERAL Y EXPERIENCIA DE USUARIO
   Coordinación: Luis Hernando Blandón Dávila — Coordinador de Física PAFEM
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar Simulador Óptico Multimodal (Laboratorio Hoja 6)
  const sim = new OpticalSimulator('opticalCanvas');
  window.simInstance = sim;

  // 1.1 Inicializar Simulador Interactivo de Espejos y Lentes (Hoja 4)
  const s4Sim = new Sheet4MirrorLensSimulator('sheet4OpticalCanvas');
  window.sheet4Sim = s4Sim;

  // 2. Inicializar Gestor de Taller y Respuestas
  QuizManager.init();

  // 3. Inicializar Navegación entre Hojas (Paginación 1 a 8 con progreso)
  initNavigation();

  // 4. Conectar Controles del Simulador con la UI (Snell, Espejos, Lentes y Ojo)
  initSimulatorControls(sim);

  // 5. Inicializar Explorador Anatómico del Ojo Humano
  initEyeAnatomyExplorer();

  // 6. Inicializar Acciones de Exportación a PDF y Envío
  initExportAndSubmission();

  // 7. Inicializar Gestor de 5 Temas Visuales
  initThemeManager();

  // 8. Inicializar Visualizador de Imágenes en Pantalla Completa (Lightbox)
  initImageLightbox();

  // 9. Renderizar Fórmulas KaTeX si está disponible
  renderKaTeXFormulas();

  // 10. Botón flotante para volver arriba y barra de progreso
  initBackToTopAndProgress();

  // 11. Inicializar Botones de Acción de Portada ("Iniciar Taller" y "Validar Datos")
  initCoverActions();
});

/* ==========================================================================
   NAVEGACIÓN ENTRE HOJAS TAMAÑO CARTA Y BARRA DE PROGRESO
   ========================================================================== */
function initNavigation() {
  const tabs = document.querySelectorAll('.nav-tab-btn');
  const sheets = document.querySelectorAll('.sheet-page');

  function goToSheet(pageId) {
    tabs.forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`.nav-tab-btn[data-page="${pageId}"]`);
    if (activeTab) activeTab.classList.add('active');

    const targetSheet = document.getElementById(pageId);
    if (targetSheet) {
      const navHeight = document.querySelector('.top-navbar')?.offsetHeight || 60;
      const targetPos = targetSheet.getBoundingClientRect().top + window.pageYOffset - navHeight - 15;
      window.scrollTo({
        top: targetPos,
        behavior: 'smooth'
      });

      if (pageId === 'sheet-4' && window.sheet4Sim) {
        setTimeout(() => {
          window.sheet4Sim.resizeCanvas();
          window.sheet4Sim.render();
        }, 250);
      }
      if (pageId === 'sheet-6' && window.simInstance) {
        setTimeout(() => {
          window.simInstance.resizeCanvas();
          window.simInstance.render();
        }, 250);
      }
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      goToSheet(tab.dataset.page);
    });
  });

  // Botones de paso Anterior / Siguiente al pie de cada hoja
  document.querySelectorAll('.btn-nav-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.navTarget;
      if (target) goToSheet(target);
    });
  });

  // Botones de acceso directo en barra superior: Sim. Espejos y Sim. Lentes
  const btnQuickMirrors = document.getElementById('btnNavQuickMirrors');
  const btnQuickLenses = document.getElementById('btnNavQuickLenses');
  const btnGoMirrorFromH2 = document.getElementById('btnGoToMirrorSimFromH2');

  if (btnQuickMirrors) {
    btnQuickMirrors.addEventListener('click', () => {
      goToSheet('sheet-4');
      if (window.sheet4Sim) {
        window.sheet4Sim.setMode('concave');
        document.querySelectorAll('.s4-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.s4Mode === 'concave');
        });
      }
    });
  }

  if (btnQuickLenses) {
    btnQuickLenses.addEventListener('click', () => {
      goToSheet('sheet-4');
      if (window.sheet4Sim) {
        window.sheet4Sim.setMode('converging');
        document.querySelectorAll('.s4-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.s4Mode === 'converging');
        });
      }
    });
  }

  if (btnGoMirrorFromH2) {
    btnGoMirrorFromH2.addEventListener('click', () => {
      goToSheet('sheet-4');
      if (window.sheet4Sim) {
        window.sheet4Sim.setMode('plane');
        document.querySelectorAll('.s4-mode-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.s4Mode === 'plane');
        });
      }
    });
  }

  // Resaltar pestaña activa al desplazarse
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
        const sheetId = entry.target.id;
        tabs.forEach(tab => {
          tab.classList.toggle('active', tab.dataset.page === sheetId);
        });
      }
    });
  }, { threshold: [0.3] });

  sheets.forEach(sheet => observer.observe(sheet));
}

function initBackToTopAndProgress() {
  const btn = document.getElementById('btnBackToTop');
  const progressBar = document.getElementById('navProgressBar');

  window.addEventListener('scroll', () => {
    const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollTotal > 0 ? (window.pageYOffset / scrollTotal) * 100 : 0;
    if (progressBar) progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    if (btn) {
      btn.style.display = window.pageYOffset > 400 ? 'flex' : 'none';
    }
  });

  if (btn) {
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const btnNavHome = document.getElementById('btnNavHome');
  if (btnNavHome) {
    btnNavHome.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

/* ==========================================================================
   FORMULARIO DE IDENTIFICACIÓN: VALIDAR DATOS E INICIAR TALLER
   ========================================================================== */
function initCoverActions() {
  const btnStart = document.getElementById('btnStartWorkshop');
  const btnValidate = document.getElementById('btnValidateData');
  const inputName = document.getElementById('inputStudentName');

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      const sheet2 = document.getElementById('sheet-2');
      if (sheet2) {
        const navHeight = document.querySelector('.top-navbar')?.offsetHeight || 60;
        window.scrollTo({
          top: sheet2.getBoundingClientRect().top + window.pageYOffset - navHeight - 15,
          behavior: 'smooth'
        });
      }
    });
  }

  if (btnValidate) {
    btnValidate.addEventListener('click', () => {
      const name = inputName ? inputName.value.trim() : '';
      if (!name) {
        alert('⚠️ Por favor ingresa tus Nombres y Apellidos Completos antes de validar.');
        if (inputName) inputName.focus();
      } else {
        btnValidate.innerHTML = '<i class="fas fa-check-circle"></i> ¡Datos Validados!';
        btnValidate.style.background = '#16a34a';
        btnValidate.style.color = '#ffffff';
        setTimeout(() => {
          btnValidate.innerHTML = '<i class="fas fa-user-check"></i> Validar Datos';
          btnValidate.style.background = '';
          btnValidate.style.color = '';
        }, 3000);
      }
    });
  }
}

/* ==========================================================================
   EXPLORADOR ANATÓMICO DEL OJO HUMANO
   ========================================================================== */
function initEyeAnatomyExplorer() {
  const structuresData = {
    cornea: {
      name: 'Córnea',
      icon: 'fas fa-shield-alt',
      position: 'Superficie anterior externa del globo ocular',
      nature: 'Tejido transparente y avascular convexo',
      function: 'Aporta aproximadamente dos tercios (+43 D) de la potencia refractiva total del ojo; enfoca inicialmente los rayos de luz hacia la pupila.'
    },
    iris: {
      name: 'Iris',
      icon: 'fas fa-circle-notch',
      position: 'Entre la córnea y el cristalino',
      nature: 'Diafragma muscular pigmentado con melanina',
      function: 'Regula activamente la cantidad de luz que penetra al ojo modificando el diámetro de la pupila (reflejo fotomotor pupilar).'
    },
    pupila: {
      name: 'Pupila',
      icon: 'fas fa-dot-circle',
      position: 'Abertura central en el centro del iris',
      nature: 'Orificio óptico circular adaptable',
      function: 'Actúa como apertura diafragmática de entrada óptica. Se dilata en penumbra (midriasis) y se contrae con luz intensa (miosis).'
    },
    cristalino: {
      name: 'Cristalino',
      icon: 'fas fa-gem',
      position: 'Inmediatamente detrás del iris y pupila',
      nature: 'Lente biconvexa elástica, transparente y avascular',
      function: 'Realiza la acomodación dinámica: varía su curvatura por acción del músculo ciliar para enfocar nítidamente objetos a diferentes distancias.'
    },
    humor_acuoso: {
      name: 'Humor Acuoso',
      icon: 'fas fa-tint',
      position: 'Cámara anterior entre córnea y cristalino',
      nature: 'Líquido límpido con índice de refracción n ≈ 1.336',
      function: 'Mantiene la presión intraocular estable y suministra nutrientes y oxígeno a los tejidos avasculares (córnea y cristalino).'
    },
    humor_vitreo: {
      name: 'Humor Vítreo',
      icon: 'fas fa-water',
      position: 'Cámara posterior entre el cristalino y la retina',
      nature: 'Gel transparente y viscoso (99% agua y colágeno)',
      function: 'Preserva la forma esférica del globo ocular, mantiene la retina adherida a la pared y permite el paso rectilíneo de la luz.'
    },
    retina: {
      name: 'Retina y Fóvea',
      icon: 'fas fa-broadcast-tower',
      position: 'Capa sensorial interna en el fondo del ojo',
      nature: 'Mosaico fotosensible de conos y bastones',
      function: 'Actúa como pantalla biológica receptora. Convierte los fotones luminosos en impulsos electroquímicos que viajan al cerebro.'
    },
    nervio_optico: {
      name: 'Nervio Óptico',
      icon: 'fas fa-network-wired',
      position: 'Polo posterior del globo ocular',
      nature: 'Haz de más de 1.2 millones de axones neuronales',
      function: 'Conduce las señales codificadas desde los fotorreceptores retinianos hacia la corteza visual occipital del cerebro para crear la percepción de imagen.'
    }
  };

  const buttons = document.querySelectorAll('.structure-chip-btn');
  const cardTitle = document.getElementById('structureTitle');
  const cardPosition = document.getElementById('structurePosition');
  const cardFunction = document.getElementById('structureFunction');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const id = btn.dataset.structureId;
      const data = structuresData[id];
      if (data && cardTitle && cardPosition && cardFunction) {
        cardTitle.innerHTML = `<i class="${data.icon}"></i> ${data.name}`;
        cardPosition.innerHTML = `<strong>Ubicación:</strong> ${data.position}. <em>(${data.nature})</em>`;
        cardFunction.innerHTML = `<strong>Función Óptica:</strong> ${data.function}`;
      }
    });
  });
}

/* ==========================================================================
   CONEXIÓN DE CONTROLES DEL SIMULADOR MULTIMODAL
   ========================================================================== */
function initSimulatorControls(sim) {
  // Pestañas de modo (Snell, Espejos, Lentes, Ojo Humano)
  document.querySelectorAll('.sim-mode-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      sim.setMode(tab.dataset.mode);
    });
  });

  // Botones de reinicio / restablecer
  document.querySelectorAll('.btn-reset-sim').forEach(btn => {
    btn.addEventListener('click', () => {
      sim.resetExperiment();
    });
  });

  // --------------------------------------------------------------------------
  // CONTROLES MODO 1: SNELL & RIT
  // --------------------------------------------------------------------------
  const sliderTheta1 = document.getElementById('sliderTheta1');
  const valTheta1 = document.getElementById('valTheta1');

  if (sliderTheta1) {
    sliderTheta1.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      if (valTheta1) valTheta1.textContent = `${deg.toFixed(1)}°`;
      sim.setTheta1(deg);
    });
  }

  document.querySelectorAll('[data-angle-adjust]').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = parseFloat(btn.dataset.angleAdjust);
      let newAngle = sim.theta1 + delta;
      newAngle = Math.max(0, Math.min(89.5, newAngle));
      if (sliderTheta1) sliderTheta1.value = newAngle.toFixed(1);
      if (valTheta1) valTheta1.textContent = `${newAngle.toFixed(1)}°`;
      sim.setTheta1(newAngle);
    });
  });

  document.querySelectorAll('[data-quick-angle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const deg = parseFloat(btn.dataset.quickAngle);
      if (sliderTheta1) sliderTheta1.value = deg.toFixed(1);
      if (valTheta1) valTheta1.textContent = `${deg.toFixed(1)}°`;
      sim.setTheta1(deg);
    });
  });

  const btnGoCrit = document.getElementById('btnGoCrit');
  if (btnGoCrit) {
    btnGoCrit.addEventListener('click', () => {
      const phys = sim.calculateSnellPhysics();
      if (phys.criticalAngleDeg !== null) {
        const crit = phys.criticalAngleDeg;
        if (sliderTheta1) sliderTheta1.value = crit.toFixed(1);
        if (valTheta1) valTheta1.textContent = `${crit.toFixed(1)}°`;
        sim.setTheta1(crit);
      }
    });
  }

  const selectMedio1 = document.getElementById('selectMedio1');
  const sliderN1 = document.getElementById('sliderN1');
  const valN1 = document.getElementById('valN1');

  if (selectMedio1) {
    selectMedio1.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      const name = e.target.options[e.target.selectedIndex].text.split('(')[0].trim();
      if (sliderN1) sliderN1.value = val.toFixed(3);
      if (valN1) valN1.textContent = val.toFixed(3);
      sim.setN1(val, name);
    });
  }

  if (sliderN1) {
    sliderN1.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valN1) valN1.textContent = val.toFixed(3);
      sim.setN1(val, 'Personalizado');
      if (selectMedio1) selectMedio1.value = "custom";
    });
  }

  const selectMedio2 = document.getElementById('selectMedio2');
  const sliderN2 = document.getElementById('sliderN2');
  const valN2 = document.getElementById('valN2');

  if (selectMedio2) {
    selectMedio2.addEventListener('change', (e) => {
      const val = parseFloat(e.target.value);
      const name = e.target.options[e.target.selectedIndex].text.split('(')[0].trim();
      if (sliderN2) sliderN2.value = val.toFixed(3);
      if (valN2) valN2.textContent = val.toFixed(3);
      sim.setN2(val, name);
    });
  }

  if (sliderN2) {
    sliderN2.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (valN2) valN2.textContent = val.toFixed(3);
      sim.setN2(val, 'Personalizado');
      if (selectMedio2) selectMedio2.value = "custom";
    });
  }

  const btnSwapMedia = document.getElementById('btnSwapMedia');
  if (btnSwapMedia) {
    btnSwapMedia.addEventListener('click', () => {
      sim.swapMedia();
      if (sliderN1) sliderN1.value = sim.n1.toFixed(3);
      if (valN1) valN1.textContent = sim.n1.toFixed(3);
      if (sliderN2) sliderN2.value = sim.n2.toFixed(3);
      if (valN2) valN2.textContent = sim.n2.toFixed(3);
      if (selectMedio1) selectMedio1.value = "custom";
      if (selectMedio2) selectMedio2.value = "custom";
    });
  }

  const toggleProtractor = document.getElementById('toggleProtractor');
  if (toggleProtractor) {
    toggleProtractor.addEventListener('change', (e) => {
      sim.showProtractor = e.target.checked;
      sim.render();
    });
  }

  const toggleNormal = document.getElementById('toggleNormal');
  if (toggleNormal) {
    toggleNormal.addEventListener('change', (e) => {
      sim.showNormal = e.target.checked;
      sim.render();
    });
  }

  const toggleAngles = document.getElementById('toggleAngles');
  if (toggleAngles) {
    toggleAngles.addEventListener('change', (e) => {
      sim.showAngles = e.target.checked;
      sim.render();
    });
  }

  document.querySelectorAll('.laser-color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.laser-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const color = btn.dataset.color;
      const wave = parseInt(btn.dataset.wavelength);
      sim.setLaserColor(color, wave);
    });
  });

  // --------------------------------------------------------------------------
  // CONTROLES MODO 2: BANCO DE ESPEJOS
  // --------------------------------------------------------------------------
  document.querySelectorAll('[data-mirror-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-mirror-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.setMirrorType(btn.dataset.mirrorType);
    });
  });

  const sliderMirrorDist = document.getElementById('sliderMirrorDist');
  const valMirrorDist = document.getElementById('valMirrorDist');
  if (sliderMirrorDist) {
    sliderMirrorDist.addEventListener('input', (e) => {
      const cm = parseFloat(e.target.value);
      if (valMirrorDist) valMirrorDist.textContent = `${cm.toFixed(1)} cm`;
      sim.setMirrorObjectDist(cm * 6);
    });
  }

  const sliderMirrorHeight = document.getElementById('sliderMirrorHeight');
  const valMirrorHeight = document.getElementById('valMirrorHeight');
  if (sliderMirrorHeight) {
    sliderMirrorHeight.addEventListener('input', (e) => {
      const cm = parseFloat(e.target.value);
      if (valMirrorHeight) valMirrorHeight.textContent = `${cm.toFixed(1)} cm`;
      sim.setMirrorObjectHeight(cm * 6);
    });
  }

  const sliderMirrorFocal = document.getElementById('sliderMirrorFocal');
  const valMirrorFocal = document.getElementById('valMirrorFocal');
  if (sliderMirrorFocal) {
    sliderMirrorFocal.addEventListener('input', (e) => {
      const cm = parseFloat(e.target.value);
      if (valMirrorFocal) valMirrorFocal.textContent = `${cm.toFixed(1)} cm`;
      sim.setMirrorFocalLength(cm * 6);
    });
  }

  // --------------------------------------------------------------------------
  // CONTROLES MODO 3: BANCO DE LENTES DELGADAS
  // --------------------------------------------------------------------------
  document.querySelectorAll('[data-lens-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-lens-type]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sim.setLensType(btn.dataset.lensType);
    });
  });

  const sliderLensDist = document.getElementById('sliderLensDist');
  const valLensDist = document.getElementById('valLensDist');
  if (sliderLensDist) {
    sliderLensDist.addEventListener('input', (e) => {
      const cm = parseFloat(e.target.value);
      if (valLensDist) valLensDist.textContent = `${cm.toFixed(1)} cm`;
      sim.setLensObjectDist(cm * 6);
    });
  }

  const sliderLensHeight = document.getElementById('sliderLensHeight');
  const valLensHeight = document.getElementById('valLensHeight');
  if (sliderLensHeight) {
    sliderLensHeight.addEventListener('input', (e) => {
      const cm = parseFloat(e.target.value);
      if (valLensHeight) valLensHeight.textContent = `${cm.toFixed(1)} cm`;
      sim.setLensObjectHeight(cm * 6);
    });
  }

  const sliderLensFocal = document.getElementById('sliderLensFocal');
  const valLensFocal = document.getElementById('valLensFocal');
  if (sliderLensFocal) {
    sliderLensFocal.addEventListener('input', (e) => {
      const cm = parseFloat(e.target.value);
      if (valLensFocal) valLensFocal.textContent = `${cm.toFixed(1)} cm`;
      sim.setLensFocalLength(cm * 6);
    });
  }

  // --------------------------------------------------------------------------
  // CONTROLES MODO 4: OJO HUMANO Y LENTES CORRECTIVAS
  // --------------------------------------------------------------------------
  document.querySelectorAll('.eye-cond-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sim.setEyeCondition(btn.dataset.condition);
    });
  });

  const btnToggleEyeLens = document.getElementById('btnToggleEyeLens');
  if (btnToggleEyeLens) {
    btnToggleEyeLens.addEventListener('click', () => {
      sim.toggleEyeLens(!sim.eyeHasLens);
    });
  }
}

/* ==========================================================================
   EXPORTACIÓN A PDF Y ENVÍO DE RESULTADOS
   ========================================================================== */
function initExportAndSubmission() {
  const exportPdfBtns = [document.getElementById('btnExportPdfTop'), document.getElementById('btnExportPdfMain')];
  exportPdfBtns.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', () => {
      generatePdf();
    });
  });

  const btnSubmit = document.getElementById('btnSubmitResults');
  const modal = document.getElementById('modalSubmission');
  const modalClose = document.getElementById('modalCloseBtn');
  const previewBox = document.getElementById('reportPreviewText');

  if (btnSubmit && modal) {
    btnSubmit.addEventListener('click', () => {
      const report = QuizManager.generateTextReport();
      if (previewBox) previewBox.textContent = report;
      modal.classList.add('active');
    });
  }

  if (modalClose && modal) {
    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  const btnCopy = document.getElementById('btnCopyReport');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const report = QuizManager.generateTextReport();
      navigator.clipboard.writeText(report).then(() => {
        btnCopy.innerHTML = '<i class="fas fa-check"></i> ¡Copiado con Éxito!';
        setTimeout(() => {
          btnCopy.innerHTML = '<i class="fas fa-copy"></i> Copiar para WhatsApp / Correo';
        }, 2500);
      });
    });
  }

  const btnDownloadTxt = document.getElementById('btnDownloadTxt');
  if (btnDownloadTxt) {
    btnDownloadTxt.addEventListener('click', () => {
      const report = QuizManager.generateTextReport();
      const stName = QuizManager.answers.student.fullName || 'Estudiante';
      const cleanName = stName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Taller_Optica_PAFEM_${cleanName}.txt`;

      const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

function generatePdf() {
  const studentName = QuizManager.answers.student.fullName || 'Estudiante';
  const cleanName = studentName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Guia_Optica_PAFEM_${cleanName}.pdf`;

  if (window.html2pdf) {
    const element = document.getElementById('sheetsContainer');
    const opt = {
      margin:       [8, 10, 8, 10],
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' }
    };

    const notify = document.createElement('div');
    notify.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1e40af;color:white;padding:12px 24px;border-radius:8px;font-weight:700;z-index:99999;box-shadow:0 10px 25px rgba(0,0,0,0.3);';
    notify.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando documento oficial en Tamaño Carta...';
    document.body.appendChild(notify);

    html2pdf().set(opt).from(element).save().then(() => {
      notify.innerHTML = '<i class="fas fa-check-circle"></i> ¡PDF generado correctamente!';
      notify.style.background = '#166534';
      setTimeout(() => notify.remove(), 2500);
    }).catch(err => {
      console.warn('html2pdf fallback to native print', err);
      notify.remove();
      window.print();
    });
  } else {
    window.print();
  }
}

/* ==========================================================================
   GESTOR DE 5 TEMAS VISUALES
   ========================================================================== */
function initThemeManager() {
  const themeStorageKey = 'PAFEM_SNELL_THEME_CHOICE';
  const themeBtn = document.getElementById('btnThemeMenu');
  const popover = document.getElementById('themeMenuPopover');
  const optionBtns = document.querySelectorAll('[data-set-theme]');
  const allThemes = [
    'theme-dark',
    'theme-light',
    'theme-glassmorphism',
    'theme-neumorphism',
    'theme-bentogrid',
    'theme-minimalism',
    'theme-neobrutalism'
  ];

  if (themeBtn && popover) {
    themeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popover.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && e.target !== themeBtn) {
        popover.classList.remove('active');
      }
    });
  }

  function applyTheme(themeName) {
    allThemes.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(themeName);
    localStorage.setItem(themeStorageKey, themeName);
    if (popover) popover.classList.remove('active');
    if (window.simInstance) window.simInstance.render();
  }

  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.setTheme);
    });
  });

  const savedTheme = localStorage.getItem(themeStorageKey);
  if (savedTheme && allThemes.includes(savedTheme)) {
    applyTheme(savedTheme);
  }
}

/* ==========================================================================
   LIGHTBOX EN PANTALLA COMPLETA
   ========================================================================== */
function initImageLightbox() {
  const triggers = document.querySelectorAll('[data-lightbox-src]');
  const modal = document.getElementById('imageLightboxModal');
  const modalImg = document.getElementById('lightboxImg');
  const modalCaption = document.getElementById('lightboxCaption');
  const closeBtn = document.getElementById('lightboxCloseBtn');
  const downloadBtn = document.getElementById('lightboxDownloadBtn');

  if (!modal || !modalImg) return;

  triggers.forEach(card => {
    card.addEventListener('click', () => {
      modalImg.src = card.dataset.lightboxSrc;
      if (modalCaption) modalCaption.textContent = card.dataset.lightboxCaption || '';
      modal.classList.add('active');
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('active')) modal.classList.remove('active'); });

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = modalImg.src;
      link.download = modalImg.src.split('/').pop() || 'figura_optica.webp';
      link.click();
    });
  }
}

/* ==========================================================================
   RENDERIZADO DE FÓRMULAS CON KATEX
   ========================================================================== */
function renderKaTeXFormulas() {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn('KaTeX render error:', e);
    }
  }
}
