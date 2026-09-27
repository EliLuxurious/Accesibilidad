import browserManager from "../browser/browserManager.js";
import { extractFunctionsFromDOM } from "./functionExtractor.js";

export async function discoverModules() {
    const page = browserManager.getPage();

    // Damos un pequeño tiempo para asegurar que el DOM esté estabilizado tras el login
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll("a"))
            .map(a => ({
                texto: a.innerText.trim(),
                href: a.href,
                className: a.className
            }))
            .filter(x => x.texto && x.href);

        return {
            titulo: document.title,
            url: location.href,
            links
        };
    });

    const funciones = extractFunctionsFromDOM(data);

    return {
        success: true,
        B: funciones.length,
        funciones,
        detalle: data
    };
}
