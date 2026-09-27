# Arquitectura del Módulo y Análisis de Código

## 2. Arquitectura del Módulo

La arquitectura del módulo se diseña bajo un paradigma basado en evaluación dinámica por tareas (Task-based Evaluation). En lugar de escanear la estructura estática de la web (DOM crudo), el módulo orquesta un entorno de automatización de navegador para probar flujos definidos.

### Componentes Principales
1. **API y Controlador Central:** Servicio REST que coordina todo el proceso (`server.js`). Recibe los comandos y delega el análisis.
2. **Extractor SRS:** Analiza documentos de requisitos de software (Word/PDF) para extraer las funciones de negocio e idiomas requeridos.
3. **Gestor de Entorno de Pruebas:** Instancia navegadores controlados mediante framework de automatización (Playwright).
4. **Motor de Decisiones de Accesibilidad:** Evalúa reglas según los hallazgos técnicos. Se encarga de descartar errores que no afectan la funcionalidad bajo perfiles específicos (Visual, Motora, Auditiva).
5. **Generador de Métricas:** Aplica las matemáticas definidas en ISO/IEC 25023 para cuantificar las métricas $X_{21}$ (funcionalidad accesible) y $X_{22}$ (soporte de idiomas).

### Flujo Conceptual de Procesamiento

```text
[ Entrada (Requisitos SRS + URLs/Credenciales) ]
        ↓
[ Análisis Emparejamiento (Descubrir funciones UI vs SRS) ]
        ↓
[ Evaluación (Ejecución dinámica: Tareas + Axe + ARIA + Teclado) ]
        ↓
[ Motor de Causalidad (Filtrado de barreras por Perfil de Discapacidad) ]
        ↓
[ Cálculo de Métricas (Métrica 21 y Métrica 22) ]
        ↓
[ Resultado (JSON Estandarizado de Accesibilidad Global) ]
```

---

## 3. Análisis del Código

La solución está implementada en un entorno Node.js, estructurada para separar claramente la extracción de requisitos, la ejecución dinámica y el motor lógico de métricas.

### Estructura de Archivos
- **`server.js`:** Punto de entrada (API REST con Express). Maneja las rutas HTTP, estado global en memoria y realiza el ensamblaje de resultados para su presentación.
- **`src/metrics/`:** Lógica matemática.
  - `metric21.js`: Calcula la relación $A_{21}/B_{21}$ (Funciones accesibles sobre implementadas).
  - `metric22.js`: Calcula la relación $A_{22}/B_{22}$ (Idiomas disponibles sobre requeridos) mediante validaciones WCAG aplicadas al idioma (HTML lang).
- **`src/accessibility/accessibilityDecision.js`:** Es el "cerebro" funcional. Recibe los resultados crudos de los evaluadores (`axe-core`, verificadores de teclado, atributos ARIA) e implementa un motor heurístico que determina si un fallo representa una *barrera bloqueante* para la tarea o no, en función del perfil de discapacidad.
- **`src/rigor/wcagScorer.js`:** Filtra los hallazgos técnicos para verificar qué criterios de éxito de las normas WCAG (ej. 1.1.1, 1.4.3) se aprueban o fallan. Computa el nivel de rigor alcanzado (A, B, C, D).

### Dependencias Utilizadas
- **Playwright:** Permite lanzar un entorno Chromium *headless* o *ui* para realizar acciones funcionales automáticas y recopilar evidencia DOM en tiempo real.
- **Axe-core:** Motor líder en validación de reglas de accesibilidad que detecta desviaciones en WCAG.
- **Express.js / Multer:** Provisión de interfaz HTTP de comunicación y carga de evidencias SRS.

---

## 6. Modelo de Datos

La interacción interna y externa se basa en objetos JSON con la siguiente estructura y semántica:

### Parámetros de Entrada (Input Payload)
```json
{
  "rigorLevel": "C",
  "perfil": "Visual",
  "modoPrueba": false,
  "emparejamiento": {
    "rf": "RF-001",
    "estado": "asignado",
    "rutaInicial": "/login"
  }
}
```

### Formato de Salida (Output Model para Integración)
La salida generada por el módulo proporciona un paquete de datos numérico, diseñado para ser inyectado en un framework ISO general.

```json
{
  "success": true,
  "data": {
    "metric21": {
      "A21": 3,
      "B21_Implementadas": 7,
      "porcentaje": "42.86%"
    },
    "metric22": {
      "A22": 2,
      "B22": 2,
      "porcentaje": "100.00%"
    },
    "globalAccesibilidad": 71.43,
    "wcagGlobal": {
      "totalCriteriosEvaluados": 15,
      "nivelTecnicoAlcanzado": "A"
    }
  }
}
```
