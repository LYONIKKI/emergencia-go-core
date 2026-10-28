# SIGH V2 - Frontend Modular de Emergencia y Archivos

Capa de presentación desacoplada para el monitoreo de atenciones médicas en tiempo real, trazabilidad de expedientes y reporte estadístico hospitalario.

## 🔗 Repositorio Backend (API REST)
El backend que alimenta esta interfaz fue desarrollado en **Go (Fiber)** y se encuentra disponible en:  
👉 [MIDDLEWARE-EMERGENCIA-GO](https://github.com/LYONIKKI/MIDDLEWARE-EMERGENCIA-GO)

---

## 🏛️ Diagrama de Arquitectura
[ Cliente Web / Navegador ]
│
├───> (Puerto 80 / Apache)  ──> Sirve Vistas HTML, Tailwind CSS v2.2.19 y JS Modulares
│
└───> (Puerto 8080 / Fiber) ──> Endpoints JSON (SQL Server & Postgres Auth)
 ---

## ⚙️ Guía de Integración y Despliegue

### 1. Despliegue del Frontend (Apache / Nginx)
Clonar este repositorio dentro del directorio público del servidor web:
```bash
cd /var/www/html
git clone [https://github.com/LYONIKKI/FRONTEND-EMERGENCIA-HTML-JS.git](https://github.com/LYONIKKI/FRONTEND-EMERGENCIA-HTML-JS.git) emergencia_go

const API_URL = "http://IP_DEL_SERVIDOR:8080/api";
3. Ejecución del Backend
Clonar el repositorio MIDDLEWARE-EMERGENCIA-GO.

Configurar las variables en el archivo .env.

Compilar e iniciar el servicio en Ubuntu:

Bash
go build -o emergencia_api main.go
sudo systemctl start emergencia-go
📄 Licencia y Derechos de Autor
Copyright (c) 2026 Ing. Anhgelo Smith Vega Poma (CIP N° 381913). Todos los derechos reservados.

Uso restringido a exhibición de portafolio y evaluación técnica.
