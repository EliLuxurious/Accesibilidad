# MVP — Evaluador de Métricas de Accesibilidad

Este proyecto es una base funcional para las dos métricas:

## Métrica 21
`X21 = A21 / B21`

- `B21`: funciones implementadas dentro del alcance.
- `A21`: funciones de B21 que pueden utilizarse con éxito bajo el perfil de discapacidad definido.

El MVP usa Playwright + axe-core + una prueba básica de teclado como evidencia. La decisión final de si una función cuenta como 1 o 0 se confirma explícitamente para no confundir “sin errores automáticos” con “tarea accesible”.

## Métrica 22
`X22 = A22 / B22`

- `B22`: idiomas requeridos.
- `A22`: idiomas requeridos realmente admitidos.

## Instalación

1. Instala Node.js 20 o superior.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta:

```bash
npm install
npx playwright install chromium
npm start
```

4. Abre en Chrome:

```text
http://localhost:3000
```

## Primer uso con un ERP

1. Crea la evaluación.
2. Ingresa URL y credenciales.
3. Pulsa “Abrir navegador”.
4. Si el login no se detecta solo, usa selectores CSS.
5. Navega en la ventana Chromium que se abre.
6. Pulsa “Descubrir módulos” o “Descubrir acciones”.
7. Construye el inventario de funciones.
8. Para cada función:
   - sitúate en la pantalla correcta;
   - ejecuta el análisis;
   - opcionalmente crea un escenario Playwright;
   - revisa la evidencia;
   - confirma 1/0 para A21.
9. Registra los idiomas requeridos y confirma cuáles están realmente admitidos.
10. El sistema calcula ambas fórmulas.

## Obtener selectores con Playwright Codegen

Para registrar un flujo real:

```bash
npx playwright codegen https://tu-sistema.com
```

Interactúa con el sistema y Playwright generará selectores.

Ejemplo de escenario JSON admitido:

```json
[
  {"action":"click","selector":"text=Clientes"},
  {"action":"click","selector":"text=Nuevo cliente"},
  {"action":"fill","selector":"input[name='nombre']","value":"Cliente prueba"},
  {"action":"click","selector":"button[type='submit']"},
  {"action":"assertText","text":"Cliente registrado"}
]
```

Acciones admitidas:
- `goto`
- `click`
- `fill`
- `press`
- `select`
- `assertText`
- `assertVisible`
- `wait`

## Qué falta para una versión de tesis más completa

- importar SRS PDF/Word y extraer automáticamente funciones/idiomas;
- analizar ZIP del código para rutas, componentes e i18n;
- guardar los resultados completos de axe por función;
- integrar WAVE/AccessMonitor como evidencia importada;
- automatizar perfiles de discapacidad separados;
- añadir NVDA/Guidepup;
- exportar PDF/Excel;
- cifrar credenciales y separar sesiones por usuario.

## Seguridad

No uses este MVP como servicio público sin agregar autenticación, cifrado y un gestor de secretos. Las credenciales se usan solo para iniciar la sesión de navegador y no se guardan en SQLite.
