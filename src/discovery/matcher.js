const dictionary = {
    // Acciones
    "registrar": ["registrar", "registro", "register", "crear", "create", "add", "nuevo", "new"],
    "consultar": ["consultar", "consulta", "list", "lista", "view", "ver", "search", "buscar", "detail", "detalle"],
    "generar": ["generar", "report", "reports", "reporte", "exportar", "export"],
    "administrar": ["administrar", "management", "manage", "configuration", "configuracion", "gestionar", "gestion"],
    "actualizar": ["actualizar", "update", "editar", "edit", "modificar", "modify"],
    
    // Entidades (Ordenadas por peso conceptual, más específico primero)
    "solicitud": ["solicitud", "solicitudes", "request", "requests", "advisoring-request"],
    "sesion": ["sesion", "sesiones", "session", "sessions", "advising-sesion"],
    "proyecto": ["proyecto", "project", "proyectos", "projects"],
    "avance": ["avance", "avances", "advance", "advances"],
    "usuario": ["usuario", "usuarios", "user", "users", "cuenta", "account"]
};

function normalize(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
        .replace(/[^a-z0-9\s-]/g, " ") // quitar caracteres especiales pero mantener guiones útiles para URL
        .replace(/\s+/g, " ")
        .trim();
}

function getTokens(str) {
    const stopwords = ["de", "la", "el", "los", "las", "un", "una", "en", "para", "por", "y", "o", "realizadas", "asesoria", "advising"];
    return normalize(str).split(" ").filter(t => !stopwords.includes(t) && t.length > 2);
}

function extractConcepts(tokens) {
    const concepts = { accion: null, entidad: null };
    
    for (const token of tokens) {
        // Buscar acción
        for (const [key, synonyms] of Object.entries(dictionary)) {
            if (synonyms.includes(token) || synonyms.some(s => token.includes(s) || s.includes(token))) {
                if (!concepts.accion) concepts.accion = key;
            }
        }
    }

    // Buscar entidad conocida con mayor prioridad (así evitamos confundir solicitud de asesoría con sesión)
    const remainingTokens = tokens.filter(t => {
        let isAction = false;
        if (concepts.accion) {
             isAction = dictionary[concepts.accion].some(s => t.includes(s) || s.includes(t));
        }
        return !isAction;
    });

    if (remainingTokens.length > 0) {
        for (const token of remainingTokens) {
            for (const [key, synonyms] of Object.entries(dictionary)) {
                if (key !== "registrar" && key !== "consultar" && key !== "generar" && key !== "administrar" && key !== "actualizar") {
                    if (synonyms.includes(token) || synonyms.some(s => token.includes(s) || s.includes(token))) {
                        concepts.entidad = key;
                        break;
                    }
                }
            }
            if (concepts.entidad) break;
        }
        if (!concepts.entidad) {
            concepts.entidad = remainingTokens[0];
        }
    }

    return concepts;
}

