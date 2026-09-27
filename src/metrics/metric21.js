import { STATES } from "../accessibility/constants.js";

export function calculateMetric21(resultadosMultiPerfil, B21_SRS) {
    let A21 = 0;
    let B21_Implementadas = 0;
    let funcionesEvaluadas = 0;
    
    resultadosMultiPerfil.forEach(res => {
        // La implementación se confirma si está asignado o requiere revisión
        if (res.implementation.matchingStatus === "asignado" || res.implementation.matchingStatus === "requiere_revision") {
            B21_Implementadas++;
        }

        if (res.overallCuentaA21) {
            A21++;
        }

        // Se considera evaluada concluyentemente si todos los perfiles se ejecutaron sin ERROR_TECNICO general
        // Aquí simplificamos asumiendo que si se evaluaron todos los perfiles, incrementamos
        if (res.implementation.matchingStatus === "asignado") {
            funcionesEvaluadas++;
        }
    });

    let X21_decimal = null;
    let porcentajeX21 = "NO CALCULABLE";
    let x21Fraction = "0 / 0";
    
    if (B21_Implementadas > 0) {
        if (funcionesEvaluadas === 0) {
            X21_decimal = null;
            porcentajeX21 = "NO CALCULABLE";
            x21Fraction = "NO CALCULABLE";
        } else {
            X21_decimal = A21 / B21_Implementadas;
            porcentajeX21 = (X21_decimal * 100).toFixed(2) + "%";
            x21Fraction = `${A21} / ${B21_Implementadas}`;
        }
    }

    const coberturaImplementacion = B21_SRS > 0 ? Math.min(B21_Implementadas / B21_SRS, 1) : 0;
    const coberturaEvaluacion = B21_Implementadas > 0 ? Math.min(funcionesEvaluadas / B21_Implementadas, 1) : 0;
    
    return {
        A21,
        B21_Implementadas,
        B21_SRS,
        X21_decimal: X21_decimal || 0,
        porcentaje: porcentajeX21,
        x21Fraction,
        funcionesEvaluadas,
        preliminary: funcionesEvaluadas < B21_Implementadas,
        cobImpFrac: `${B21_Implementadas} / ${B21_SRS}`,
        coberturaImplementacion: (coberturaImplementacion * 100).toFixed(2) + "%",
        cobEvaFrac: `${funcionesEvaluadas} / ${B21_Implementadas}`,
        coberturaEvaluacion: (coberturaEvaluacion * 100).toFixed(2) + "%",
    };
}
