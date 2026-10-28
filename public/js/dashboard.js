const API_URL = "http://172.16.10.240:8080/api";
let chartInstance = null;

const meses = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

document.addEventListener("DOMContentLoaded", () => {
    const selectMes = document.getElementById("selectMes");
    const mesActual = new Date().getMonth() + 1;

    Object.entries(meses).forEach(([num, nombre]) => {
        const opt = document.createElement("option");
        opt.value = num;
        opt.textContent = nombre;
        if (num == mesActual) opt.selected = true;
        selectMes.appendChild(opt);
    });

    selectMes.addEventListener("change", () => cargarDashboard(selectMes.value));
    cargarDashboard(mesActual);
    iniciarIntegridad();
});

async function cargarDashboard(mes) {
    const nombreMes = meses[mes];
    document.querySelectorAll(".nombre-mes-label").forEach(el => el.textContent = nombreMes);

    try {
        const res = await fetch(`${API_URL}/dashboard?mes=${mes}`);
        const data = await res.json();

        document.getElementById("kpiTotalMes").textContent = Number(data.total_mes).toLocaleString();
        document.getElementById("kpiTopMesServicio").textContent = data.top_mes_servicio;
        document.getElementById("kpiTopMesTotal").textContent = `${data.top_mes_total} Atenciones`;
        document.getElementById("kpiHoyTotal").textContent = data.cantidad_hoy_total;
        document.getElementById("kpiTopHoy").textContent = `Top hoy: ${data.top_hoy_servicio}`;

        renderGrafica(data.grafica_labels, data.grafica_data);
    } catch (err) {
        console.error("Error al cargar datos del dashboard:", err);
    }
}

function renderGrafica(labels, data) {
    const ctx = document.getElementById("graficaAtenciones").getContext("2d");
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Atenciones por Día',
                data: data,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

function iniciarIntegridad() {
    setInterval(() => {
        const f = document.getElementById("l-f");
        if (!f || !f.innerHTML.includes("Anhgelo")) {
            document.body.innerHTML = `
                <div style="background:#000;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;font-family:sans-serif;">
                    <div>
                        <h1 style="color:#d93025">SISTEMA BLOQUEADO</h1>
                        <p style="font-size:1.5rem">Se ha detectado una alteración no autorizada.</p>
                        <hr style="border-color:#333">
                        <p>Contacte al <b>Ing. Anhgelo Smith Vega Poma</b> (UEI - Data Center).</p>
                    </div>
                </div>`;
        }
    }, 4000);
}