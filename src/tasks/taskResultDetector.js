export async function detectTaskResult(page, urlAntes, taskModel) {
    const urlDespues = page.url();
    const urlChanged = urlAntes !== urlDespues;

    const domEvidence = await page.evaluate((tipoOperacion) => {
        const text = document.body.innerText.toLowerCase();
        
        let foundKeywords = [];
        let hasToast = document.querySelector('.toast, .alert-success, .snackbar') !== null;
        let querySuccess = false;
        let generateSuccess = false;

        if (tipoOperacion === "REGISTER" || tipoOperacion === "APPROVE" || tipoOperacion === "UPDATE") {
            const successKeywords = ["registrado correctamente", "guardado", "enviado", "éxito", "success", "completado"];
            for (const k of successKeywords) {
                if (text.includes(k)) foundKeywords.push(k);
            }
        } 
        else if (tipoOperacion === "QUERY") {
            const hasTable = document.querySelector('table, ul, ol, .list, .grid, .results') !== null;
            const emptyStateKeywords = ["no se encontraron registros", "no hay datos", "sin resultados", "0 registros"];
            let hasEmptyState = false;
            for (const k of emptyStateKeywords) {
                if (text.includes(k)) hasEmptyState = true;
            }
            if (hasTable || hasEmptyState) querySuccess = true;
        }
        else if (tipoOperacion === "GENERATE") {
            const hasTable = document.querySelector('table, .report, .chart, canvas, .resultado, .export') !== null;
            if (hasTable) generateSuccess = true;
        }

        return {
            hasToast,
            foundKeywords,
            querySuccess,
            generateSuccess
        };
    }, taskModel.tipoOperacion);

    let confidence = 0;
    const evidence = [];

    if (taskModel.tipoOperacion === "QUERY") {
        if (domEvidence.querySuccess) {
            confidence += 1.0;
            evidence.push("Tabla, listado o empty-state válido detectado.");
            taskModel.outputsDetectados.push("Listado/Resultado o Empty-State válido");
        }
    } else if (taskModel.tipoOperacion === "GENERATE") {
        if (domEvidence.generateSuccess) {
            confidence += 1.0;
            evidence.push("Reporte, gráfico o tabla generado detectado.");
            taskModel.outputsDetectados.push("Tabla/Reporte/Output generado");
        } else {
            evidence.push("No se detectó un output de generación de reporte.");
        }
    } else {
        if (urlChanged) {
            confidence += 0.3;
            evidence.push(`URL cambió de ${urlAntes} a ${urlDespues}`);
        }
        
        if (domEvidence.hasToast) {
            confidence += 0.5;
            evidence.push("Elemento de notificación de éxito detectado en el DOM");
            taskModel.outputsDetectados.push("Toast de confirmación");
        }

        if (domEvidence.foundKeywords.length > 0) {
            confidence += 0.4;
            evidence.push(`Palabras de éxito encontradas: ${domEvidence.foundKeywords.join(", ")}`);
        }
    }
    
    taskModel.completionEvidence = evidence;

    return {
        detected: confidence > 0.4,
        confidence: Math.min(confidence, 1.0),
        evidence
    };
}
