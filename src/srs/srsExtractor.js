import mammoth from "mammoth";
import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");

export async function extractSRS(filePath, originalName = "", mimeType = "") {
    let texto = "";
    
    const extName = path.extname(originalName).toLowerCase();
    const mime = mimeType.toLowerCase();
    
    let isPDF = false;
    let isDOCX = false;
    
    if (extName === ".pdf" || mime === "application/pdf") {
        isPDF = true;
    } else if (extName === ".docx" || mime.includes("wordprocessingml.document")) {
        isDOCX = true;
    } else {
        // Fallback: detectar por cabecera (magic bytes)
        try {
            const fd = await fs.open(filePath, 'r');
            const buffer = Buffer.alloc(4);
            await fd.read(buffer, 0, 4, 0);
            await fd.close();
            
            const magicStr = buffer.toString('utf-8', 0, 4);
            if (magicStr.startsWith('%PDF')) {
                isPDF = true;
            } else if (magicStr.startsWith('PK\x03\x04')) {
                isDOCX = true; // DOCX es un ZIP
            }
        } catch (e) {
            // Ignorar error y dejar que falle abajo
        }
    }

    if (isDOCX) {
        const resultado = await mammoth.extractRawText({ path: filePath });
        texto = resultado.value;
    } else if (isPDF) {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdf(dataBuffer);
        texto = data.text;
    } else {
        throw new Error(`Formato no soportado. Archivo: ${originalName || "Desconocido"}, MIME: ${mimeType || "Desconocido"}`);
    }

    // Buscar requisitos RF (Deduplicados)
    const funcionesMap = new Map();
    const lineas = texto.split("\n").map(x => x.trim()).filter(Boolean);

    // B22 - Idiomas requeridos
    const idiomasRequeridos = [];
    const idiomasKeywords = ["español", "inglés", "english", "portugués", "francés"];

    for (let i = 0; i < lineas.length; i++) {
        let linea = lineas[i];

        // Métrica 21: Requisitos Funcionales
        // Si hay varios RF en la misma línea, los separamos
        if (linea.match(/RF-\d+/)) {
            const rfParts = linea.split(/(?=RF-\d+)/).map(s => s.trim()).filter(s => s.match(/^RF-\d+/));
            
            for (const part of rfParts) {
                let id = part.split(" ")[0];
                let nombre = part.replace(/^RF-\d+\s*/, "").trim();

                if (!funcionesMap.has(id)) {
                    funcionesMap.set(id, {
                        id: id,
                        nombre: nombre,
                        accesibilidad: buscarAccesibilidad(lineas, i)
                    });
                }
            }
        }

        // Métrica 22: Detección básica de menciones de idiomas (simplificado)
        const lineaLower = linea.toLowerCase();
        if (lineaLower.includes("idioma") || lineaLower.includes("language")) {
            for (const lang of idiomasKeywords) {
                if (lineaLower.includes(lang) && !idiomasRequeridos.includes(lang)) {
                    idiomasRequeridos.push(lang);
                }
            }
        }
    }

    const funciones = Array.from(funcionesMap.values());

    return {
        textoExtraido: texto.substring(0, 500) + "... [Truncado]",
        funciones,
        B: funciones.length,
        idiomasRequeridos,
        B22: idiomasRequeridos.length
    };
}

function buscarAccesibilidad(lineas, posicion) {
    let resultado = "";
    for (let i = posicion; i < posicion + 10 && i < lineas.length; i++) {
        if (lineas[i].toLowerCase().includes("accesibilidad")) {
            resultado = lineas[i + 1] || "";
            break;
        }
    }
    return resultado;
}
