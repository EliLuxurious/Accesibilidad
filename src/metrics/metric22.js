import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function calculateMetric22(B22_SRS) {
    let A22 = 0;
    const localesPath = path.join(__dirname, '..', '..', 'public', 'locales');
    const localesAvailable = [];
    
    try {
        const files = await fs.readdir(localesPath);
        for (const file of files) {
            if (file.endsWith('.json')) {
                localesAvailable.push(file.replace('.json', ''));
                A22++;
            }
        }
    } catch (e) {
        console.warn("No se pudo leer la carpeta locales:", e.message);
    }

    let bReal = B22_SRS > 0 ? B22_SRS : 1; 
    
    const X22_decimal = A22 / bReal;
    const X22_pct = X22_decimal * 100;

    let wcag = {
        "3.1.1": 0,
        "3.1.2": 0,
        "3.1.3": 0,
        "3.1.4": 0,
        "3.1.5": 0,
        "3.1.6": 0
    };

    try {
        const indexHtml = await fs.readFile(path.join(__dirname, '..', '..', 'public', 'index.html'), 'utf-8');
        const appJs = await fs.readFile(path.join(__dirname, '..', '..', 'public', 'app.js'), 'utf-8');
        
        if (indexHtml.includes('lang="')) wcag["3.1.1"] = 1;
        if (indexHtml.includes('lang="en"') || appJs.includes('lang="en"')) wcag["3.1.2"] = 1;
        if (indexHtml.includes('<abbr')) wcag["3.1.4"] = 1;
        
        if (A22 >= 2) {
            wcag["3.1.3"] = 1;
            wcag["3.1.5"] = 1;
            wcag["3.1.6"] = 1;
        }

    } catch (e) {
        console.warn("No se pudieron verificar las reglas WCAG 2.2 de idioma", e.message);
    }

    return {
        A22,
        B22: bReal,
        X22_decimal,
        porcentaje: X22_pct.toFixed(2) + "%",
        locales: localesAvailable,
        wcag
    };
}
