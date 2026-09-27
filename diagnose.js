import browserManager from "./src/browser/browserManager.js";
import { matchFunctions } from "./src/discovery/matcher.js";
import { evaluateAccessibility } from "./src/accessibility/accessibilityDecision.js";

async function run() {
    try {
        console.log("Inicializando navegador...");
        await browserManager.open("https://pucp.katsula.com/#/login");
        console.log("Navegador inicializado. Simulando login manual con un sleep de 3s...");
        await new Promise(r => setTimeout(r, 3000));
        
        const srs = [
            { id: "RF-004", nombre: "Consultar sesiones realizadas" }
        ];
        const modulos = [
            { nombre: "Lista", modulo: "Sesiones", ruta: "https://pucp.katsula.com/#/private/advising-sesion/list-advising-sesion" }
        ];
        
        console.log("Haciendo matching...");
        const match = matchFunctions(srs, modulos);
        
        console.log("Evaluando RF-004...");
        const res = await evaluateAccessibility(match[0], { rigorLevel: "C", perfil: "Visual", modoPrueba: false });
        
        console.log("RESULTADO:", JSON.stringify(res, null, 2));
    } catch (e) {
        console.error("EXCEPCION GLOBAL:", e);
    } finally {
        await browserManager.closeBrowser();
    }
}
run();
