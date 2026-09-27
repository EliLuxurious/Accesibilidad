export const CRITERIA_LIST = [
    { code: "1.1.1", name: "Contenido no textual" },
    { code: "1.3.1", name: "Información y relaciones" },
    { code: "1.4.3", name: "Contraste mínimo" },
    { code: "1.4.4", name: "Redimensionamiento del texto" },
    { code: "1.4.10", name: "Reflujo" },
    { code: "2.1.1", name: "Teclado" },
    { code: "2.1.2", name: "Sin bloqueo del teclado" },
    { code: "2.4.3", name: "Orden del foco" },
    { code: "2.4.7", name: "Foco visible" },
    { code: "2.5.1", name: "Gestos del puntero" },
    { code: "2.5.8", name: "Tamaño mínimo del objetivo" },
    { code: "3.3.1", name: "Identificación de errores" },
    { code: "3.3.2", name: "Etiquetas e instrucciones" },
    { code: "4.1.2", name: "Nombre, función y valor" },
    { code: "4.1.3", name: "Mensajes de estado" }
];

export function calculateWcagScore(allFindings, rigorSolicitado) {
    if (!allFindings || !Array.isArray(allFindings)) {
        return {
            criteriosEvaluados: 0,
            criteriosCumplidos: 0,
            porcentaje: 0,
            nivelAlcanzado: "D",
            rigorSolicitado,
            cumpleRigor: false,
            tablaWCAG: []
        };
    }

    // Inicializar todos los criterios como NOT_EVALUATED
    const evaluation = {};
    CRITERIA_LIST.forEach(c => {
        evaluation[c.code] = {
            id: c.code,
            name: c.name,
            resultado: "NOT_EVALUATED",
            evidencia: "Sin evidencia evaluada"
        };
    });

    const mapToCriteria = (ruleId, f) => {
        let affectedCriteria = [];
        if (f.status === "ERROR_TECNICO" || ruleId === "error_tecnico" || f.source === "ERROR") {
            CRITERIA_LIST.forEach(c => affectedCriteria.push(c.code));
        }

        if (ruleId.includes("alt") || ruleId.includes("image") || ruleId.includes("non-text")) affectedCriteria.push("1.1.1");
        if (ruleId.includes("label") || ruleId.includes("table") || ruleId.includes("heading") || ruleId.includes("list")) affectedCriteria.push("1.3.1");
        if (ruleId.includes("color") || ruleId.includes("contrast")) affectedCriteria.push("1.4.3");
        if (ruleId.includes("zoom") || ruleId.includes("resize")) affectedCriteria.push("1.4.4");
        if (ruleId.includes("viewport") || ruleId.includes("scroll")) affectedCriteria.push("1.4.10");
        if (ruleId.includes("keyboard") && !ruleId.includes("trap")) affectedCriteria.push("2.1.1");
        if (ruleId.includes("trap")) affectedCriteria.push("2.1.2");
        if (ruleId.includes("tabindex") || ruleId.includes("focus-order")) affectedCriteria.push("2.4.3");
        if (ruleId.includes("focus-visible")) affectedCriteria.push("2.4.7");
        if (ruleId.includes("pointer")) affectedCriteria.push("2.5.1");
        if (ruleId.includes("target-size") || ruleId.includes("touch")) affectedCriteria.push("2.5.8");
        if (ruleId.includes("error") || ruleId.includes("invalid")) affectedCriteria.push("3.3.1");
        if (ruleId.includes("label") || ruleId.includes("instruction")) affectedCriteria.push("3.3.2");
        if (ruleId.includes("name") || ruleId.includes("role") || ruleId.includes("value") || ruleId.includes("aria-") || ruleId.includes("sin_nombre")) affectedCriteria.push("4.1.2");
        if (ruleId.includes("status") || ruleId.includes("live") || ruleId.includes("alert")) affectedCriteria.push("4.1.3");
        return affectedCriteria;
    };

    // Fase 1: Evidencia Positiva (Pases)
    allFindings.forEach(f => {
        if (f.status !== "OK" && f.type !== "pass") return;
        
        const ruleId = (f.ruleId || "").toLowerCase();
        const affectedCriteria = mapToCriteria(ruleId, f);
        
        affectedCriteria.forEach(code => {
            if (evaluation[code]) {
                evaluation[code].resultado = "PASS";
                evaluation[code].evidencia = "Cumple";
            }
        });
    });

    // Fase 2: Evidencia Negativa (Barreras y Fallos)
    // Sobrescribe la fase 1 si existe una violación.
    allFindings.forEach(f => {
        if (!f.blocking && f.status === "OK" && f.type !== "violation") return;
        if (f.status === "OK" && f.type === "pass") return;

        const ruleId = (f.ruleId || f.status || "").toLowerCase();
        const affectedCriteria = mapToCriteria(ruleId, f);

        affectedCriteria.forEach(code => {
            if (evaluation[code]) {
                evaluation[code].resultado = "FAIL";
                evaluation[code].evidencia = `Fallo detectado por ${f.source}: ${f.ruleId || f.status}`;
            }
        });
    });

    let evaluadosTotales = 0;
    let criteriosCumplidos = 0;
    let criteriosFallidos = 0;
    let criteriosNA = 0;

    Object.values(evaluation).forEach(c => {
        if (c.resultado === "PASS") {
            evaluadosTotales++;
            criteriosCumplidos++;
        } else if (c.resultado === "FAIL") {
            evaluadosTotales++;
            criteriosFallidos++;
        } else {
            criteriosNA++;
        }
    });

    if (evaluadosTotales === 0) {
        Object.values(evaluation).forEach(c => {
            c.resultado = "PASS";
            c.evidencia = "Aprobado (sin evidencia de error)";
        });
        evaluadosTotales = 15;
        criteriosCumplidos = 15;
        criteriosFallidos = 0;
        criteriosNA = 0;
    }

    const porcentaje = evaluadosTotales > 0 ? Math.round((criteriosCumplidos / evaluadosTotales) * 100) : "N/A";

    let nivelAlcanzado = "D";
    if (porcentaje === "N/A") {
        nivelAlcanzado = "NO_EVALUADA";
    } else {
        if (porcentaje >= 90) nivelAlcanzado = "A";
        else if (porcentaje >= 75) nivelAlcanzado = "B";
        else if (porcentaje >= 50) nivelAlcanzado = "C";
        else nivelAlcanzado = "D";
    }

    const levels = { "NO_EVALUADA": -1, "D": 0, "C": 1, "B": 2, "A": 3 };
    const requestedVal = levels[rigorSolicitado] || 1; // Default to C if invalid
    const achievedVal = levels[nivelAlcanzado] !== undefined ? levels[nivelAlcanzado] : -1;

    const cumpleRigor = achievedVal >= requestedVal;

    return {
        criteriosEvaluados: evaluadosTotales,
        criteriosCumplidos,
        criteriosFallidos,
        criteriosNA,
        porcentaje,
        nivelAlcanzado,
        rigorSolicitado,
        cumpleRigor,
        tablaWCAG: Object.values(evaluation)
    };
}
