export function resolveRigor(params) {
    const { manualLevel, kemLevel } = params;
    
    let level = "C"; // Default
    let source = "DEFAULT";
    
    if (kemLevel) {
        level = kemLevel;
        source = "KEM";
    } else if (manualLevel) {
        level = manualLevel;
        source = "SELECCION_MANUAL";
    }

    return {
        level,
        source
    };
}

export function getRigorPolicy(level) {
    // Definición de las políticas
    const basePolicy = {
        executeWriteTasks: false,
        useTaskPlanner: false,
        evaluateAria: false,
        fullAxe: false,
        retryTasks: false,
        repeatEvaluations: false,
        multipleBrowsers: false,
        secondaryProvider: false
    };

    switch(level) {
        case "A":
            return {
                ...basePolicy,
                useTaskPlanner: true,
                evaluateAria: true,
                fullAxe: true,
                retryTasks: true,
                executeWriteTasks: true, // Only if modoPrueba is also true
                repeatEvaluations: true,
                multipleBrowsers: true,
                secondaryProvider: true
            };
        case "B":
            return {
                ...basePolicy,
                useTaskPlanner: true,
                evaluateAria: true,
                fullAxe: true,
                retryTasks: true,
                executeWriteTasks: true, // Only if modoPrueba is also true
                repeatEvaluations: true,
                secondaryProvider: true
            };
        case "C":
            return {
                ...basePolicy,
                useTaskPlanner: true,
                evaluateAria: true,
                fullAxe: true,
                retryTasks: true,
                executeWriteTasks: true // Only if modoPrueba is also true
            };
        case "D":
        default:
            return {
                ...basePolicy
            };
    }
}
