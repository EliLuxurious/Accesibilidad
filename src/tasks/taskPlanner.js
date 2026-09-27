export function buildTaskPlan(emparejamiento) {
    const rfName = emparejamiento.funcionSRS.toLowerCase();
    const typeAndControls = classifyOperation(rfName);

    return {
        rfId: emparejamiento.rf,
        nombre: emparejamiento.funcionSRS,
        actor: "Estudiante",
        objetivo: `Completar la acción: ${emparejamiento.funcionSRS}`,
        tipoOperacion: typeAndControls.type,
        rutaInicial: emparejamiento.ruta,
        
        inputs: typeAndControls.inputs,
        actions: typeAndControls.actions,
        outputsEsperados: typeAndControls.outputsEsperados,
        outputsDetectados: [],
        completionEvidence: [],

        // Controls with semantic roles for evaluating essentiality
        expectedControlsMap: typeAndControls.controlsMap,
        expectedEssentialControls: Object.keys(typeAndControls.controlsMap),
        
        handoffEsperado: typeAndControls.handoffEsperado,
        source: "INFERRED",
        subflows: []
    };
}

function classifyOperation(rfName) {
    const dictionary = {
        REGISTER: {
            keywords: ["registrar", "registro", "crear", "nuevo", "agregar", "register", "create", "add", "new"],
            controlsMap: {
                "form": "TASK_INPUT",
                "input": "TASK_INPUT",
                "select": "TASK_INPUT",
                "textarea": "TASK_INPUT",
                "button[type=submit]": "TASK_ACTION",
                "button": "TASK_ACTION"
            },
            inputs: ["form", "input", "select", "textarea"],
            actions: ["submit", "guardar", "registrar"],
            outputsEsperados: ["toast", "cambio_ruta", "registro_tabla", "mensaje_exito"],
            handoff: true
        },
        QUERY: {
            keywords: ["consultar", "buscar", "listar", "ver", "list", "view", "search", "detalle"],
            controlsMap: {
                "input[type=search]": "TASK_INPUT",
                "select": "TASK_INPUT",
                "button": "TASK_ACTION",
                "table": "TASK_OUTPUT",
                "list": "TASK_OUTPUT"
            },
            inputs: ["input[type=search]", "select", "filtros"],
            actions: ["buscar", "filtrar", "ver"],
            outputsEsperados: ["tabla", "listado", "empty_state_valido"],
            handoff: false
        },
        GENERATE: {
            keywords: ["generar", "reporte", "report", "export", "exportar"],
            controlsMap: {
                "button": "TASK_ACTION",
                "table": "TASK_OUTPUT"
            },
            inputs: ["filtros", "parametros"],
            actions: ["generar", "descargar"],
            outputsEsperados: ["tabla_reporte", "grafico", "archivo_descarga"],
            handoff: false
        },
        APPROVE: {
            keywords: ["aprobar", "autorizar", "confirmar", "approve", "authorize", "confirm"],
            controlsMap: {
                "input[type=checkbox]": "TASK_INPUT",
                "button": "TASK_ACTION"
            },
            inputs: ["checkbox_confirmacion"],
            actions: ["aprobar", "rechazar"],
            outputsEsperados: ["cambio_estado", "toast"],
            handoff: true
        }
    };

    for (const [type, data] of Object.entries(dictionary)) {
        if (data.keywords.some(k => rfName.includes(k))) {
            return {
                type: type,
                controlsMap: data.controlsMap,
                inputs: data.inputs,
                actions: data.actions,
                outputsEsperados: data.outputsEsperados,
                handoffEsperado: data.handoff
            };
        }
    }

    return {
        type: "OTHER",
        controlsMap: { "button": "TASK_ACTION" },
        inputs: [],
        actions: ["click"],
        outputsEsperados: ["cambio_dom"],
        handoffEsperado: false
    };
}
