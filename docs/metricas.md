# Métricas de Accesibilidad y Análisis de Resultados

## 7. Resultados Generados y Significado

Las métricas arrojadas por este módulo son directrices concretas de la calidad intrínseca del software, derivadas de las especificaciones ISO/IEC 25023.

### Métrica 21: Accesibilidad de las Funciones
- **Interpretación del Valor:** Un valor del 100% (o 1.0) significa que *todas* las funciones detectadas en el sistema ($B_{21}$) son plenamente utilizables por el usuario final, carecen de barreras bloqueantes para su perfil y cumplen el rigor tecnológico WCAG predeterminado. 
- **Impacto de la Baja Puntuación:** Un valor bajo indica que, si bien el sistema puede tener "funciones desarrolladas" (aprobadas funcionalmente por QA normal), estas **excluyen** a usuarios con discapacidades.
- **Escalas de Rigor:** La calidad se puede ajustar según el **Rigor WCAG** exigido.
  - *Nivel A / B / C / D:* Si una empresa requiere rigor "A", una función con pequeños fallos de contraste podría ser excluida (no sumará a $A_{21}$). Si el rigor es "D" (muy laxo), es posible que pase siempre que la tarea pueda ser completada en última instancia.

### Métrica 22: Soporte de Idiomas Requeridos
- **Interpretación del Valor:** Mide estrictamente el porcentaje de cobertura de los idiomas solicitados inicialmente. 
- **Significado ISO:** La accesibilidad no se restringe a discapacidades físicas o sensoriales; un sistema es inaccesible si el usuario no puede operarlo en su idioma.

### Puntuación de la Subcaracterística Global
El resultado del módulo de evaluación de accesibilidad es un valor consolidado:

$$\text{Valor Subcaracterística Accesibilidad} = \frac{\%X_{21} + \%X_{22}}{2}$$

- **Escala del 0% al 100%:** Indica la madurez general de accesibilidad funcional y lingüística del producto de software. Valores sobre 80% suelen considerarse aceptables en implementaciones comerciales.

---

*Nota: Todas las métricas generan componentes trazables, lo que permite a los equipos de desarrollo conocer exactamente qué regla técnica originó una "barrera" que decrementó el indicador $A_{21}$.*
