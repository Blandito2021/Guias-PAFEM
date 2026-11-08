/* ==========================================================================
   CONFIGURACIÓN DE LA GUÍA: Dinámica — las leyes de Newton
   Fórmulas SIEMPRE delimitadas: \\( ... \\) en línea (en JS la barra va doble).
   ========================================================================== */
window.GUIDE = {
  id: 'pafem-fisica-dinamica-las-leyes-de-newton',
  title: 'Dinámica: las leyes de Newton',
  brand: 'FÍSICA PAFEM — DINÁMICA: LAS LEYES DE NEWTON',
  icon: 'fa-rocket',
  program: 'Programa de Fortalecimiento de la Educación Media (PAFEM) — Pereira, Risaralda',
  subject: 'Física',
  teacher: 'Luis Hernando Blandón Dávila',
  teacherRole: 'Coordinador de Física PAFEM',
  footer: '© 2026 Luis Hernando Blandón Dávila — Coordinador de Física PAFEM',
  institutions: ['I.E. Diego Maya Salazar', 'I.E. Jaime Salazar Robledo', 'I.E. Hugo Ángel Mejía'],
  grades: ['10°'],
  defaultTheme: 'theme-dark',
  defaultTolRel: 0.02,
  notebookMandate: true,
  printSolutions: false,

  questions: [
    {
      id: 1, type: 'numeric', quick: true, bloom: 'Aplicar',
      topic: 'Segunda ley en un bus articulado', badge: 'Cálculo numérico',
      question: 'Un bus articulado del Megabús de Pereira, con masa total \\(12\\,000\\text{ kg}\\), parte del reposo y alcanza \\(10\\text{ m/s}\\) en \\(8.0\\text{ s}\\) con aceleración constante. ¿Cuál es la magnitud de la fuerza neta sobre el bus?',
      answer: 15000, unit: 'N', check: '12000*10/8',
      hint: 'Primero halla \\(a = \\Delta v/\\Delta t\\) y luego aplica \\(\\Sigma F = ma\\).',
      solution: {
        datos: '\\(m = 12\\,000\\text{ kg},\\; v_i = 0,\\; v_f = 10\\text{ m/s},\\; \\Delta t = 8.0\\text{ s}\\)',
        formula: '\\(\\Sigma F = m a,\\quad a = \\dfrac{\\Delta v}{\\Delta t}\\)',
        despeje: '\\(a = \\dfrac{10 - 0}{8.0} = 1.25\\text{ m/s}^2\\)',
        calculo: '\\(\\Sigma F = (12\\,000)(1.25) = 15\\,000\\text{ N}\\)',
        conclusion: 'La fuerza neta (tracción del motor menos resistencias) es \\(1.5\\times10^4\\text{ N}\\), en la dirección del movimiento.'
      }
    },
    {
      id: 2, type: 'choice', quick: true, bloom: 'Comprender',
      topic: 'Inercia en un frenado', badge: 'Análisis conceptual',
      question: 'Vas de pie en un bus que viaja por la avenida 30 de Agosto y el conductor frena de repente. Sientes que tu cuerpo «se va hacia adelante». ¿Cuál es la explicación correcta?',
      options: [
        'Tu cuerpo tiende a conservar su velocidad (inercia): el bus frena por la fricción de las llantas, pero sobre ti no actúa todavía una fuerza que te detenga.',
        'Aparece una fuerza hacia adelante que te empuja cuando el bus frena.',
        'La gravedad aumenta durante el frenado y te inclina hacia adelante.',
        'El bus ejerce una fuerza de atracción sobre los pasajeros cuando cambia su velocidad.'
      ],
      correct: 0,
      feedback: {
        1: 'No hay ningún agente que ejerza esa fuerza: es la tendencia de tu cuerpo a seguir moviéndose (1.ª ley). Desde el bus, que no es un marco inercial, parece una fuerza.',
        2: 'El peso \\(mg\\) no cambia con el frenado; además actúa hacia abajo, no hacia adelante.',
        3: 'Las fuerzas son interacciones con agentes concretos; el bus solo te empuja a través del piso y del pasamanos.'
      },
      solution: {
        datos: 'Antes del frenado, tú y el bus tienen la misma velocidad.',
        formula: '\\(\\Sigma\\vec F = 0 \\;\\Rightarrow\\; \\vec v = \\text{constante}\\)',
        despeje: 'Sobre el bus actúa la fricción de frenado; sobre ti, mientras no te sujetes, la fuerza neta horizontal es casi nula.',
        calculo: 'Tu velocidad se mantiene mientras la del bus disminuye: avanzas respecto al bus.',
        conclusion: 'Por eso es indispensable sujetarse del pasamanos: la fuerza de tu brazo es la que cambia tu estado de movimiento.'
      }
    },
    {
      id: 3, type: 'truefalse', quick: true, bloom: 'Comprender',
      topic: 'Tercera ley en un choque', badge: 'Verdadero o falso',
      question: 'En un choque entre una volqueta cargada y un automóvil pequeño, la volqueta ejerce sobre el automóvil una fuerza <strong>mayor</strong> que la que el automóvil ejerce sobre la volqueta.',
      answer: false,
      feedbackBad: 'Revisa la tercera ley: las fuerzas de un par acción–reacción siempre tienen la misma magnitud.',
      solution: {
        datos: 'Dos cuerpos interactúan durante el choque.',
        formula: '\\(\\vec F_{12} = -\\vec F_{21}\\)',
        despeje: 'Las magnitudes son iguales: \\(|\\vec F_{12}| = |\\vec F_{21}|\\).',
        calculo: 'Lo diferente son las aceleraciones: \\(a = F/m\\), así que el automóvil (menor masa) sufre una aceleración mucho mayor.',
        conclusion: 'La afirmación es FALSA. El daño mayor del automóvil se explica por la 2.ª ley, no por una fuerza mayor.'
      }
    },
    {
      id: 4, type: 'numeric', bloom: 'Analizar',
      topic: 'Equilibrio: bola de demolición', badge: 'Cálculo numérico',
      question: 'Una bola de demolición de \\(4090\\text{ kg}\\) cuelga en reposo sostenida por dos cables: uno forma \\(40^\\circ\\) con la vertical y el otro es horizontal. Con \\(g = 9.8\\text{ m/s}^2\\), ¿cuál es la tensión en el cable horizontal?',
      answer: 33630, unit: 'N', check: '4090*9.8*Math.tan(40*Math.PI/180)',
      hint: 'Plantea \\(\\Sigma F_y = 0\\) para el cable inclinado y luego \\(\\Sigma F_x = 0\\).',
      solution: {
        datos: '\\(m = 4090\\text{ kg},\\; \\theta = 40^\\circ\\) con la vertical; cable horizontal \\(T_A\\), cable inclinado \\(T_B\\)',
        formula: '\\(\\Sigma F_y = T_B\\cos 40^\\circ - mg = 0,\\quad \\Sigma F_x = T_B\\sin 40^\\circ - T_A = 0\\)',
        despeje: '\\(T_B = \\dfrac{mg}{\\cos 40^\\circ},\\quad T_A = mg\\tan 40^\\circ\\)',
        calculo: '\\(T_B = \\dfrac{40\\,082}{0.766} \\approx 5.23\\times10^{4}\\text{ N},\\quad T_A = 40\\,082 \\times 0.839 \\approx 3.36\\times10^{4}\\text{ N}\\)',
        conclusion: 'El cable inclinado soporta más que el peso (\\(4.0\\times10^4\\text{ N}\\)): su componente vertical sostiene la bola y la horizontal equilibra al otro cable.'
      }
    },
    {
      id: 5, type: 'numeric', bloom: 'Analizar',
      topic: 'Bloques en contacto (Serway, ej. 5.7)', badge: 'Cálculo numérico',
      question: 'Sobre una superficie sin fricción, una fuerza horizontal de \\(36\\text{ N}\\) empuja un bloque \\(m_1 = 4.0\\text{ kg}\\) que a su vez empuja a un bloque \\(m_2 = 2.0\\text{ kg}\\) en contacto con él. ¿Cuál es la magnitud de la fuerza de contacto entre los bloques?',
      answer: 12, unit: 'N', check: '2*36/(4+2)',
      hint: 'Halla la aceleración del sistema y luego aplica la 2.ª ley solo a \\(m_2\\). Verifícalo con la Simulación 4.',
      solution: {
        datos: '\\(F = 36\\text{ N},\\; m_1 = 4.0\\text{ kg},\\; m_2 = 2.0\\text{ kg}\\), sin fricción',
        formula: '\\(a = \\dfrac{F}{m_1 + m_2},\\quad P_{12} = m_2\\,a\\)',
        despeje: '\\(a = \\dfrac{36}{6.0} = 6.0\\text{ m/s}^2\\)',
        calculo: '\\(P_{12} = (2.0)(6.0) = 12\\text{ N}\\)',
        conclusion: 'La fuerza de contacto es menor que \\(F\\): sobre \\(m_1\\) la fuerza neta es \\(36 - 12 = 24\\text{ N} = m_1 a\\). Y \\(m_2\\) empuja a \\(m_1\\) con 12 N (3.ª ley).'
      }
    },
    {
      id: 6, type: 'numeric', quick: true, bloom: 'Analizar',
      topic: 'Ángulo crítico de deslizamiento', badge: 'Cálculo numérico',
      question: 'Un cuaderno descansa sobre una tabla que se inclina lentamente. Si el coeficiente de fricción estática es \\(\\mu_s = 0.40\\), ¿a qué ángulo (en grados) el cuaderno empieza a deslizar?',
      answer: 21.8, unit: '°', check: 'Math.atan(0.4)*180/Math.PI',
      hint: 'En el movimiento inminente \\(mg\\sin\\theta_c = \\mu_s\\,mg\\cos\\theta_c\\).',
      solution: {
        datos: '\\(\\mu_s = 0.40\\)',
        formula: '\\(mg\\sin\\theta_c = \\mu_s\\,mg\\cos\\theta_c\\)',
        despeje: '\\(\\tan\\theta_c = \\mu_s \\;\\Rightarrow\\; \\theta_c = \\arctan\\mu_s\\)',
        calculo: '\\(\\theta_c = \\arctan(0.40) \\approx 21.8^\\circ\\)',
        conclusion: 'El ángulo crítico no depende de la masa: es un método experimental sencillo para medir \\(\\mu_s\\) (Serway, ej. 5.11).'
      }
    },
    {
      id: 7, type: 'numeric', bloom: 'Aplicar',
      topic: 'Aceleración en un plano inclinado', badge: 'Cálculo numérico',
      question: 'Una caja desliza hacia abajo por una rampa de \\(30^\\circ\\) con coeficiente de fricción cinética \\(\\mu_k = 0.20\\). Con \\(g = 9.8\\text{ m/s}^2\\), ¿cuál es su aceleración?',
      answer: 3.20, unit: 'm/s²', check: '9.8*(Math.sin(Math.PI/6)-0.2*Math.cos(Math.PI/6))',
      hint: 'A lo largo de la rampa: \\(ma = mg\\sin\\theta - \\mu_k\\,mg\\cos\\theta\\).',
      solution: {
        datos: '\\(\\theta = 30^\\circ,\\; \\mu_k = 0.20,\\; g = 9.8\\text{ m/s}^2\\)',
        formula: '\\(a = g(\\sin\\theta - \\mu_k\\cos\\theta)\\)',
        despeje: '\\(a = 9.8\\,(0.500 - 0.20 \\times 0.866)\\)',
        calculo: '\\(a = 9.8 \\times 0.327 \\approx 3.20\\text{ m/s}^2\\)',
        conclusion: 'Sin fricción sería \\(g\\sin 30^\\circ = 4.9\\text{ m/s}^2\\); la fricción reduce la aceleración en un 35 %.'
      }
    },
    {
      id: 8, type: 'numeric', quick: true, bloom: 'Analizar',
      topic: 'Tensión en la máquina de Atwood', badge: 'Lectura de simulador',
      question: 'En la Simulación 6, coloca \\(m_1 = 3.0\\text{ kg}\\) y \\(m_2 = 5.0\\text{ kg}\\). Calcula la tensión de la cuerda (\\(g = 9.8\\text{ m/s}^2\\)) y compárala con la telemetría.',
      answer: 36.75, unit: 'N', check: '2*3*5*9.8/(3+5)',
      hint: 'Plantea \\(\\Sigma F = ma\\) para cada masa: \\(T - m_1 g = m_1 a\\) y \\(m_2 g - T = m_2 a\\).',
      solution: {
        datos: '\\(m_1 = 3.0\\text{ kg},\\; m_2 = 5.0\\text{ kg}\\), polea y cuerda ideales',
        formula: '\\(a = \\dfrac{(m_2 - m_1)g}{m_1 + m_2},\\quad T = \\dfrac{2m_1m_2\\,g}{m_1 + m_2}\\)',
        despeje: '\\(a = \\dfrac{(2.0)(9.8)}{8.0} = 2.45\\text{ m/s}^2\\)',
        calculo: '\\(T = \\dfrac{2(3.0)(5.0)(9.8)}{8.0} = 36.75\\text{ N}\\)',
        conclusion: 'La tensión queda entre los dos pesos (29.4 N y 49 N): la cuerda acelera hacia arriba a \\(m_1\\) y frena la caída de \\(m_2\\).'
      }
    },
    {
      id: 12, type: 'numeric', bloom: 'Evaluar',
      topic: 'Equilibrio: ángulo mínimo de la cuerda', badge: 'Cálculo numérico',
      question: 'El arqueólogo del ejemplo (\\(90.0\\text{ kg}\\)) cuelga del centro de una cuerda que se rompe si la tensión supera \\(2.50\\times10^{4}\\text{ N}\\). ¿Cuál es el ángulo mínimo \\(\\theta\\) bajo la horizontal (en grados) que puede tener cada mitad de la cuerda sin romperse?',
      answer: 1.01, unit: '°', check: 'Math.asin(90*9.8/(2*25000))*180/Math.PI', tolRel: 0.03,
      hint: 'De \\(2T\\sin\\theta = mg\\), usa la tensión máxima para despejar \\(\\theta\\).',
      solution: {
        datos: '\\(m = 90.0\\text{ kg},\\; T_{máx} = 2.50\\times10^{4}\\text{ N}\\)',
        formula: '\\(2T\\sin\\theta - mg = 0\\)',
        despeje: '\\(\\sin\\theta_{mín} = \\dfrac{mg}{2T_{máx}}\\)',
        calculo: '\\(\\sin\\theta_{mín} = \\dfrac{882}{50\\,000} = 0.01764 \\Rightarrow \\theta_{mín} \\approx 1.01^\\circ\\)',
        conclusion: 'Ninguna cuerda puede quedar perfectamente horizontal con un peso colgando: la tensión tendería a infinito.'
      }
    },
    {
      id: 9, type: 'match', bloom: 'Recordar',
      topic: 'Conceptos fundamentales', badge: 'Emparejamiento',
      question: 'Relaciona cada concepto con su descripción correcta:',
      pairs: [
        ['Inercia', 'Tendencia a conservar el estado de movimiento'],
        ['Newton (N)', 'Unidad equivalente a kg·m/s²'],
        ['Peso', 'Fuerza gravitacional mg'],
        ['Fuerza normal', 'Fuerza de contacto perpendicular a la superficie']
      ],
      solution: { steps: [
        { label: 'Inercia', html: 'Propiedad de la materia; su medida es la masa (1.ª ley).' },
        { label: 'Newton', html: '\\(1\\text{ N} = 1\\text{ kg}\\cdot\\text{m/s}^2\\), de \\(\\Sigma F = ma\\).' },
        { label: 'Peso y normal', html: 'No son un par acción–reacción: actúan sobre el mismo cuerpo y tienen orígenes distintos.' }
      ] }
    },
    {
      id: 10, type: 'choice', bloom: 'Evaluar',
      topic: 'Báscula en un ascensor (Serway, ej. 5.8)', badge: 'Argumentación científica',
      question: 'Te paras sobre una báscula dentro de un ascensor de un edificio del centro de Pereira. ¿En qué caso la báscula marca un valor MAYOR que tu peso real?',
      options: [
        'Cuando el ascensor sube con rapidez constante.',
        'Cuando el ascensor arranca hacia arriba (acelera hacia arriba).',
        'Cuando el ascensor arranca hacia abajo (acelera hacia abajo).',
        'Nunca: la báscula siempre marca el peso real.'
      ],
      correct: 1,
      feedback: {
        0: 'Con velocidad constante \\(a = 0\\): la normal es igual a \\(mg\\).',
        2: 'Al acelerar hacia abajo, \\(n = m(g - a) < mg\\): marca MENOS.',
        3: 'La báscula mide la fuerza normal, que depende de la aceleración del ascensor.'
      },
      solution: {
        datos: 'La báscula mide la fuerza normal \\(n\\) que ejerce sobre ti.',
        formula: '\\(n - mg = m a\\)',
        despeje: '\\(n = m(g + a)\\)',
        calculo: 'Si \\(a > 0\\) (hacia arriba), \\(n > mg\\).',
        conclusion: 'Tu «peso aparente» aumenta al acelerar hacia arriba y disminuye al acelerar hacia abajo; en caída libre sería cero.'
      }
    },
    {
      id: 11, type: 'open', bloom: 'Crear',
      topic: 'Diseño experimental: medir μₛ', badge: 'Indagación (cuaderno)',
      question: 'Diseña un experimento casero para medir el coeficiente de fricción estática entre tu cuaderno y la tapa de un libro, usando solo una regla. Describe las variables, el procedimiento, una tabla de datos con al menos 3 repeticiones y cómo calculas \\(\\mu_s\\). Verifica tu predicción con la Simulación 5.',
      rubric: 'Usa el ángulo crítico (\\(\\mu_s = \\tan\\theta_c = h/b\\)), mide altura y base con la regla, repite y promedia, y discute las fuentes de error (inclinación brusca, superficie irregular).'
    }
  ]
};
