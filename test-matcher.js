import { matchFunctions } from "./src/discovery/matcher.js";

const SRS = [
    { id: "RF-001", nombre: "Registrar proyecto" },
    { id: "RF-002", nombre: "Registrar avances" },
    { id: "RF-003", nombre: "Consultar sesiones realizadas" },
    { id: "RF-004", nombre: "Administrar usuarios" }
];

const DESCUBIERTAS = [
    { modulo: "Proyecto", nombre: "Registro", ruta: "https://pucp.katsula.com/#/private/project/register" },
    { modulo: "Avances", nombre: "Registro", ruta: "https://pucp.katsula.com/#/private/advance/register" },
    { modulo: "Asesoría", nombre: "Sesiones", ruta: "https://pucp.katsula.com/#/private/advising-sesion/list" },
    { modulo: "General", nombre: "Ayuda", ruta: "javascript:void(0)" }
];

console.log("=== TESTS DEL MATCHER ===");
const emparejamientos = matchFunctions(SRS, DESCUBIERTAS);

emparejamientos.forEach(emp => {
    console.log(`\nRF: ${emp.funcionSRS}`);
    console.log(`Matched: ${emp.modulo} (${emp.ruta})`);
    console.log(`Score: ${emp.score}`);
    console.log(`Estado: ${emp.estado}`);
    console.log(`Detalles:`, emp.coincidencias);
});
