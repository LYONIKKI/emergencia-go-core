/**
 * Módulo de Archivo Central: Respeto estricto de ceros iniciales, orden cronológico y dígito terminal
 */

// 1. Formateador con respeto de ceros a la izquierda (8 dígitos)
function formatearDocumento(doc) {
    if (!doc) return "00000000";
    const str = doc.toString().trim();
    // Si tiene menos de 8 dígitos y no contiene letras, rellenar con ceros a la izquierda
    if (str.length > 0 && str.length < 8 && !/[a-zA-Z]/.test(str)) {
        return str.padStart(8, '0');
    }
    return str;
}

// 2. Ordenamiento por Dígito Terminal para Archivo Físico
function ordenarPorDigitoTerminal(lista) {
    return [...lista].sort((a, b) => {
        const docA = formatearDocumento(a.dni || a.nro_historia_clinica || a.DNI || a.NroHistoriaClinica);
        const docB = formatearDocumento(b.dni || b.nro_historia_clinica || b.DNI || b.NroHistoriaClinica);
        
        const termA = docA.slice(-2);
        const termB = docB.slice(-2);

        if (termA !== termB) {
            return termA.localeCompare(termB);
        }
        return docA.localeCompare(docB);
    });
}

// 3. Ordenamiento estricto por Hora de Cita (HI ASC, HF ASC) para la tabla en pantalla
function ordenarPorHoraCita(lista) {
    return [...lista].sort((a, b) => {
        const horaA = (a.HI || a.hi || a.HoraInicio || "").toString();
        const horaB = (b.HI || b.hi || b.HoraInicio || "").toString();
        return horaA.localeCompare(horaB);
    });
}

// 4. Interceptar y ordenar la tabla web al buscar o filtrar
document.addEventListener("DOMContentLoaded", () => {
    const inputBuscar = document.getElementById("input-busqueda");
    if (inputBuscar) {
        inputBuscar.addEventListener("input", () => {
            if (window.citasData && Array.isArray(window.citasData)) {
                window.citasData = ordenarPorHoraCita(window.citasData);
            }
        });
    }
});

// 5. Ventana de Impresión de Guía Física para Archivo Central
async function imprimirPlanillaDespacho(tipoFecha = 'hoy') {
    const urlApi = `http://172.16.10.240:8080/api/archivos/despacho-impresion?fecha=${tipoFecha}`;
    
    try {
        Swal.fire({
            title: 'Generando Guía de Archivo...',
            text: 'Ordenando por dígito terminal y formateando DNI/HC...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const res = await fetch(urlApi);
        if (!res.ok) {
            throw new Error(`Error HTTP ${res.status}`);
        }

        const response = await res.json();
        if (response.status !== "success" || !response.data || !response.data.length) {
            Swal.fire('Atención', 'No hay citas registradas para este periodo.', 'info');
            return;
        }

        const datosOrdenados = ordenarPorDigitoTerminal(response.data);
        Swal.close();

        const printWindow = window.open('', '_blank');
        let tablaHtml = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Guía de Despacho y Búsqueda - Archivo Central</title>
                <style>
                    @page { size: landscape; margin: 8mm; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; padding: 10px; color: #111; }
                    .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #b71c1c; padding-bottom: 8px; margin-bottom: 10px; }
                    h2 { margin: 0; font-size: 15px; color: #b71c1c; text-transform: uppercase; }
                    p { margin: 2px 0 0 0; color: #555; font-size: 11px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    th, td { border: 1px solid #bbb; padding: 4px 6px; text-align: left; }
                    th { background-color: #f3f4f6; font-size: 10px; text-transform: uppercase; color: #374151; }
                    .center { text-align: center; }
                    .terminal { font-weight: bold; color: #b71c1c; font-size: 12px; background-color: #fef2f2; }
                    .btn-imprimir { padding: 8px 16px; background: #d93025; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
                    @media print {
                        .btn-imprimir { display: none; }
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <h2>Hospital Regional Daniel Alcides Carrión</h2>
                        <p>Planilla de Búsqueda y Custodia de Historias Clínicas (<b>${tipoFecha === 'hoy' ? 'HOY' : 'PRE-DESPACHO MAÑANA'}</b>) - Total Expedientes: <b>${datosOrdenados.length}</b></p>
                    </div>
                    <button class="btn-imprimir" onclick="window.print()">IMPRIMIR GUÍA</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th class="center" style="width: 30px;">N°</th>
                            <th class="center" style="width: 50px;">TERM.</th>
                            <th style="width: 85px;">H.C. / DNI</th>
                            <th>PACIENTE</th>
                            <th style="width: 55px;" class="center">HORA</th>
                            <th>SERVICIO DESTINO</th>
                            <th>MÉDICO RESPONSABLE</th>
                            <th style="width: 85px;" class="center">ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        datosOrdenados.forEach((item, idx) => {
            // Se prioriza el DNI y se formatea con ceros a la izquierda
            const rawDoc = item.dni || item.nro_historia_clinica || "";
            const docFormateado = formatearDocumento(rawDoc);
            const terminal = docFormateado.length >= 2 ? docFormateado.slice(-2) : "--";

            tablaHtml += `
                <tr>
                    <td class="center">${idx + 1}</td>
                    <td class="center terminal">${terminal}</td>
                    <td style="font-family: monospace; font-weight: bold;">${docFormateado}</td>
                    <td>${item.paciente}</td>
                    <td class="center font-mono">${item.hi || '--:--'}</td>
                    <td>${item.servicio}</td>
                    <td>${item.medico}</td>
                    <td class="center">[ &nbsp; ] Despachado</td>
                </tr>
            `;
        });

        tablaHtml += `</tbody></table></body></html>`;

        printWindow.document.write(tablaHtml);
        printWindow.document.close();

    } catch (e) {
        Swal.fire({
            icon: 'error',
            title: 'Fallo al Generar Guía',
            text: e.message
        });
    }
}