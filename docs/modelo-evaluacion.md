# Modelo y Flujo de Evaluación de Accesibilidad

## 4. Modelo de Evaluación

Este módulo evalúa la calidad del software fundamentándose en la familia de normas **ISO/IEC 25000 (SQuaRE)**. Concretamente, parametriza la característica de **Usabilidad** (ISO/IEC 25010) haciendo hincapié en la subcaracterística de **Accesibilidad**. Las métricas específicas se recogen de ISO/IEC 25023.

### Criterios de Accesibilidad Evaluados
- **Perfiles de discapacidad:** Adapta la severidad de los errores según tres perfiles funcionales simulados:
  - **Visual:** Valora contrastes (WCAG 1.4.3), alternativas textuales (1.1.1), y nomenclatura estructural y ARIA (4.1.2).
  - **Motora:** Valora accesibilidad exclusiva por teclado (2.1.1), manejo de foco (2.4.7) y prevención de trampas (2.1.2).
  - **Auditiva:** Valora transcripciones o equivalentes (1.2.1).
- **Rigor Técnico WCAG 2.2:** Cada función se evalúa bajo un estándar de rigor paramétrico (Niveles A, B, C, D), validando criterios específicos que influyen en el cómputo.

### Fórmulas e Indicadores Calculados
El sistema aplica las fórmulas definidas para la evaluación funcional:
1. **Métrica 21 (Accesibilidad funcional):** Mide la operatividad.
   $X_{21} = \frac{A_{21}}{B_{21}}$
2. **Métrica 22 (Idiomas/Soporte):** Mide la disponibilidad de lenguajes.
   $X_{22} = \frac{A_{22}}{B_{22}}$

**Puntuación Final (Subcaracterística de Accesibilidad):**
Para reportar un número consolidado al framework superior (Usabilidad):
$\text{Puntuación Final} = \frac{X_{21}\% + X_{22}\%}{2}$

---

## 5. Flujo de Evaluación del Usuario

Desde la perspectiva del evaluador humano o ingeniero de calidad, la plataforma ofrece un flujo guiado semiautomático.

1. **Ingesta de Requisitos:**
   - *Evaluador* sube el documento SRS.
   - *Sistema* analiza y detecta las funciones (RF-X) y los idiomas requeridos ($B_{22}$).
2. **Emparejamiento (Discovery):**
   - *Evaluador* proporciona URL del sistema y autenticación inicial.
   - *Sistema* rastrea los selectores y rutas de la interfaz, confirmando qué funciones de negocio existen realmente ($B_{21}$).
3. **Simulación Dinámica:**
   - *Sistema* usa Playwright para ejecutar el flujo de cada función. Analiza los nodos críticos bajo reglas técnicas (Axe-core y validación de foco).
4. **Motor de Causalidad y Cálculo:**
   - *Sistema* descarta fallos "estéticos" o que no impiden el uso de la función bajo el perfil seleccionado. 
   - Genera los valores de $A_{21}$ y $A_{22}$.
5. **Resultado Estándar:**
   - *Sistema* expone la tabla final, resumiendo métricas, puntuación, niveles alcanzados y exportando los JSON compatibles con el módulo de Usabilidad general.