function calculateDetailedScore(srsName, candName, candModule, candRoute) {
    const srsTokens = getTokens(srsName);
    const srsConcepts = extractConcepts(srsTokens);
    
    const candNameTokens = getTokens(candName);
    const candModTokens = getTokens(candModule);
    
    let routeStr = "";
    try {
        const url = new URL(candRoute);
        routeStr = url.hash ? url.hash : url.pathname;
        routeStr = routeStr.replace(/[^a-zA-Z0-9-]/g, " ").toLowerCase();
    } catch(e) {
        routeStr = candRoute.replace(/[^a-zA-Z0-9-]/g, " ").toLowerCase();
    }
    const candRouteTokens = getTokens(routeStr);
    
    // Auth context rejection
    if (routeStr.includes("login") || routeStr.includes("auth") || routeStr.includes("password") || candName.toLowerCase().includes("contraseña")) {
        // If the SRS function is not explicitly about login/password
        if (!srsName.toLowerCase().includes("contraseña") && !srsName.toLowerCase().includes("login") && !srsName.toLowerCase().includes("autentica")) {
            return { score: 0.1, details: { context: "AUTH_CONTEXT" }, concepts: srsConcepts }; // Auto reject
        }
    }

    let scores = {
        accion: 0,
        entidad: 0,
        modulo: 0,
        ruta: 0
    };
    
    let totalWeight = 0;
    let achievedWeight = 0;

    // 1. Evaluación de Entidad (Prioridad MUY Alta: Peso 0.7)
    let entityMatched = false;
    if (srsConcepts.entidad) {
        totalWeight += 0.7;
        const entitySynonyms = dictionary[srsConcepts.entidad] || [srsConcepts.entidad];
        
        const matchInName = candNameTokens.some(t => entitySynonyms.some(s => t === s || t.includes(s) || s.includes(t)));
        const matchInRoute = candRouteTokens.some(t => entitySynonyms.some(s => t === s || t.includes(s) || s.includes(t)));
        const matchInMod = candModTokens.some(t => entitySynonyms.some(s => t === s || t.includes(s) || s.includes(t)));
        
        if (matchInRoute || matchInName || matchInMod) { 
            scores.entidad = 1; 
            achievedWeight += 0.7; 
            entityMatched = true; 
        }
    } else {
        entityMatched = true; // If we couldn't extract an entity, we don't strictly penalize it yet, but total weight is lower
    }

    // 2. Evaluación de Acción (Peso: 0.3)
    if (srsConcepts.accion) {
        totalWeight += 0.3;
        const actionSynonyms = dictionary[srsConcepts.accion] || [srsConcepts.accion];
        
        const matchInName = candNameTokens.some(t => actionSynonyms.some(s => t === s || t.includes(s) || s.includes(t)));
        const matchInRoute = candRouteTokens.some(t => actionSynonyms.some(s => t === s || t.includes(s) || s.includes(t)));
        
        if (matchInName) { scores.accion = 1; achievedWeight += 0.3; }
        else if (matchInRoute) { scores.accion = 0.5; achievedWeight += 0.15; }
        else {
            // Si la ruta base (Entidad) coincidió perfectamente, y la acción es REGISTER pero estamos en /list
            // Es válido considerarlo asignado para pruebas internas (Descubrimiento en tiempo de ejecución)
            if (scores.entidad === 1 && (srsConcepts.accion === "registrar" || srsConcepts.accion === "crear")) {
                scores.accion = 0.5; achievedWeight += 0.15;
            }
        }
    }

    let finalScore = totalWeight > 0 ? achievedWeight / totalWeight : 0;
    
    // Penalización estricta: Si la entidad principal requerida no coincidió en absoluto, limitamos el score máximo a 0.3 (MATCHING_REJECTED)
    if (srsConcepts.entidad && !entityMatched) {
        finalScore = Math.min(finalScore, 0.3);
    }
    
    finalScore = Math.min(Math.max(finalScore, 0), 1);

    return { score: finalScore, details: scores, concepts: srsConcepts };
}

export function matchFunctions(funcionesSRS, modulosDescubiertos) {
    const emparejamientos = [];
    const UMBRAL_ASIGNADO = 0.60;
    const UMBRAL_REVISION = 0.40;

    for (const srsFunc of funcionesSRS) {
        let bestMatch = null;
        let bestScoreData = { score: 0, details: {} };

        for (const mod of modulosDescubiertos) {
            const scoreData = calculateDetailedScore(srsFunc.nombre, mod.nombre, mod.modulo, mod.ruta);
            if (scoreData.score > bestScoreData.score) {
                bestScoreData = scoreData;
                bestMatch = mod;
            }
        }

        const finalScore = parseFloat(bestScoreData.score.toFixed(2));
        let estado = "NO_ASIGNADA";
        
        if (finalScore >= UMBRAL_ASIGNADO) {
            estado = "asignado";
        } else if (finalScore >= UMBRAL_REVISION) {
            estado = "requiere_revision";
        }

        if (bestMatch && estado !== "NO_ASIGNADA") {
            emparejamientos.push({
                rf: srsFunc.id,
                funcionSRS: srsFunc.nombre,
                modulo: bestMatch.modulo + " / " + bestMatch.nombre,
                ruta: bestMatch.ruta,
                score: finalScore,
                estado: estado,
                coincidencias: bestScoreData.details,
                rawModulo: bestMatch
            });
        } else {
            emparejamientos.push({
                rf: srsFunc.id,
                funcionSRS: srsFunc.nombre,
                modulo: null,
                ruta: null,
                score: finalScore,
                estado: "NO_ASIGNADA",
                coincidencias: bestScoreData.details,
                rawModulo: null
            });
        }
    }

    return emparejamientos;
}
