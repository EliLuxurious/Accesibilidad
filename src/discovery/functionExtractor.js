export function extractFunctionsFromDOM(data) {
    // Palabras que NO son funciones del negocio
    const excluir = [
        "español", "english", "cerrar sesión", "logout", "profile", "inicio",
        "mi perfil", "configuración", "ayuda", "contacto", "home", "perfil"
    ];

    let funciones = [];

    data.links.forEach(link => {
        let nombre = link.texto.trim();
        let url = link.href;
        let nombreLower = nombre.toLowerCase();

        // Limpieza básica de la URL
        const isInvalidUrl = !url || 
                             url === "null" || 
                             url === "undefined" || 
                             url.includes("javascript:void(0)") || 
                             url.includes("javascript:;") || 
                             url.endsWith("#") ||
                             url === data.url; // Ignorar el enlace a la página actual exacta si no tiene ruta adicional

        if (
            nombre && 
            !isInvalidUrl &&
            !excluir.some(e => nombreLower === e || nombreLower.startsWith(e))
        ) {
            let moduloPadre = inferirModuloPadre(url, nombre);

            funciones.push({
                nombre: nombre,
                modulo: moduloPadre,
                ruta: url,
                tipo: clasificarFuncion(nombre),
                accesible: false,
                evaluada: false
            });
        }
    });

    // Deduplicar por ruta para no tener la misma pantalla múltiples veces
    const unicas = [];
    const rutasVistas = new Set();
    for (const f of funciones) {
        if (!rutasVistas.has(f.ruta)) {
            rutasVistas.add(f.ruta);
            unicas.push(f);
        }
    }

    return unicas;
}

function inferirModuloPadre(url, nombre) {
    try {
        const urlObj = new URL(url);
        let parts = urlObj.hash ? urlObj.hash.split('/') : urlObj.pathname.split('/');
        parts = parts.filter(p => p && p !== '#' && p !== 'private');
        
        if (parts.length > 0) {
            // Asume el primer o segundo segmento importante como módulo
            let cand = parts[0];
            // Reemplazar guiones por espacios y capitalizar
            cand = cand.replace(/-/g, ' ');
            return cand.charAt(0).toUpperCase() + cand.slice(1);
        }
    } catch (e) {
        // Ignorar
    }
    return "General";
}

function clasificarFuncion(nombre) {
    nombre = nombre.toLowerCase();
    if (nombre.includes("registr") || nombre.includes("crear") || nombre.includes("nuevo") || nombre.includes("agregar")) {
        return "registro";
    }
    if (nombre.includes("editar") || nombre.includes("modificar") || nombre.includes("actualizar")) {
        return "mantenimiento";
    }
    if (nombre.includes("reporte") || nombre.includes("exportar")) {
        return "reporte";
    }
    if (nombre.includes("lista") || nombre.includes("ver") || nombre.includes("consultar") || nombre.includes("buscar")) {
        return "consulta";
    }
    return "otro";
}
