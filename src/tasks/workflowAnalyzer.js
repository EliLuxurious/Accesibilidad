export async function analyzeWorkflow(page, taskModel, resultDetection, execResult) {
    // Si la tarea esperaba un handoff, busquemos el estado
    if (taskModel.handoffEsperado) {
        const domWorkflow = await page.evaluate(() => {
            const text = document.body.innerText.toLowerCase();
            const workflowKeywords = {
                "PENDIENTE_APROBACION": ["pendiente", "en revisión", "pending", "review"],
                "ENVIADO": ["enviado", "submitted"],
                "APROBADO": ["aprobado", "approved"]
            };
            
            for (const [state, keywords] of Object.entries(workflowKeywords)) {
                if (keywords.some(k => text.includes(k))) {
                    return state;
                }
            }
            return null;
        });

        // HANDOFF_CONFIRMADO requiere acción previa ejecutada (WRITE) o una detección explícita
        // Si el executor no ejecutó la acción (modoPrueba=false), no podemos confirmar Handoff.
        const handoffConfirmado = (domWorkflow || resultDetection.detected) && execResult.ejecutado === true;

        if (domWorkflow || resultDetection.detected) {
            return {
                tipo: "HANDOFF",
                estadoDetectado: domWorkflow || "PENDIENTE",
                siguienteActor: taskModel.siguienteActor || "Siguiente Rol",
                confirmado: handoffConfirmado
            };
        }
    }

    return {
        tipo: "LECTURA/NAVEGACION",
        estadoDetectado: null,
        confirmado: resultDetection.detected || taskModel.tipoOperacion === "QUERY" || taskModel.tipoOperacion === "OTHER"
    };
}
