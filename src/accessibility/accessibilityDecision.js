import browserManager from "../browser/browserManager.js";
import { evaluateWithAxe } from "./axeEvaluator.js";
import { evaluateKeyboard } from "./keyboardEvaluator.js";
import { evaluateARIA } from "./ariaEvaluator.js";
import { STATES } from "./constants.js";
import { buildTaskPlan } from "../tasks/taskPlanner.js";
import { executeTask } from "../tasks/taskExecutor.js";
import { detectTaskResult } from "../tasks/taskResultDetector.js";
import { analyzeWorkflow } from "../tasks/workflowAnalyzer.js";
import { getRigorPolicy } from "../rigor/rigorPolicy.js";

export async function evaluateAccessibility(emparejamiento, options) {
    const { rigorLevel = "C", perfil = "Visual", modoPrueba = false, logPrefix = "" } = options || {};
    
    if (perfil === "Visual") {
        console.log(`${logPrefix} Analizando ${emparejamiento.rf || "Función"}`);
    }
    
    const policy = getRigorPolicy(rigorLevel);
    const page = browserManager.getPage();
    
    // 1. Task Planning
    const taskModel = buildTaskPlan(emparejamiento);

    if (!taskModel.rutaInicial || emparejamiento.estado !== "asignado") {
        return {
            evaluada: false,
            estado: emparejamiento.estado === "requiere_revision" ? STATES.REQUIERE_REVISION_MATCHING : STATES.NO_CONFIRMADA_EN_ROL_ACTUAL,
            motivo: "No existe URL asignada para evaluar o no está confirmada para el rol.",
            taskModel
        };
    }

    try {
        // 2. Ejecución Segura
        const execResult = await executeTask(page, taskModel, policy, modoPrueba);
        
        // ORDEN ESTRICTO 1: implementationConfirmed
        if (execResult.status === STATES.ERROR_TECNICO || execResult.status === STATES.PARCIALMENTE_VERIFICADA) {
            return {
                evaluada: false,
                estado: execResult.status,
                motivo: execResult.message,
                taskModel,
                urlAntes: execResult.urlAntes
            };
        }

        const currentUrl = page.url();
        const urlLower = currentUrl.toLowerCase();

        // 3. Resultado de Tarea y Workflow Handoff
        const resultDetection = await detectTaskResult(page, execResult.urlAntes, taskModel);
        const workflow = await analyzeWorkflow(page, taskModel, resultDetection, execResult);

        let handoffConfirmado = workflow.tipo === "HANDOFF" && workflow.confirmado;
        
        let businessTaskCompleted = resultDetection.detected;
        if (taskModel.tipoOperacion === "GENERATE" && taskModel.outputsDetectados.length === 0) {
            businessTaskCompleted = false; // No se detectó la tabla o gráfico
        }
        if (handoffConfirmado) {
            businessTaskCompleted = true;
        }

        const isWriteAction = taskModel.tipoOperacion === "REGISTER" || taskModel.tipoOperacion === "APPROVE" || taskModel.tipoOperacion === "UPDATE" || taskModel.tipoOperacion === "DELETE";
        const writeAllowed = policy.executeWriteTasks || modoPrueba;
        const writeExecuted = isWriteAction ? execResult.ejecutado === true : false;

        // Minimal Successful Path: If a QUERY/GENERATE succeeded without requiring write/actions on inputs,
        // inputs are downgraded to TASK_RELATED.
        let minimalSuccessfulPath = false;
        if ((taskModel.tipoOperacion === "QUERY" || taskModel.tipoOperacion === "GENERATE") && businessTaskCompleted && !writeExecuted) {
            minimalSuccessfulPath = true;
        }

        // 4. Evaluaciones de Accesibilidad
        let wcagResult = { evaluada: false, detalles: [] };
        let ariaResult = { evaluado: false, validations: [] };
        let keyboardResult = { tested: false, findings: [] };

        if (policy.fullAxe || policy.evaluateAria) {
            if (perfil === "Visual") console.log(`${logPrefix} Ejecutando evaluaciones (Axe, ARIA, Teclado)`);
            wcagResult = await evaluateWithAxe(page);
            // ORDEN ESTRICTO 3: technical error
            if (!wcagResult.evaluada) {
                wcagResult.detalles = [{
                    source: "ERROR",
                    type: "violation",
                    ruleId: "ERROR_TECNICO",
                    status: "ERROR_TECNICO",
                    impacto: "critical",
                    descripcion: "Fallo en motor Axe: " + (wcagResult.error || "Desconocido"),
                    selector: "body",
                    scope: "GLOBAL",
                    relevantToProfile: true,
                    blocking: true,
                    reason: "Fallo en motor de evaluación"
                }];
                wcagResult.evaluada = true; // Forzamos para no detener evaluación
            }
            
            keyboardResult = await evaluateKeyboard(page, taskModel.expectedEssentialControls, taskModel);
            
            const controlesReales = keyboardResult.tested ? keyboardResult.controlesEsenciales.map(c => c.selector) : taskModel.expectedEssentialControls;
            ariaResult = await evaluateARIA(page, controlesReales);
        }
        
        // Consolidar Findings
        const allFindings = [
            ...(wcagResult.detalles || []),
            ...(ariaResult.validations || []),
            ...(keyboardResult.findings || [])
        ];

        // 5. Motor de Decisión Funcional (Profile-aware y Causalidad)
        let estadoDecision = STATES.EVALUADA_ACCESIBLE;
        let razon = "No se detectaron barreras bloqueantes para los controles funcionales esenciales bajo el perfil evaluado.";
        let barrerasBloqueantes = [];
        let accesibleFuncionalmente = true;
        let accessiblePathCompleted = true;
        
        const isVisual = perfil === "Visual";
        const isMotor = perfil === "Motora";
        const isAuditivo = perfil === "Auditiva";
        
        allFindings.forEach(f => {
            // Assign Task Role and adjust Scope dynamically
            let taskRole = "OTHER";
            if (f.selector && taskModel.expectedControlsMap) {
                for (const [sel, role] of Object.entries(taskModel.expectedControlsMap)) {
                    if (f.selector.includes(sel)) taskRole = role;
                }
            }
            f.taskRole = taskRole;

            if (minimalSuccessfulPath && taskRole === "TASK_INPUT") {
                if (f.scope === "CURRENT_STEP_ESSENTIAL" || f.scope === "TASK_ESSENTIAL") {
                    f.scope = "TASK_RELATED";
                }
            }

            // 1. relevantToProfile
            f.relevantToProfile = false;
            if (f.source === "AXE") {
                if (isVisual && (f.ruleId.includes("color") || f.ruleId.includes("label") || f.ruleId.includes("alt") || f.ruleId.includes("name"))) f.relevantToProfile = true;
                if (isMotor && (f.ruleId.includes("keyboard") || f.ruleId.includes("focus"))) f.relevantToProfile = true;
                if (isAuditivo && (f.ruleId.includes("audio") || f.ruleId.includes("video"))) f.relevantToProfile = true;
            } else if (f.source === "ARIA") {
                if (isVisual && f.status === "CONTROL_ESENCIAL_SIN_NOMBRE") f.relevantToProfile = true;
            } else if (f.source === "KEYBOARD") {
                if (isMotor) f.relevantToProfile = true;
            }

            // 2. relatedToTask & essentialForCompletion
            f.essentialForCompletion = (f.scope === "CURRENT_STEP_ESSENTIAL" || f.scope === "TASK_ESSENTIAL");
            f.relatedToTask = f.essentialForCompletion || f.scope === "TASK_RELATED";

            // 3. affectsAccessibleUse
            f.affectsAccessibleUse = false;
            if (f.source === "AXE" && (f.impacto === "critical" || f.impacto === "serious")) f.affectsAccessibleUse = true;
            if (f.source === "ARIA" && f.status === "CONTROL_ESENCIAL_SIN_NOMBRE") f.affectsAccessibleUse = true;
            if (f.source === "KEYBOARD" && f.ruleId !== "tabindex") f.affectsAccessibleUse = true;

            // 4. blocking
            f.blocking = false;
            if (f.relevantToProfile && f.essentialForCompletion && f.affectsAccessibleUse) {
                // Special check: Table without name is not automatically a barrier, even if it's TASK_OUTPUT
                if (f.source === "ARIA" && f.elementType === "table") {
                    f.blocking = false; 
                } else {
                    f.blocking = true;
                    f.reason = f.reason || "Barrera funcional comprobada.";
                }
            }
            
            if (f.blocking) {
                barrerasBloqueantes.push(f);
            }
        });

        if (barrerasBloqueantes.length > 0) {
            accessiblePathCompleted = false;
            estadoDecision = STATES.EVALUADA_CON_BARRERA;
            
            // Generate a causal explanation based on the first blocking barrier
            const firstBarrier = barrerasBloqueantes[0];
            const controlType = firstBarrier.elementType || "control";
            razon = `La función no pudo completarse de forma accesible porque el ${controlType} es necesario (TASK_ESSENTIAL), pero presenta un problema crítico relevante al perfil ${perfil} (${firstBarrier.status || firstBarrier.ruleId || firstBarrier.reason}).`;
            accesibleFuncionalmente = false;
        }
        
        // ORDEN ESTRICTO 4: task/handoff confirmed
        if (!businessTaskCompleted) {
            if (barrerasBloqueantes.length === 0) {
                accessiblePathCompleted = null; // No evidence it was accessible, but no evidence of barrier
                estadoDecision = STATES.INCONCLUSO_AUTOMATICO;
                razon = "No se pudo confirmar automáticamente el output final de la tarea, y no se detectaron barreras bloqueantes claras.";
            } else {
                accessiblePathCompleted = false;
                estadoDecision = STATES.EVALUADA_CON_BARRERA;
                // Reason already set in the previous block based on causality
            }
            accesibleFuncionalmente = false;
        }

        // Handoff supremo
        if (handoffConfirmado && estadoDecision === STATES.EVALUADA_ACCESIBLE) {
            estadoDecision = STATES.HANDOFF_CONFIRMADO;
            razon = "La tarea fue completada exitosamente y el Handoff confirmado.";
        }

        let functionalSuccess = false;
        if (
            (businessTaskCompleted || handoffConfirmado) &&
            accessiblePathCompleted === true &&
            barrerasBloqueantes.length === 0
        ) {
            functionalSuccess = true;
        }

        return {
            evaluada: true,
            estado: estadoDecision,
            razon: razon,
            accesibleFuncionalmente,
            tareaCompletada: businessTaskCompleted,
            accessiblePathCompleted,
            functionalSuccess, // M21 logic in server.js uses this
            writeAllowed,
            writeExecuted,
            minimalSuccessfulPath,
            handoffConfirmado,
            barrerasBloqueantes,
            axeResults: wcagResult.detalles || [],
            ariaResults: ariaResult.validations || [],
            keyboardResults: keyboardResult.findings || [],
            allFindings,
            urlFinal: currentUrl,
            taskModel,
            teclado: keyboardResult,
            wcag: wcagResult,
            aria: ariaResult,
            workflow
        };

    } catch (error) {
        console.error("ERROR_TECNICO en accessibilityDecision:", error);
        
        return {
            evaluada: true, // Para que pueda mostrarse en tabla en vez de abortar
            estado: STATES.ERROR_TECNICO,
            razon: "Fallo general en ejecución de tarea: " + error.message,
            motivo: "Fallo general en ejecución de tarea",
            error: error.message,
            stack: error.stack,
            functionalSuccess: false,
            axeResults: [],
            ariaResults: [],
            keyboardResults: [],
            allFindings: [],
            taskModel: typeof taskModel !== 'undefined' ? taskModel : null
        };
    }
}
