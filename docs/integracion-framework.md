# Integración al Framework ISO/IEC 25010 General

## 8. Integración Futura y Extensibilidad

Este módulo de evaluación de Accesibilidad está concebido como una pieza modular (microservicio de calidad de software) dentro de un framework de evaluación mucho más amplio para la familia ISO/IEC 25000. 

### Posición en la Jerarquía del Modelo de Calidad

```text
[ Modelo de Calidad General ISO/IEC 25010 ]
        |
        +-- [ Característica: Eficiencia de Desempeño ]
        |
        +-- [ Característica: Seguridad ]
        |
        +-- [ Característica: Usabilidad ]  <-- Módulo Superior
                |
                +-- [ Subcaracterística: Reconocibilidad ]
                |
                +-- [ Subcaracterística: Aprendizaje ]
                |
                +-- [ Subcaracterística: Operabilidad ]
                |
                +-- [ Subcaracterística: Protección contra errores ]
                |
                +-- [ Subcaracterística: Estética de interfaz ]
                |
                +-- [ Subcaracterística: Accesibilidad ]  <-- ESTE MÓDULO (MVP)
                        |
                        +-- [ Métrica 21: Accesibilidad Funcional ]
                        +-- [ Métrica 22: Idiomas Soportados ]
```

### Mecanismo de Integración
El framework general será orquestado por un "Motor Principal de Usabilidad" que consolidará los porcentajes de todas las subcaracterísticas. 

El flujo de integración propuesto funciona mediante el intercambio de JSON:

1. **El Orquestador General** enviará al módulo de Accesibilidad un payload con la ruta del SRS y la URL del sistema.
2. **El Módulo de Accesibilidad** ejecutará todo su ciclo de descubrimiento y simulación web.
3. **El Módulo de Accesibilidad** retornará un objeto de **Resultado Estándar JSON**:

```json
{
  "subcaracteristica": "Accesibilidad",
  "scoreGlobal": 71.43,
  "metricasBase": {
    "X21": 0.4286,
    "X22": 1.0000
  },
  "detallesAuditoria": {
    "timestamp": "2026-09-15T00:00:00Z",
    "funcionesEvaludas": 7,
    "idiomasEvaludos": 2
  }
}
```

4. **El Motor de Usabilidad** promediará este `scoreGlobal` (71.43%) junto con el de Aprendizaje, Operabilidad, etc., para calcular la calidad final de Usabilidad del software.

---
*Estado de implementación: La interfaz JSON ya está estandarizada y expuesta por la API `server.js` del módulo, encontrándose lista para ser consumida por módulos superiores pendientes de desarrollo.*
