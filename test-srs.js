import mammoth from "mammoth";

const resultado = await mammoth.extractRawText({
    path: "SRS_Sistema_Gestion_Asesorias.docx"
});

console.log(resultado.value);