# Módulo de Evaluación de Accesibilidad

## 1. Descripción General del Módulo

**Nombre del módulo:** Módulo Evaluador de Accesibilidad Funcional (ISO/IEC 25010)

**Objetivo dentro del modelo ISO/IEC 25010:** 
Cuantificar y verificar de manera automática y funcional el grado en que un producto de software puede ser utilizado por personas con la más amplia variedad de características y capacidades. Este módulo actúa como el motor de evaluación especializado en Accesibilidad dentro del modelo general de calidad de software (Usabilidad).

**Problema que resuelve:** 
La evaluación tradicional de accesibilidad web (ej. mediante escáneres automáticos estáticos) suele arrojar falsos positivos o falsos negativos sobre la viabilidad funcional, centrándose únicamente en el código fuente. Este módulo resuelve este problema al ejecutar dinámicamente escenarios funcionales reales (extraídos de un documento de Especificación de Requisitos de Software - SRS), comprobando no solo si el código cumple normativas técnicas, sino si un usuario final con algún perfil de discapacidad (visual, motora o auditiva) puede completar la tarea de negocio (accesibilidad funcional).

**Relación con la subcaracterística "Accesibilidad" de Usabilidad:** 
Según la norma ISO/IEC 25010, la Usabilidad (grado en el que un producto o sistema puede ser utilizado por usuarios específicos para lograr los objetivos de forma eficaz, eficiente y satisfactoria) contiene la subcaracterística de **Accesibilidad**. Este módulo aborda precisamente esta subcaracterística calculando métricas basadas en el estándar ISO/IEC 25023 (Métricas de calidad del producto de software).

---
*Este documento forma parte del repositorio de investigación de métricas de calidad de software basadas en estándares ISO/IEC.*
