/* ==========================================================================
   TALLER PEDAGÓGICO EVALUATIVO Y GESTIÓN DE RESPUESTAS (MEN DBA & BLOOM)
   Coordinación: Prof. Luis Hernando Blandón Dávila - Coordinador Física PAFEM
   Colegios: I.E. Diego Maya, I.E. Jaime Salazar Robledo, I.E. Hugo Ángel Mejía
   Soporte para modalidad de 5 y 10 preguntas con retroalimentación formativa
   y desglose de solución paso a paso (Datos, Fórmula, Sustitución, Cálculo, etc.)
   ========================================================================== */

const QuizManager = {
  storageKey: 'PAFEM_OPTICS_WORKSHOP_ANSWERS_V3',
  quizMode: '10', // '5' o '10'

  // Respuestas y desarrollos del estudiante
  answers: {
    student: {
      institution: 'I.E. Diego Maya Salazar',
      fullName: '',
      grade: '11°',
      group: '1',
      date: new Date().toLocaleDateString('es-CO')
    },
    questions: {
      q1: { selected: '', notebookNote: '' },
      q2: { selected: '', notebookNote: '' },
      q3: { numericVal: '', stepByStep: '' },
      q4: { numericVal: '', substance: '', stepByStep: '' },
      q5: { explanation: '' },
      q6: { numericCrit: '', observation: '' },
      q7: { numericDi: '', numericM: '', stepByStep: '' },
      q8: { selected: '', argument: '' },
      q9: { selectedMyopia: '', selectedHyperopia: '', explanation: '' },
      q10: { numericPower: '', conclusion: '' }
    }
  },

  init() {
    this.loadFromStorage();
    this.bindInputs();
    this.bindChecks();
    this.bindModeSwitcher();
    this.bindSolutionAccordions();
    this.updateStudentDataInSummary();
  },

  setQuizMode(mode) {
    this.quizMode = mode === '5' ? '5' : '10';
    const btn5 = document.getElementById('btnQuizMode5');
    const btn10 = document.getElementById('btnQuizMode10');

    if (btn5) btn5.classList.toggle('active', this.quizMode === '5');
    if (btn10) btn10.classList.toggle('active', this.quizMode === '10');

    // En modo 5 preguntas, ocultar Q2, Q4, Q5, Q8, Q10 y mostrar Q1, Q3, Q6, Q7, Q9
    const fiveQuestions = ['cardQ1', 'cardQ3', 'cardQ6', 'cardQ7', 'cardQ9'];
    const tenQuestions = ['cardQ1', 'cardQ2', 'cardQ3', 'cardQ4', 'cardQ5', 'cardQ6', 'cardQ7', 'cardQ8', 'cardQ9', 'cardQ10'];

    tenQuestions.forEach(cardId => {
      const card = document.getElementById(cardId);
      if (card) {
        if (this.quizMode === '5') {
          card.style.display = fiveQuestions.includes(cardId) ? 'block' : 'none';
        } else {
          card.style.display = 'block';
        }
      }
    });

    const badgeTotal = document.getElementById('quizTotalBadge');
    if (badgeTotal) badgeTotal.textContent = `${this.quizMode} Preguntas`;
  },

  bindModeSwitcher() {
    const btn5 = document.getElementById('btnQuizMode5');
    const btn10 = document.getElementById('btnQuizMode10');
    if (btn5) btn5.addEventListener('click', () => this.setQuizMode('5'));
    if (btn10) btn10.addEventListener('click', () => this.setQuizMode('10'));
  },

  bindSolutionAccordions() {
    document.querySelectorAll('.solution-accordion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.solutionTarget;
        const box = document.getElementById(targetId);
        if (box) {
          box.classList.toggle('active');
          const isAct = box.classList.contains('active');
          btn.innerHTML = isAct 
            ? '<i class="fas fa-chevron-up"></i> Ocultar Procedimiento' 
            : '<i class="fas fa-calculator"></i> Ver Procedimiento Paso a Paso';
        }
      });
    });
  },

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.answers = { ...this.answers, ...parsed };
        this.populateUIFromState();
      }
    } catch (e) {
      console.warn('No se pudo cargar desde almacenamiento local', e);
    }
  },

  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.answers));
      const saveBadge = document.getElementById('saveIndicator');
      if (saveBadge) {
        saveBadge.textContent = 'Respuestas guardadas automáticamente ✓';
        saveBadge.style.opacity = '1';
        setTimeout(() => { saveBadge.style.opacity = '0.7'; }, 2000);
      }
    } catch (e) {
      console.warn('Error al guardar en almacenamiento local', e);
    }
  },

  populateUIFromState() {
    const st = this.answers.student;
    const elName = document.getElementById('inputStudentName');
    const elSchool = document.getElementById('selectSchool');
    const elCustomSchool = document.getElementById('inputCustomSchool');
    const elGrade = document.getElementById('selectGrade');
    const elGroup = document.getElementById('inputGroup');
    const elDate = document.getElementById('inputDate');

    if (elName && st.fullName) elName.value = st.fullName;
    if (elSchool && st.institution) {
      elSchool.value = st.institution;
      if (st.institution === 'Otra') {
        const wrapCustom = document.getElementById('customSchoolWrapper');
        if (wrapCustom) wrapCustom.style.display = 'block';
        if (elCustomSchool) elCustomSchool.value = st.customSchool || '';
      }
    }
    if (elGrade && st.grade) elGrade.value = st.grade;
    if (elGroup && st.group) elGroup.value = st.group;
    if (elDate && st.date) elDate.value = st.date;

    // Preguntas de selección múltiple (q1, q2, q8, q9)
    ['q1', 'q2', 'q8', 'q9_myopia', 'q9_hyperopia'].forEach(key => {
      const field = key.includes('_') ? key.split('_')[1] : 'selected';
      const qKey = key.includes('_') ? key.split('_')[0] : key;
      const targetVal = this.answers.questions[qKey]?.[field] || this.answers.questions[qKey]?.selected;
      if (targetVal) {
        const radio = document.querySelector(`input[name="${key}"][value="${targetVal}"]`);
        if (radio) {
          radio.checked = true;
          radio.closest('.option-item')?.classList.add('selected');
        }
      }
    });

    // Poblar campos numéricos y de texto
    Object.keys(this.answers.questions).forEach(qKey => {
      const qObj = this.answers.questions[qKey];
      Object.keys(qObj).forEach(fieldKey => {
        const el = document.getElementById(`${qKey}_${fieldKey}`);
        if (el && qObj[fieldKey]) {
          el.value = qObj[fieldKey];
        }
      });
    });
  },

  bindInputs() {
    const elName = document.getElementById('inputStudentName');
    if (elName) {
      elName.addEventListener('input', (e) => {
        this.answers.student.fullName = e.target.value.trim();
        this.saveToStorage();
        this.updateStudentDataInSummary();
      });
    }

    const elSchool = document.getElementById('selectSchool');
    const elCustomSchool = document.getElementById('inputCustomSchool');
    const wrapCustom = document.getElementById('customSchoolWrapper');

    if (elSchool) {
      elSchool.addEventListener('change', (e) => {
        this.answers.student.institution = e.target.value;
        if (e.target.value === 'Otra') {
          if (wrapCustom) wrapCustom.style.display = 'block';
        } else {
          if (wrapCustom) wrapCustom.style.display = 'none';
        }
        this.saveToStorage();
        this.updateStudentDataInSummary();
      });
    }

    if (elCustomSchool) {
      elCustomSchool.addEventListener('input', (e) => {
        this.answers.student.customSchool = e.target.value.trim();
        this.saveToStorage();
        this.updateStudentDataInSummary();
      });
    }

    const elGrade = document.getElementById('selectGrade');
    if (elGrade) {
      elGrade.addEventListener('change', (e) => {
        this.answers.student.grade = e.target.value;
        this.saveToStorage();
      });
    }

    const elGroup = document.getElementById('inputGroup');
    if (elGroup) {
      elGroup.addEventListener('input', (e) => {
        this.answers.student.group = e.target.value;
        this.saveToStorage();
      });
    }

    // Opciones de radio generales
    document.querySelectorAll('.options-grid .option-item').forEach(item => {
      item.addEventListener('click', () => {
        const radio = item.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          const groupName = radio.name;
          document.querySelectorAll(`input[name="${groupName}"]`).forEach(r => {
            r.closest('.option-item')?.classList.remove('selected');
          });
          item.classList.add('selected');

          if (this.answers.questions[groupName]) {
            this.answers.questions[groupName].selected = radio.value;
          } else if (groupName === 'q9_myopia') {
            this.answers.questions.q9.selectedMyopia = radio.value;
          } else if (groupName === 'q9_hyperopia') {
            this.answers.questions.q9.selectedHyperopia = radio.value;
          }
          this.saveToStorage();
        }
      });
    });

    // Inputs de texto y áreas de procedimiento matemático
    document.querySelectorAll('[data-q-input]').forEach(input => {
      input.addEventListener('input', (e) => {
        const [qKey, fieldKey] = e.target.dataset.qInput.split('.');
        if (this.answers.questions[qKey]) {
          this.answers.questions[qKey][fieldKey] = e.target.value;
          this.saveToStorage();
        }
      });
    });
  },

  bindChecks() {
    // Q1: Ley de Reflexión
    this.setupCheckBtn('btnCheckQ1', 'feedbackQ1', () => {
      const sel = this.answers.questions.q1.selected;
      if (!sel) return { ok: false, msg: 'Por favor selecciona una opción antes de comprobar.' };
      if (sel === 'A') {
        return { ok: true, msg: '¡Excelente! La 1ª Ley de la Reflexión establece que θᵢ = θᵣ respecto a la normal en cualquier superficie y medio reflectante.' };
      }
      return { ok: false, msg: 'Revisa el simulador: el arco del ángulo reflejado θᵣ siempre iguala exactamente al ángulo de incidencia θ₁.' };
    });

    // Q2: Rapidez y Refracción aire-vidrio
    this.setupCheckBtn('btnCheckQ2', 'feedbackQ2', () => {
      const sel = this.answers.questions.q2.selected;
      if (!sel) return { ok: false, msg: 'Por favor selecciona una opción antes de comprobar.' };
      if (sel === 'B') {
        return { ok: true, msg: '¡Correcto! Al pasar a un medio de mayor densidad óptica (n₂ > n₁), la velocidad disminuye (v = c/n ≈ 1.97×10⁸ m/s) y el haz se acerca a la normal (θ₂ < θ₁).' };
      }
      return { ok: false, msg: 'Recuerda que v = c / n. Al ser n = 1.52 > 1.00, la rapidez de propagación se frena y el rayo se cierra hacia la normal.' };
    });

    // Q3: Cálculo cuantitativo de Snell
    this.setupCheckBtn('btnCheckQ3', 'feedbackQ3', () => {
      const val = parseFloat(this.answers.questions.q3.numericVal);
      if (isNaN(val)) return { ok: false, msg: 'Ingresa un valor numérico para θ₂.' };
      if (Math.abs(val - 32.0) <= 0.6) {
        return { ok: true, msg: '¡Cálculo exacto! θ₂ = arcsin(1.000·sin(45.0°)/1.333) ≈ 32.0°. Puedes verificarlo en la telemetría de la mesa de refracción.' };
      }
      return { ok: false, msg: 'Revisa tu cálculo: sin(θ₂) = (1.000 / 1.333) · sin(45.0°) = 0.5305. Luego aplica arcsin en modo DEG.' };
    });

    // Q4: Despeje n2 desconocido
    this.setupCheckBtn('btnCheckQ4', 'feedbackQ4', () => {
      const val = parseFloat(this.answers.questions.q4.numericVal);
      if (isNaN(val)) return { ok: false, msg: 'Ingresa el valor calculado de n₂.' };
      if (Math.abs(val - 1.51) <= 0.05) {
        return { ok: true, msg: '¡Brillante despeje algebraico! n₂ = sin(60.0°)/sin(35.0°) ≈ 1.51. Corresponde al vidrio crown o aceite de inmersión.' };
      }
      return { ok: false, msg: 'Revisa el despeje: n₂ = n₁ · sin(θ₁) / sin(θ₂). Ten presente los ángulos medidos respecto a la normal punteada.' };
    });

    // Q6: Ángulo Crítico Vidrio -> Aire
    this.setupCheckBtn('btnCheckQ6', 'feedbackQ6', () => {
      const val = parseFloat(this.answers.questions.q6.numericCrit);
      if (isNaN(val)) return { ok: false, msg: 'Ingresa el valor calculado del ángulo crítico θc.' };
      if (Math.abs(val - 41.14) <= 0.5) {
        return { ok: true, msg: '¡Excelente! θc = arcsin(1.000 / 1.520) ≈ 41.14°. En este ángulo límite exacto el rayo refractado emerge rasante a 90°.' };
      }
      return { ok: false, msg: 'Recuerda: θc = arcsin(n₂ / n₁) = arcsin(1.000 / 1.520). Verifica el cálculo con tu calculadora en modo grados sexagesimales (DEG).' };
    });

    // Q7: Espejo Cóncavo
    this.setupCheckBtn('btnCheckQ7', 'feedbackQ7', () => {
      const di = parseFloat(this.answers.questions.q7.numericDi);
      const m = parseFloat(this.answers.questions.q7.numericM);

      if (isNaN(di)) return { ok: false, msg: 'Ingresa el valor calculado de la distancia imagen (dᵢ).' };
      const diOk = Math.abs(di - 60.0) <= 1.0;
      const mOk = !isNaN(m) && (Math.abs(m - (-2.0)) <= 0.2 || Math.abs(m - 2.0) <= 0.2);

      if (diOk && mOk) {
        return { ok: true, msg: '¡Cálculo impecable! dᵢ = +60.0 cm y M = -2.00. La imagen es REAL (dᵢ > 0), INVERTIDA (M < 0) y de DOBLE TAMAÑO (|M| = 2). Pruébalo en el banco de espejos.' };
      } else if (diOk) {
        return { ok: true, msg: '¡Distancia imagen correcta (dᵢ = +60 cm)! Ahora verifica el aumento lateral: M = -dᵢ / dₒ = -60 / 30 = -2.00.' };
      }
      return { ok: false, msg: 'Aplica la fórmula de Descartes: 1/dᵢ = 1/f - 1/dₒ = 1/20 - 1/30 = 1/60. Por tanto dᵢ = 60 cm.' };
    });

    // Q8: Espejos Convexos y Retrovisores
    this.setupCheckBtn('btnCheckQ8', 'feedbackQ8', () => {
      const sel = this.answers.questions.q8.selected;
      if (!sel) return { ok: false, msg: 'Selecciona una opción.' };
      if (sel === 'B') {
        return { ok: true, msg: '¡Respuesta correcta tipo ICFES Saber 11! Los espejos convexos siempre forman imágenes VIRTUALES, DERECHAS y REDUCIDAS, lo que proporciona un campo visual panorámico mucho más amplio para el conductor.' };
      }
      return { ok: false, msg: 'Comprueba en el Banco de Espejos: selecciona "Espejo Convexo" y observa el tamaño reducido y orientación derecha que permiten abarcar más espacio.' };
    });

    // Q9: Ojo Humano (Miopía e Hipermetropía)
    this.setupCheckBtn('btnCheckQ9', 'feedbackQ9', () => {
      const mSel = this.answers.questions.q9.selectedMyopia;
      const hSel = this.answers.questions.q9.selectedHyperopia;

      if (!mSel || !hSel) {
        return { ok: false, msg: 'Selecciona el tipo de lente correctora para ambos defectos visuales.' };
      }
      if (mSel === 'divergente' && hSel === 'convergente') {
        return { ok: true, msg: '¡Diagnóstico óptico perfecto! La miopía (foco antes de la retina) se compensa con lentes DIVERGENTES (potencia negativa). La hipermetropía (foco detrás de la retina) se compensa con lentes CONVERGENTES (potencia positiva).' };
      }
      return { ok: false, msg: 'Recuerda: en la miopía el ojo tiene exceso de convergencia (requiere una lente que "abra" los rayos: divergente). En la hipermetropía falta convergencia (requiere una lente que "cierre" los rayos: convergente).' };
    });

    // Q10: Potencia de Lente (P = 1/f)
    this.setupCheckBtn('btnCheckQ10', 'feedbackQ10', () => {
      const p = parseFloat(this.answers.questions.q10.numericPower);
      if (isNaN(p)) return { ok: false, msg: 'Ingresa el valor de la potencia en dioptrías (D).' };
      if (Math.abs(p - (-2.00)) <= 0.1) {
        return { ok: true, msg: '¡Cálculo optométrico exacto! P = 1 / f = 1 / (-0.50 m) = -2.00 Dioptrías (D). El signo negativo ratifica que es una lente divergente.' };
      } else if (Math.abs(p - 2.00) <= 0.1) {
        return { ok: false, msg: '¡Casi! La magnitud 2.00 D es correcta, pero para miopía la distancia focal y la potencia son NEGATIVAS (P = -2.00 D) porque la lente es bicóncava / divergente.' };
      }
      return { ok: false, msg: 'Recuerda que la distancia focal debe expresarse en metros: f = -50 cm = -0.50 m. Luego calcula P = 1 / f.' };
    });
  },

  setupCheckBtn(btnId, feedbackId, evaluateFn) {
    const btn = document.getElementById(btnId);
    const fb = document.getElementById(feedbackId);
    if (!btn || !fb) return;

    btn.addEventListener('click', () => {
      const res = evaluateFn();
      fb.className = `feedback-msg show ${res.ok ? 'correct' : 'incorrect'}`;
      fb.innerHTML = (res.ok ? '<i class="fas fa-check-circle"></i> ' : '<i class="fas fa-info-circle"></i> ') + res.msg;
    });
  },

  updateStudentDataInSummary() {
    const display = document.getElementById('summaryStudentInfo');
    if (!display) return;
    const name = this.answers.student.fullName || '[Estudiante no registrado]';
    const school = this.answers.student.institution === 'Otra'
      ? (this.answers.student.customSchool || 'Otra Institución')
      : this.answers.student.institution;
    const grade = `${this.answers.student.grade || '11°'} - Grupo ${this.answers.student.group || '1'}`;

    display.innerHTML = `<strong>Estudiante:</strong> ${name} &nbsp;|&nbsp; <strong>Institución:</strong> ${school} &nbsp;|&nbsp; <strong>Grado:</strong> ${grade} &nbsp;|&nbsp; <strong>Fecha:</strong> ${this.answers.student.date}`;
  },

  /* ==========================================================================
     CALCULADOR DE CALIFICACIÓN OFICIAL (ESCALA 1.0 A 5.0)
     ========================================================================== */
  calculateGrade() {
    const q = this.answers.questions;
    let score = 0;
    const totalQuestions = this.quizMode === '5' ? 5 : 10;

    // Q1
    if (q.q1.selected === 'A') score += 1;
    // Q3
    if (Math.abs(parseFloat(q.q3.numericVal) - 32.0) <= 0.6) score += 1;
    // Q6
    if (Math.abs(parseFloat(q.q6.numericCrit) - 41.14) <= 0.5) score += 1;
    // Q7
    if (Math.abs(parseFloat(q.q7.numericDi) - 60.0) <= 1.5) score += 1;
    // Q9
    if (q.q9.selectedMyopia === 'divergente' && q.q9.selectedHyperopia === 'convergente') score += 1;

    // En modo 10 preguntas se suman además Q2, Q4, Q5, Q8, Q10
    if (this.quizMode === '10') {
      if (q.q2.selected === 'B') score += 1;
      if (Math.abs(parseFloat(q.q4.numericVal) - 1.51) <= 0.05) score += 1;
      if (q.q5.explanation && q.q5.explanation.trim().length > 15) score += 1;
      if (q.q8.selected === 'B') score += 1;
      if (Math.abs(parseFloat(q.q10.numericPower) - (-2.00)) <= 0.15) score += 1;
    }

    const grade = Math.max(1.0, Math.min(5.0, 1.0 + (score / totalQuestions) * 4.0));

    let performanceLevel = 'Bajo';
    if (grade >= 4.6) performanceLevel = 'Superior';
    else if (grade >= 4.0) performanceLevel = 'Alto';
    else if (grade >= 3.0) performanceLevel = 'Básico';

    return {
      score,
      totalQuestions,
      grade: grade.toFixed(1),
      performanceLevel
    };
  },

  /* ==========================================================================
     GENERADOR DE INFORME OFICIAL ESTRUCTURADO EN TEXTO
     ========================================================================== */
  generateTextReport() {
    const st = this.answers.student;
    const q = this.answers.questions;
    const schoolName = st.institution === 'Otra' ? (st.customSchool || 'Otra Institución') : st.institution;
    const evaluation = this.calculateGrade();

    return `================================================================================
GUÍA-TALLER INTERACTIVO N° 04: ÓPTICA GEOMÉTRICA, LEY DE SNELL, ESPEJOS Y EL OJO HUMANO
Programa de Fortalecimiento de la Educación Media (PAFEM) — Física Grado 11°
Coordinador General: Luis Hernando Blandón Dávila — Coordinador de Física PAFEM
Colegios: I.E. Diego Maya Salazar, I.E. Jaime Salazar Robledo, I.E. Hugo Ángel Mejía (Pereira)
================================================================================
DATOS DEL ESTUDIANTE:
- Nombres y Apellidos: ${st.fullName || 'No diligenciado'}
- Institución Educativa: ${schoolName}
- Grado y Grupo: ${st.grade || '11°'} - Grupo ${st.group || '1'}
- Fecha de Realización: ${st.date}
--------------------------------------------------------------------------------
VALORACIÓN DIGITAL CONSOLIDADA (MODALIDAD: ${this.quizMode} PREGUNTAS):
- Puntaje de Aciertos: ${evaluation.score} de ${evaluation.totalQuestions}
- Calificación Digital Estimada: ${evaluation.grade} / 5.0
- Nivel de Desempeño: ${evaluation.performanceLevel}
* NOTA: La calificación definitiva integrará la sustentación y desarrollo manual de los
  cálculos, tablas y diagramas de rayos en el cuaderno de física o block cuadriculado.
--------------------------------------------------------------------------------
REGISTRO DETALLADO DE RESPUESTAS Y CÁLCULOS:

[PREGUNTA 1 - Ley de Reflexión]
- Opción seleccionada: ${q.q1.selected || 'Sin responder'} (Clave: A)

[PREGUNTA 2 - Refracción y Velocidad de la Luz]
- Opción seleccionada: ${q.q2.selected || 'Sin responder'} (Clave: B)

[PREGUNTA 3 - Cálculo Cuantitativo Ley de Snell (Aire -> Agua 45°)]
- Ángulo θ₂ calculado: ${q.q3.numericVal || 'Sin dato'}° (Valor teórico: 32.0°)
- Procedimiento analítico:
${q.q3.stepByStep || 'Desarrollado a mano en el cuaderno de física'}

[PREGUNTA 4 - Despeje de Índice Desconocido (60° -> 35°)]
- Índice n₂ despejado: ${q.q4.numericVal || 'Sin dato'} (Valor teórico: 1.51)
- Sustancia deducida: ${q.q4.substance || 'Sin dato'}

[PREGUNTA 5 - Incidencia Perpendicular Normal (θ₁ = 0°)]
- Justificación física:
${q.q5.explanation || 'Desarrollado a mano en el cuaderno de física'}

[PREGUNTA 6 - Ángulo Crítico y Reflexión Interna Total]
- Ángulo crítico θc calculado: ${q.q6.numericCrit || 'Sin dato'}° (Valor teórico: 41.14°)

[PREGUNTA 7 - Espejos Esféricos Cóncavos (do = 30 cm, f = 20 cm)]
- Distancia imagen dᵢ calculada: ${q.q7.numericDi || 'Sin dato'} cm (Valor teórico: +60.0 cm)
- Aumento lateral M calculado: ${q.q7.numericM || 'Sin dato'} (Valor teórico: -2.00)
- Procedimiento y clasificación:
${q.q7.stepByStep || 'Desarrollado a mano en el cuaderno de física'}

[PREGUNTA 8 - Espejos Convexos y Retrovisores (Tipo ICFES)]
- Opción seleccionada: ${q.q8.selected || 'Sin responder'} (Clave: B)

[PREGUNTA 9 - El Ojo Humano y Corrección de Defectos Visuales]
- Lente para Miopía: ${q.q9.selectedMyopia || 'Sin responder'} (Clave: Divergente / Cóncava)
- Lente para Hipermetropía: ${q.q9.selectedHyperopia || 'Sin responder'} (Clave: Convergente / Convexa)
- Argumentación biológica y óptica:
${q.q9.explanation || 'Desarrollado a mano en el cuaderno de física'}

[PREGUNTA 10 - Potencia Óptica de Lentes Oftálmicas (P = 1/f)]
- Potencia calculada: ${q.q10.numericPower || 'Sin dato'} Dioptrías (Valor: -2.00 D)
- Conclusión metacognitiva y síntesis experimental:
${q.q10.conclusion || 'Consignado en el cuaderno de física'}
================================================================================
Luis Hernando Blandón Dávila — Coordinador de Física PAFEM
Instituciones: Diego Maya Salazar, Jaime Salazar Robledo, Hugo Ángel Mejía (Pereira)
================================================================================`;
  }
};

window.QuizManager = QuizManager;
