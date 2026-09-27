import { matchFunctions } from "./src/discovery/matcher.js";

async function runTests() {
    console.log("\n=== TESTS OBLIGATORIOS (AUTH Y MATCHING) ===\n");
    let passed = 0;
    let total = 4;

    // We can only mock the matcher tests locally without browser, 
    // for auth we assume the previous playwright check works as designed or we skip playwright in this unit script

    // TEST 2: Olvidaste tu contraseña vs Administrar usuarios
    const srsFunc2 = { id: "RF-008", nombre: "Administrar usuarios" };
    const cand2 = { nombre: "Olvidaste tu contraseña", modulo: "Account", ruta: "https://pucp.katsula.com/#/account/forgot-password" };
    const match2 = matchFunctions([srsFunc2], [cand2]);
    if (match2[0].estado === "NO_ASIGNADA" && match2[0].score <= 0.3) {
        console.log("✅ TEST 2 PASS: 'Olvidaste tu contraseña' rechazado para 'Administrar usuarios'");
        passed++;
    } else {
        console.error("❌ TEST 2 FAIL: 'Olvidaste tu contraseña' NO fue rechazado.");
        console.log(match2[0]);
    }

    // TEST 3: Solicitudes / Lista vs Consultar solicitudes
    const srsFunc3 = { id: "RF-002", nombre: "Consultar solicitudes" };
    const cand3 = { nombre: "Lista", modulo: "Solicitudes", ruta: "https://pucp.katsula.com/#/advising-request/list" };
    const match3 = matchFunctions([srsFunc3], [cand3]);
    if (match3[0].estado === "asignado") {
        console.log("✅ TEST 3 PASS: 'Lista' en 'Solicitudes' aceptado para 'Consultar solicitudes'");
        passed++;
    } else {
        console.error("❌ TEST 3 FAIL: 'Consultar solicitudes' NO asignado a 'Lista'");
        console.log(match3[0]);
    }

    // TEST 4: Sesiones / Nueva sesión vs Registrar sesión de asesoría
    const srsFunc4 = { id: "RF-003", nombre: "Registrar sesión de asesoría" };
    const cand4 = { nombre: "Nueva sesión", modulo: "Sesiones", ruta: "https://pucp.katsula.com/#/advising-session/new" };
    const match4 = matchFunctions([srsFunc4], [cand4]);
    if (match4[0].estado === "asignado") {
        console.log("✅ TEST 4 PASS: 'Nueva sesión' aceptado para 'Registrar sesión de asesoría'");
        passed++;
    } else {
        console.error("❌ TEST 4 FAIL: 'Registrar sesión' NO asignado");
        console.log(match4[0]);
    }

    console.log(`\nRESULTADOS MATCHING: ${passed} / 3`);
    console.log("\nTEST 1 (Auth) debe probarse con servidor corriendo y curl.\n");
}

runTests();
