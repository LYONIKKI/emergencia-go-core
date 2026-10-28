package controllers

import (
	"database/sql"
	"emergencia_go/config"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type CitaOdontologiaResponse struct {
	FechaSolicitud     string `json:"fecha_solicitud"`
	FechaCita          string `json:"fecha_cita"`
	HoraCita           string `json:"hora_cita"`
	DNI                string `json:"dni"`
	NroHistoriaClinica string `json:"nro_historia_clinica"`
	Paciente           string `json:"paciente"`
	NroCuenta          int    `json:"nro_cuenta"`
	Servicio           string `json:"servicio"`
	Seguro             string `json:"seguro"`
	Medico             string `json:"medico"`
}

// GET /api/odontologia/citas-hoy
func GetCitasOdontologiaHoy(c *fiber.Ctx) error {
	db := config.DBSQLServer

	query := `SELECT 
	            ISNULL(CONVERT(VARCHAR(10), c.FechaSolicitud, 103), '') AS FechaSolicitud,
	            ISNULL(CONVERT(VARCHAR(10), c.Fecha, 103), '') AS FechaCita,
	            ISNULL(c.HoraInicio, '') AS HoraCita,
	            ISNULL(p.NroDocumento, '') AS DNI,
	            ISNULL(p.NroHistoriaClinica, '') AS NroHistoriaClinica,
	            UPPER(ISNULL(p.ApellidoPaterno,'') + ' ' + ISNULL(p.ApellidoMaterno,'') + ' ' + ISNULL(p.PrimerNombre,'') + ISNULL(' ' + p.SegundoNombre, '')) AS Paciente,
	            ISNULL(a.IdCuentaAtencion, 0) AS NroCuenta,
	            ISNULL(s.Nombre, '') AS Servicio,
	            ISNULL(f.Descripcion, 'PARTICULAR') AS Seguro, 
	            UPPER(ISNULL(e.ApellidoPaterno,'') + ' ' + ISNULL(e.ApellidoMaterno,'') + ' ' + ISNULL(e.Nombres, 'MEDICO DE TURNO')) AS Medico
	        FROM [dbo].[Citas] c WITH (NOLOCK)
	        INNER JOIN [dbo].[Pacientes] p WITH (NOLOCK) ON c.IdPaciente = p.IdPaciente
	        LEFT JOIN [dbo].[Atenciones] a WITH (NOLOCK) ON c.IdAtencion = a.IdAtencion 
	        INNER JOIN [dbo].[Servicios] s WITH (NOLOCK) ON c.IdServicio = s.IdServicio
	        INNER JOIN [dbo].[Medicos] m WITH (NOLOCK) ON c.IdMedico = m.IdMedico
	        INNER JOIN [dbo].[Empleados] e WITH (NOLOCK) ON m.IdEmpleado = e.IdEmpleado
	        LEFT JOIN [dbo].[FuentesFinanciamiento] f WITH (NOLOCK) ON a.idFuenteFinanciamiento = f.idFuenteFinanciamiento
	        WHERE c.IdServicio IN (165, 384, 392, 394)
	          AND CAST(c.Fecha AS DATE) = CAST(GETDATE() AS DATE)
	        ORDER BY c.HoraInicio ASC, c.IdAtencion ASC`

	rows, err := db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	citas := make([]CitaOdontologiaResponse, 0, 40)
	for rows.Next() {
		var item CitaOdontologiaResponse
		if err := rows.Scan(
			&item.FechaSolicitud,
			&item.FechaCita,
			&item.HoraCita,
			&item.DNI,
			&item.NroHistoriaClinica,
			&item.Paciente,
			&item.NroCuenta,
			&item.Servicio,
			&item.Seguro,
			&item.Medico,
		); err == nil {
			citas = append(citas, item)
		}
	}

	return c.JSON(citas)
}

type HojaAtencionResponse struct {
	// Cuadro 1: General
	Medico        string `json:"medico"`
	Colegiatura   string `json:"colegiatura"`
	RNE           string `json:"rne"`
	DNI           string `json:"dni"`
	HC            string `json:"hc"`
	Paciente      string `json:"paciente"`
	Edad          int    `json:"edad"`
	Seguro        string `json:"seguro"`
	Consultorio   string `json:"consultorio"`
	FechaConsulta string `json:"fecha_consulta"`
	HoraAtencion  string `json:"hora_atencion"`
	NroCuenta     int    `json:"nro_cuenta"`
	FechaProxima  string `json:"fecha_proxima"`

	// Cuadro 2: Funciones Vitales
	PresionArterial        string `json:"presion_arterial"`
	Temperatura            string `json:"temperatura"`
	FrecuenciaCardiaca     string `json:"frecuencia_cardiaca"`
	Talla                  string `json:"talla"`
	Peso                   string `json:"peso"`
	FrecuenciaRespiratoria string `json:"frecuencia_respiratoria"`
	IMC                    string `json:"imc"`

	// Cuadro 3: Antecedentes
	Quirurgico    string `json:"quirurgico"`
	Patologico    string `json:"patologico"`
	Alergias      string `json:"alergias"`
	Obstetricos   string `json:"obstetricos"`
	Otros         string `json:"otros"`
	AntFamiliares string `json:"ant_familiares"`

	// Cuadro 4: Evolución y Órdenes
	MotivoConsulta string   `json:"motivo_consulta"`
	ExamenClinico  string   `json:"examen_clinico"`
	Diagnosticos   []string `json:"diagnosticos"`
	Tratamiento    []string `json:"tratamiento"`
	NroRecetaFar   string   `json:"nro_receta_far"`
	OrdenesMedicas []string `json:"ordenes_medicas"`
	NroRecetaRx    string   `json:"nro_receta_rx"`
	Procedimientos []string `json:"procedimientos"`
	Observaciones  string   `json:"observaciones"`
}

// GET /api/odontologia/hoja-atencion/:cuenta
// GET /api/odontologia/hoja-atencion/:cuenta
func GetHojaAtencionOdontologia(c *fiber.Ctx) error {
	db := config.DBSQLServer
	cuenta := c.Params("cuenta")

	var hoja HojaAtencionResponse
	var idAtencion int

	// 1. Datos Generales (SIGH)
	qGen := `SELECT 
	            UPPER(ISNULL(e.ApellidoPaterno,'') + ' ' + ISNULL(e.ApellidoMaterno,'') + ' ' + ISNULL(e.Nombres,'')) AS Medico,
	            ISNULL(m.Colegiatura, '') AS Colegiatura,
	            ISNULL(m.rne, '') AS RNE,
	            ISNULL(p.NroDocumento, '') AS DNI,
	            CAST(ISNULL(p.NroHistoriaClinica, 0) AS VARCHAR(20)) AS HC,
	            UPPER(ISNULL(p.ApellidoPaterno,'') + ' ' + ISNULL(p.ApellidoMaterno,'') + ' ' + ISNULL(p.PrimerNombre,'') + ISNULL(' ' + p.SegundoNombre,'')) AS Paciente,
	            DATEDIFF(YEAR, p.FechaNacimiento, GETDATE()) - 
	                (CASE WHEN DATEADD(YY, DATEDIFF(YEAR, p.FechaNacimiento, GETDATE()), p.FechaNacimiento) > GETDATE() THEN 1 ELSE 0 END) AS Edad,
	            ISNULL(f.Descripcion, 'PARTICULAR') AS Seguro,
	            ISNULL(s.Nombre, '') AS Consultorio,
	            CONVERT(VARCHAR(10), a.FechaIngreso, 103) AS FechaConsulta,
	            ISNULL(a.HoraIngreso, '') AS HoraAtencion,
	            a.IdCuentaAtencion AS NroCuenta,
	            a.IdAtencion,
	            ISNULL(CONVERT(VARCHAR(10), ada.ProximaCita, 103), '') AS FechaProxima
	        FROM [dbo].[Atenciones] a WITH (NOLOCK)
	        INNER JOIN [dbo].[Pacientes] p WITH (NOLOCK) ON a.IdPaciente = p.IdPaciente
	        INNER JOIN [dbo].[Servicios] s WITH (NOLOCK) ON a.IdServicioIngreso = s.IdServicio
	        INNER JOIN [dbo].[Medicos] m WITH (NOLOCK) ON a.IdMedicoIngreso = m.IdMedico
	        INNER JOIN [dbo].[Empleados] e WITH (NOLOCK) ON m.IdEmpleado = e.IdEmpleado
	        LEFT JOIN [dbo].[FuentesFinanciamiento] f WITH (NOLOCK) ON a.idFuenteFinanciamiento = f.idFuenteFinanciamiento
	        LEFT JOIN [dbo].[AtencionesDatosAdicionales] ada WITH (NOLOCK) ON a.IdAtencion = ada.idAtencion
	        WHERE a.IdCuentaAtencion = @p1`

	err := db.QueryRow(qGen, cuenta).Scan(
		&hoja.Medico, &hoja.Colegiatura, &hoja.RNE, &hoja.DNI, &hoja.HC,
		&hoja.Paciente, &hoja.Edad, &hoja.Seguro, &hoja.Consultorio,
		&hoja.FechaConsulta, &hoja.HoraAtencion, &hoja.NroCuenta, &idAtencion, &hoja.FechaProxima,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return c.Status(404).JSON(fiber.Map{"error": "Atención médica no encontrada para esta cuenta"})
		}
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	// 2. Funciones Vitales e Historia Clínica (SIGH_EXTERNA)
	qExt := `SELECT 
	            ISNULL(TriajePresion, '') AS PresionArterial,
	            ISNULL(TriajeTemperatura, '') AS Temperatura,
	            ISNULL(CAST(TriajePulso AS VARCHAR(10)), '') AS FrecuenciaCardiaca,
	            ISNULL(TriajeTalla, '') AS Talla,
	            ISNULL(TriajePeso, '') AS Peso,
	            ISNULL(CAST(TriajeFrecRespiratoria AS VARCHAR(10)), '') AS FrecuenciaRespiratoria,
	            CASE 
	                WHEN TRY_CAST(TriajePeso AS FLOAT) > 0 AND TRY_CAST(TriajeTalla AS FLOAT) > 0 THEN
	                    CASE 
	                        WHEN TRY_CAST(TriajeTalla AS FLOAT) < 3.0 THEN
	                            CAST(ROUND(TRY_CAST(TriajePeso AS FLOAT) / POWER(TRY_CAST(TriajeTalla AS FLOAT), 2), 2) AS VARCHAR(10))
	                        ELSE 
	                            CAST(ROUND(TRY_CAST(TriajePeso AS FLOAT) / POWER(TRY_CAST(TriajeTalla AS FLOAT) / 100.0, 2), 2) AS VARCHAR(10))
	                    END
	                ELSE ''
	            END AS IMC,
	            ISNULL(CitaMotivo, '') AS MotivoConsulta,
	            ISNULL(CitaExamenClinico, '') AS ExamenClinico,
	            ISNULL(CitaObservaciones, '') AS Observaciones
	        FROM [SIGH_EXTERNA].[dbo].[atencionesCE] WITH (NOLOCK)
	        WHERE idAtencion = @p1`

	_ = db.QueryRow(qExt, idAtencion).Scan(
		&hoja.PresionArterial, &hoja.Temperatura, &hoja.FrecuenciaCardiaca,
		&hoja.Talla, &hoja.Peso, &hoja.FrecuenciaRespiratoria, &hoja.IMC,
		&hoja.MotivoConsulta, &hoja.ExamenClinico, &hoja.Observaciones,
	)

	// 3. Antecedentes (SIGH)
	qAnt := `SELECT 
	            ISNULL(NULLIF(LTRIM(RTRIM(pda.antecedQuirurgico)), ''), 'NO REFIERE') AS Quirurgico,
	            ISNULL(NULLIF(LTRIM(RTRIM(pda.antecedPatologico)), ''), 'NO REFIERE') AS Patologico,
	            ISNULL(NULLIF(LTRIM(RTRIM(pda.antecedAlergico)), ''), 'NO REFIERE') AS Alergias,
	            ISNULL(NULLIF(LTRIM(RTRIM(pda.antecedObstetrico)), ''), 'NO REFIERE') AS Obstetricos,
	            ISNULL(NULLIF(LTRIM(RTRIM(pda.antecedentes)), ''), 'NO REFIERE') AS Otros,
	            ISNULL(NULLIF(LTRIM(RTRIM(pda.antecedFamiliar)), ''), 'NO REFIERE') AS AntFamiliares
	        FROM [dbo].[Atenciones] a WITH (NOLOCK)
	        INNER JOIN [dbo].[PacientesDatosAdicionales] pda WITH (NOLOCK) ON a.IdPaciente = pda.idPaciente
	        WHERE a.IdCuentaAtencion = @p1`

	_ = db.QueryRow(qAnt, cuenta).Scan(
		&hoja.Quirurgico, &hoja.Patologico, &hoja.Alergias,
		&hoja.Obstetricos, &hoja.Otros, &hoja.AntFamiliares,
	)

	// Valores por defecto seguros para evitar vacíos
	if hoja.Quirurgico == "" {
		hoja.Quirurgico = "NO REFIERE"
	}
	if hoja.Patologico == "" {
		hoja.Patologico = "NO REFIERE"
	}
	if hoja.Alergias == "" {
		hoja.Alergias = "NO REFIERE"
	}
	if hoja.Obstetricos == "" {
		hoja.Obstetricos = "NO REFIERE"
	}
	if hoja.Otros == "" {
		hoja.Otros = "NO REFIERE"
	}
	if hoja.AntFamiliares == "" {
		hoja.AntFamiliares = "NO REFIERE"
	}

	// 4. Diagnósticos CIE-10 (SIGH)
	hoja.Diagnosticos = make([]string, 0)
	qDx := `SELECT '(' + RTRIM(d.CodigoCIE10) + '-' + 
	               CASE ad.IdClasificacionDx WHEN 1 THEN 'P' WHEN 2 THEN 'D' WHEN 3 THEN 'R' ELSE '-' END + 
	               ' -' + RTRIM(d.Descripcion) + ')' AS DiagnosticoFormateado
	        FROM [dbo].[AtencionesDiagnosticos] ad WITH (NOLOCK)
	        INNER JOIN [dbo].[Atenciones] a WITH (NOLOCK) ON ad.IdAtencion = a.IdAtencion
	        INNER JOIN [dbo].[Diagnosticos] d WITH (NOLOCK) ON ad.IdDiagnostico = d.IdDiagnostico
	        WHERE a.IdCuentaAtencion = @p1`

	if rowsDx, err := db.Query(qDx, cuenta); err == nil {
		for rowsDx.Next() {
			var dx string
			if err := rowsDx.Scan(&dx); err == nil {
				hoja.Diagnosticos = append(hoja.Diagnosticos, dx)
			}
		}
		rowsDx.Close()
	}

	// 5. Tratamientos y Órdenes Médicas (SIGH)
	hoja.Tratamiento = make([]string, 0)
	hoja.OrdenesMedicas = make([]string, 0)
	qRec := `SELECT 
	            rc.idReceta,
	            rc.IdPuntoCarga,
	            RIGHT('0000' + CAST(rd.CantidadPedida AS VARCHAR(4)), 4) + ' ' +
	            CASE 
	                WHEN rc.IdPuntoCarga = 5 THEN RTRIM(ISNULL(bi.Codigo, '')) + '//' + RTRIM(ISNULL(bi.Nombre, '')) + ' ' + RTRIM(ISNULL(bi.Presentacion, 'UNI'))
	                ELSE RTRIM(ISNULL(cs.Codigo, '')) + '//' + RTRIM(ISNULL(cs.Nombre, ''))
	            END AS LineaImpresion
	        FROM [dbo].[RecetaCabecera] rc WITH (NOLOCK)
	        INNER JOIN [dbo].[RecetaDetalle] rd WITH (NOLOCK) ON rc.idReceta = rd.idReceta
	        LEFT JOIN [dbo].[FactCatalogoBienesInsumos] bi WITH (NOLOCK) ON rd.idItem = bi.IdProducto AND rc.IdPuntoCarga = 5
	        LEFT JOIN [dbo].[FactCatalogoServicios] cs WITH (NOLOCK) ON rd.idItem = cs.IdProducto AND rc.IdPuntoCarga <> 5
	        WHERE rc.idCuentaAtencion = @p1
	        ORDER BY rc.IdPuntoCarga ASC, rd.idItem ASC`

	if rowsRec, err := db.Query(qRec, cuenta); err == nil {
		for rowsRec.Next() {
			var idRec, ptoCarga int
			var linea string
			if err := rowsRec.Scan(&idRec, &ptoCarga, &linea); err == nil {
				if ptoCarga == 5 {
					hoja.Tratamiento = append(hoja.Tratamiento, linea)
					if hoja.NroRecetaFar == "" {
						hoja.NroRecetaFar = strconv.Itoa(idRec)
					}
				} else {
					hoja.OrdenesMedicas = append(hoja.OrdenesMedicas, linea)
					if hoja.NroRecetaRx == "" {
						hoja.NroRecetaRx = strconv.Itoa(idRec)
					}
				}
			}
		}
		rowsRec.Close()
	}

	// 6. Procedimientos (SIGH)
	hoja.Procedimientos = make([]string, 0)
	qProc := `SELECT '[' + RTRIM(cs.Codigo) + ' = ' + RTRIM(cs.Nombre) + ']' AS ProcedimientoFormateado
	          FROM [dbo].[FactOrdenServicio] fos WITH (NOLOCK)
	          INNER JOIN [dbo].[FacturacionServicioDespacho] fsd WITH (NOLOCK) ON fos.IdOrden = fsd.idOrden
	          INNER JOIN [dbo].[FactCatalogoServicios] cs WITH (NOLOCK) ON fsd.IdProducto = cs.IdProducto
	          WHERE fos.IdCuentaAtencion = @p1
	            AND cs.Codigo NOT IN ('D0145')
	          ORDER BY cs.Codigo ASC`

	if rowsProc, err := db.Query(qProc, cuenta); err == nil {
		for rowsProc.Next() {
			var proc string
			if err := rowsProc.Scan(&proc); err == nil {
				hoja.Procedimientos = append(hoja.Procedimientos, proc)
			}
		}
		rowsProc.Close()
	}

	return c.JSON(hoja)
}
