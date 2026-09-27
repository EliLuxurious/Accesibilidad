import { STATES } from "../accessibility/constants.js";

const MAX_RETRIES = 2;

export async function executeTask(page, taskModel, policy, modoPrueba) {
    const isWrite = taskModel.tipoOperacion === "REGISTER" || taskModel.tipoOperacion === "APPROVE" || taskModel.tipoOperacion === "UPDATE";
    const isDestructive = taskModel.tipoOperacion === "DELETE";

    let actionType = "SAFE";
    if (isDestructive) actionType = "DESTRUCTIVE";
    else if (isWrite) actionType = "WRITE";

    let retryCount = 0;
    let urlAntes = page.url();
    let ejecutado = false;
    let error = null;

    // Ejecutar navegación inicial
    while (retryCount <= MAX_RETRIES) {
        try {
            await page.goto(taskModel.rutaInicial, { waitUntil: "domcontentloaded", timeout: 30000 });
            await page.waitForTimeout(2000); // estabilizar SPA
            ejecutado = true;
            break;
        } catch (e) {
            retryCount++;
            error = e.message;
            if (retryCount > MAX_RETRIES) {
                return {
                    status: STATES.ERROR_TECNICO,
                    message: `Fallo de navegación tras ${MAX_RETRIES} reintentos: ${error}`,
                    urlAntes
                };
            }
        }
    }

    // Comprobar política de ejecución
    if (actionType === "DESTRUCTIVE") {
        return {
            status: STATES.PARCIALMENTE_VERIFICADA,
            message: "Acción DESTRUCTIVE bloqueada por seguridad.",
            urlAntes,
            ejecutado
        };
    }

    if (actionType === "WRITE") {
        if (!policy.executeWriteTasks || !modoPrueba) {
            return {
                status: STATES.PARCIALMENTE_VERIFICADA,
                message: "Acción WRITE omitida (modoPrueba = false o Política estricta).",
                urlAntes,
                ejecutado
            };
        } else {
            // Lógica de llenado de formularios (Simulada por ahora, ya que en esta fase 
            // no hay IA generativa llenando inputs dinámicamente)
            // Se asume que el usuario/tester ya lo hizo manualmente o se hace un llenado básico
            try {
                // Aquí iría el Playwright fill/click
                // await page.fill('input', 'test');
                // await page.click('button[type="submit"]');
            } catch (e) {
                // NO reintentar WRITE
                return {
                    status: STATES.ERROR_TECNICO,
                    message: `Fallo al ejecutar operación WRITE: ${e.message}`,
                    urlAntes,
                    ejecutado
                };
            }
        }
    }

    return {
        status: "SUCCESS",
        message: "Navegación / Ejecución exitosa.",
        urlAntes,
        ejecutado
    };
}
