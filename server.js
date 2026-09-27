import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

import { extractSRS } from "./src/srs/srsExtractor.js";
import browserManager from "./src/browser/browserManager.js";
import { discoverModules } from "./src/discovery/systemDiscovery.js";
import { matchFunctions } from "./src/discovery/matcher.js";
import { evaluateAccessibility } from "./src/accessibility/accessibilityDecision.js";
import { calculateMetric21 } from "./src/metrics/metric21.js";
import { calculateMetric22 } from "./src/metrics/metric22.js";
import { calculateWcagScore } from "./src/rigor/wcagScorer.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({ dest: "uploads/" });

// ESTADO GLOBAL
let estadoGlobal = {
    srsData: null,
    funcionesDescubiertas: [],
    emparejamientos: [],
    resultadosFinales: null
};

// =====================================
// 1. SUBIR Y ANALIZAR SRS
// =====================================
app.post("/api/srs", upload.single("archivo"), async (req, res) => {
    try {
        if (!req.file) throw new Error("No se ha enviado ningún archivo.");
        
        console.log("Nombre original:", req.file.originalname);
        console.log("MIME:", req.file.mimetype);
        console.log("Ruta temporal:", req.file.path);
        
        const resultado = await extractSRS(req.file.path, req.file.originalname, req.file.mimetype);
        
        estadoGlobal.srsData = resultado;
        
        res.json({ success: true, srs: resultado });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// 2. ABRIR NAVEGADOR
// =====================================
app.post("/api/browser/open", async (req, res) => {
    try {
        const { url } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: "Debe indicar una URL"
            });
        }
        
        const resultado = await browserManager.open(url);
        
        res.json({
            success: true,
            mensaje: "Navegador abierto",
            url: resultado.url
        });
    } catch (error) {
        console.error("Error abriendo navegador:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Confirmar sesión (Guardar Session State opcional, pero principalmente confirmar que ya hizo login)
app.post("/api/browser/confirm-session", async (req, res) => {
    try {
        await browserManager.saveSession();
        res.json({ success: true, message: "Sesión guardada y confirmada." });
    } catch (error) {
        if (error.message === "SESSION_NOT_AUTHENTICATED") {
            return res.status(401).json({ success: false, code: "SESSION_NOT_AUTHENTICATED", error: "La sesión todavía no está autenticada. Complete el inicio de sesión en el navegador." });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// 3. DESCUBRIR MÓDULOS Y EMPAREJAR
// =====================================
app.post("/api/system/discover", async (req, res) => {
    try {
        if (!estadoGlobal.srsData) throw new Error("Primero debes analizar el SRS.");
        if (!browserManager.sessionAuthenticated) {
            return res.status(409).json({ success: false, error: "SESSION_NOT_AUTHENTICATED" });
        }
        
        const discoveryResult = await discoverModules();
        estadoGlobal.funcionesDescubiertas = discoveryResult.funciones;
        
        const emparejamientos = matchFunctions(estadoGlobal.srsData.funciones, estadoGlobal.funcionesDescubiertas);
        estadoGlobal.emparejamientos = emparejamientos;
        
        res.json({ success: true, emparejamientos, descubiertas: discoveryResult.B });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =====================================
// 4. EVALUAR ACCESIBILIDAD Y CALCULAR
// =====================================
app.post("/api/system/evaluate", async (req, res) => {
    try {
        const { rigorLevel, modoPrueba } = req.body || {};
        
        // Perfiles obligatorios a evaluar
        const perfiles = ["Visual", "Motora", "Auditiva", "Cognitiva"];

        if (!estadoGlobal.emparejamientos || estadoGlobal.emparejamientos.length === 0 || !browserManager.sessionAuthenticated) {
            return res.json({
                success: true,
                resultadosEvaluacion: [],
                metric21: { A21: 0, B21_Implementadas: 0, porcentaje: "0%" },
                metric22: null
            });
        }

        const resultadosMultiPerfil = [];

        const totalRFs = estadoGlobal.emparejamientos.length;
        let counter = 1;

        console.log(`\n=== INICIANDO EVALUACIÓN FUNCIONAL ===`);
        console.log(`Browser existe: ${!!browserManager.browser}`);
        console.log(`Context existe: ${!!browserManager.context}`);
        console.log(`Page existe: ${!!browserManager.page}`);

        for (const emparejamiento of estadoGlobal.emparejamientos) {
            let evalResultados = {};
            let allProfilesSuccess = true;
            const logPrefix = `[${counter}/${totalRFs}]`;

            if (emparejamiento.estado === "asignado") {
                for (const perfil of perfiles) {
                    const resEval = await evaluateAccessibility(emparejamiento, { rigorLevel, perfil, modoPrueba, logPrefix });
                    evalResultados[perfil] = resEval;
                    if (!resEval.functionalSuccess) {
                        allProfilesSuccess = false;
                    }
                }
                resultadosMultiPerfil.push({
                    rf: emparejamiento.rf,
                    funcionSRS: emparejamiento.funcionSRS,
                    implementation: {
                        matchingStatus: emparejamiento.estado,
                        score: emparejamiento.score,
                        route: emparejamiento.ruta
                    },
                    profiles: evalResultados,
                    overallCuentaA21: allProfilesSuccess
                });
            } else {
                resultadosMultiPerfil.push({
                    funcion: emparejamiento.rf,
                    rf: emparejamiento.rf, // Mantener rf para compatibilidad del frontend si lo necesita
                    funcionSRS: emparejamiento.funcionSRS,
                    estado: "NO_CONFIRMADA_EN_ROL_ACTUAL",
                    accesible: false,
                    wcag: null,
                    implementation: { matchingStatus: emparejamiento.estado },
                    profiles: {},
                    overallCuentaA21: false
                });
            }
            
            counter++;
        }

        // ==========================================
        // ETAPA INTERMEDIA: EVALUACIÓN DE EVIDENCIAS
        // ==========================================
        
        let globalWcagEvaluados = 0;
        let globalWcagCumplidos = 0;
        
        let etapaEvidencias = [];

        for (const res of resultadosMultiPerfil) {
            if (res.implementation.matchingStatus === "asignado") {
                let allFindings = [];
                let axeResults = [];
                let ariaResults = [];
                let keyboardResults = [];
                let executedFully = false;
                
                for (const perfil of perfiles) {
                    if (res.profiles[perfil]) {
                        if (res.profiles[perfil].evaluada) executedFully = true;
                        
                        if (res.profiles[perfil].axeResults) axeResults = axeResults.concat(res.profiles[perfil].axeResults);
                        if (res.profiles[perfil].ariaResults) ariaResults = ariaResults.concat(res.profiles[perfil].ariaResults);
                        if (res.profiles[perfil].keyboardResults) keyboardResults = keyboardResults.concat(res.profiles[perfil].keyboardResults);
                        if (res.profiles[perfil].allFindings) allFindings = allFindings.concat(res.profiles[perfil].allFindings);
                    }
                }
                
                if (executedFully) {
                    etapaEvidencias.push({
                        rf: res.rf,
                        axeResults,
                        ariaResults,
                        keyboardResults,
                        findings: allFindings,
                        evaluated: true,
                        functionalExecuted: res.profiles.Visual?.functionalSuccess || false
                    });
                } else {
                    etapaEvidencias.push({ rf: res.rf, findings: null, evaluated: false, functionalExecuted: false });
                }
            } else {
                etapaEvidencias.push({
                    rf: res.rf,
                    findings: null,
                    evaluated: false,
                    functionalExecuted: false
                });
            }
        }

        for (const ev of etapaEvidencias) {
            console.log(`\n=== ESTADO RF ===`);
            console.log(`${ev.rf}`);
            console.log(`functionalExecuted: ${ev.functionalExecuted}`);
            if (ev.evaluated) {
                console.log(`axeFindings: ${ev.axeResults.length}`);
                console.log(`ariaFindings: ${ev.ariaResults.length}`);
                console.log(`keyboardFindings: ${ev.keyboardResults.length}`);
            } else {
                console.log(`axeFindings: 0`);
                console.log(`ariaFindings: 0`);
                console.log(`keyboardFindings: 0`);
            }
            console.log(`evaluated: ${ev.evaluated}`);
        }

        // ==========================================
        // NUEVA FASE: Evaluación WCAG 2.2 Global
        // ==========================================

        for (const res of resultadosMultiPerfil) {
            const ev = etapaEvidencias.find(e => e.rf === res.rf);
            
            if (ev && ev.findings !== null) {
                res.wcagScore = calculateWcagScore(ev.findings, rigorLevel);
                
                if (!res.wcagScore.cumpleRigor) {
                    res.overallCuentaA21 = false;
                    for (const perfil of perfiles) {
                        if (res.profiles[perfil] && (res.profiles[perfil].estado === "EVALUADA_ACCESIBLE" || res.profiles[perfil].estado === "HANDOFF_CONFIRMADO")) {
                            res.profiles[perfil].estado = "EVALUADA_CON_BARRERA";
                            res.profiles[perfil].razon = `No cumple el Nivel de Rigor solicitado (Solicitado: ${res.wcagScore.rigorSolicitado}, Alcanzado: ${res.wcagScore.nivelAlcanzado} con ${res.wcagScore.porcentaje}% WCAG).`;
                        }
                    }
                }
                globalWcagEvaluados += res.wcagScore.criteriosEvaluados;
                globalWcagCumplidos += res.wcagScore.criteriosCumplidos;
            } else {
                res.wcagScore = {
                    criteriosEvaluados: 0,
                    criteriosCumplidos: 0,
                    criteriosFallidos: 0,
                    criteriosNA: 15,
                    porcentaje: "N/A",
                    nivelAlcanzado: "NO_EVALUADA",
                    rigorSolicitado: rigorLevel,
                    cumpleRigor: false,
                    tablaWCAG: []
                };
                res.overallCuentaA21 = false; // M21 es 0 porque no cumple rigor o no fue evaluada
            }
        }

        // Calcular Métrica 21
        const metric21 = calculateMetric21(resultadosMultiPerfil, estadoGlobal.srsData.B);
        
        // Calcular Métrica 22
        const metric22 = await calculateMetric22(estadoGlobal.srsData.B22);
        
        const globalAccesibilidad = ((metric21.X21_decimal * 100) + (metric22.X22_decimal * 100)) / 2;

        const porcentajeGlobalWCAG = globalWcagEvaluados > 0 ? Math.round((globalWcagCumplidos / globalWcagEvaluados) * 100) : 0;
        let nivelGlobal = "D";
        if (porcentajeGlobalWCAG >= 90) nivelGlobal = "A";
        else if (porcentajeGlobalWCAG >= 75) nivelGlobal = "B";
        else if (porcentajeGlobalWCAG >= 50) nivelGlobal = "C";

        console.log(`\n=== FINALIZANDO EVALUACIÓN ===`);
        console.log(`Funciones evaluadas: ${totalRFs}`);
        console.log(`Funciones accesibles: ${metric21.A21}`);
        console.log(`Resultado Métrica 21: ${metric21.porcentaje}`);
        console.log(`\nResumen Técnico WCAG 2.2:`);
        console.log(`- Total de criterios evaluados: ${globalWcagEvaluados}`);
        console.log(`- Total criterios cumplidos: ${globalWcagCumplidos}`);
        console.log(`- Porcentaje global WCAG: ${porcentajeGlobalWCAG}%`);
        console.log(`- Nivel técnico alcanzado: ${nivelGlobal}`);

        estadoGlobal.resultadosFinales = { 
            metric21,
            metric22,
            globalAccesibilidad, // Se expone para Métrica 21 + 22
            wcagGlobal: {
                totalCriteriosEvaluados: globalWcagEvaluados,
                totalCriteriosCumplidos: globalWcagCumplidos,
                porcentajeGlobalWCAG: porcentajeGlobalWCAG,
                nivelTecnicoAlcanzado: nivelGlobal
            },
            resultados: resultadosMultiPerfil
        };

        console.log(`\nGenerando reporte JSON...`);
        console.log("VALIDANDO JSON FINAL");

        // Eliminar referencias a Playwright (browser, page, request, response, etc)
        const safeStringify = (obj) => {
            const cache = new Set();
            return JSON.stringify(obj, (key, value) => {
                const forbiddenKeys = ['page', 'browser', 'context', 'request', 'response', 'streams', '_client', '_connection'];
                if (forbiddenKeys.includes(key)) return undefined;
                if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) return undefined; // Circular ref
                    cache.add(value);
                }
                return value;
            });
        };

        let safePayload;
        try {
            safePayload = safeStringify({
                success: true,
                data: estadoGlobal.resultadosFinales
            });
            console.log("JSON válido");

            console.log(`\n=== TABLA FINAL ===`);
            console.log(`RF | Criterios WCAG | % WCAG | Nivel alcanzado | Nivel solicitado | Resultado M21`);
            for (const res of resultadosMultiPerfil) {
                if (res.wcagScore) {
                    if (res.wcagScore.nivelAlcanzado === "NO_EVALUADA") {
                        console.log(`${res.rf} | 0/0 | N/A | NO_EVALUADA | ${res.wcagScore.rigorSolicitado} | 0`);
                    } else {
                        console.log(`${res.rf} | ${res.wcagScore.criteriosCumplidos}/${res.wcagScore.criteriosEvaluados} | ${res.wcagScore.porcentaje}% | ${res.wcagScore.nivelAlcanzado} | ${res.wcagScore.rigorSolicitado} | ${res.overallCuentaA21 ? '1' : '0'}`);
                    }
                }
            }
            
            console.log(`\n=== RESULTADO FINAL ===\n`);
            console.log(`M21:`);
            console.log(`A=${metric21.A21}`);
            console.log(`B=${metric21.B21_Implementadas}`);
            console.log(`X21=${metric21.porcentaje}\n`);
            console.log(`M22:`);
            console.log(`A=${metric22.A22}`);
            console.log(`B=${metric22.B22}`);
            console.log(`X22=${metric22.porcentaje}\n`);
            console.log(`GLOBAL:`);
            console.log(`${globalAccesibilidad.toFixed(2)}%`);
        } catch (error) {
            console.error("ERROR JSON:");
            console.error(error.stack);
            return res.status(500).json({ success: false, error: "Error de serialización JSON: " + error.message });
        }
        
        res.type('json').send(safePayload);

    } catch (error) {
        console.error("ERROR 500 en endpoint /evaluate:", error.stack);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
});

// =====================================
// FRONTEND ROUTING
// =====================================
// Express static ya se encarga de servir index.html por defecto para '/'

app.listen(PORT, () => {
    console.log(`\nServidor activo: http://localhost:${PORT}\n`);
});