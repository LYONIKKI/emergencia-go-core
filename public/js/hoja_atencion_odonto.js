const API_URL = "http://172.16.10.240:8080/api";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Fecha y hora del reporte impreso
    const hoy = new Date();
    document.getElementById("print-fecha-hoy").textContent = hoy.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    document.getElementById("print-hora-hoy").textContent = hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true });

    // 2. Extraer cuenta de la URL (?cuenta=329038)
    const urlParams = new URLSearchParams(window.location.search);
    const nroCuenta = urlParams.get("cuenta");

    if (!nroCuenta) {
        alert("No se proporcionó un número de cuenta válido.");
        return;
    }

    try {
        const res = await fetch(`${API_URL}/odontologia/hoja-atencion/${nroCuenta}`);
        if (!res.ok) throw new Error("No se pudo cargar la hoja de atención.");

        const d = await res.json();

        // Cuadro 1: General
        document.getElementById("lbl-medico").textContent = d.medico || "-";
        document.getElementById("lbl-colegiatura").textContent = d.colegiatura || "-";
        document.getElementById("lbl-rne").textContent = d.rne || "";
        document.getElementById("lbl-dni").textContent = d.dni || "";
        document.getElementById("lbl-paciente").textContent = d.paciente || "";
        document.getElementById("lbl-edad").textContent = d.edad || "0";
        document.getElementById("lbl-seguro").textContent = d.seguro || "PARTICULAR";
        document.getElementById("lbl-consultorio").textContent = d.consultorio || "";
        document.getElementById("lbl-fechaconsulta").textContent = d.fecha_consulta || "";
        document.getElementById("lbl-horaatencion").textContent = d.hora_atencion || "";
        document.getElementById("lbl-cuenta").textContent = d.nro_cuenta || "";
        document.getElementById("lbl-fechaproxima").textContent = d.fecha_proxima || "";

        // Cuadro 2: Funciones Vitales
        document.getElementById("lbl-pa").textContent = d.presion_arterial || "-";
        document.getElementById("lbl-temp").textContent = d.temperatura || "-";
        document.getElementById("lbl-fc").textContent = d.frecuencia_cardiaca || "-";
        document.getElementById("lbl-talla").textContent = d.talla || "-";
        document.getElementById("lbl-peso").textContent = d.peso || "-";
        document.getElementById("lbl-fr").textContent = d.frecuencia_respiratoria || "-";
        document.getElementById("lbl-imc").textContent = d.imc || "-";

        // Cuadro 3: Antecedentes
        document.getElementById("lbl-quirurgico").textContent = d.quirurgico || "NO REFIERE";
        document.getElementById("lbl-patologico").textContent = d.patologico || "NO REFIERE";
        document.getElementById("lbl-alergias").textContent = d.alergias || "NO REFIERE";
        document.getElementById("lbl-obstetricos").textContent = d.obstetricos || "NO REFIERE";
        document.getElementById("lbl-otros").textContent = d.otros || "NO REFIERE";
        document.getElementById("lbl-familiares").textContent = d.ant_familiares || "NO REFIERE";

        // Cuadro 4: Clínico
        document.getElementById("lbl-motivo").textContent = d.motivo_consulta || "";
        document.getElementById("lbl-examen").textContent = d.examen_clinico || "";
        document.getElementById("lbl-cie10").textContent = d.diagnosticos && d.diagnosticos.length > 0 ? d.diagnosticos.join(", ") : "";

        // Tratamiento (Farmacia)
        if (d.nro_receta_far) {
            document.getElementById("lbl-sub-receta-far").textContent = `(Farmacia:) (N° Receta: ${d.nro_receta_far})`;
        }
        document.getElementById("lbl-items-tratamiento").innerHTML = d.tratamiento && d.tratamiento.length > 0 
            ? d.tratamiento.map(t => `<div>${t}</div>`).join("") 
            : "";

        // Órdenes Médicas (Rayos X)
        if (d.nro_receta_rx) {
            document.getElementById("lbl-sub-receta-rx").textContent = `(Rayos X) (N° Receta: ${d.nro_receta_rx})`;
        }
        document.getElementById("lbl-items-ordenes").innerHTML = d.ordenes_medicas && d.ordenes_medicas.length > 0 
            ? d.ordenes_medicas.map(o => `<div>${o}</div>`).join("") 
            : "";

        // Procedimientos
        document.getElementById("lbl-procedimientos").textContent = d.procedimientos && d.procedimientos.length > 0 
            ? d.procedimientos.join(", ") 
            : "";

        document.getElementById("lbl-observaciones").textContent = d.observaciones || "";

        // Diálogo de impresión automático al cargar
        setTimeout(() => { window.print(); }, 600);

    } catch (err) {
        console.error(err);
        alert("Error cargando los datos de la hoja de atención médica.");
    }
});