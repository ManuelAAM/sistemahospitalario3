# 🏥 Sistema Hospitalario - Diagrama de Clases Completo

## Resumen del Sistema
Este es un sistema integral de gestión hospitalaria desarrollado con React/Tauri que incluye módulos para administración, enfermería, médicos y pacientes.

## Diagrama de Clases UML (PlantUML)

```plantuml
@startuml "Sistema Hospitalario - Arquitectura Completa"

!theme aws-orange
skinparam backgroundColor #F8F9FA
skinparam classBackgroundColor #FFFFFF
skinparam classBorderColor #E9ECEF

' ==================== CAPA DE PRESENTACIÓN (COMPONENTES REACT) ====================

package "Capa de Presentación - Componentes React" #E3F2FD {
    
    class Aplicacion {
        - usuarioActual: Usuario
        - vistaActual: string
        - barraLateralAbierta: boolean
        - notificaciones: Array
        --
        + manejarInicioSesion(usuario: Usuario): void
        + manejarCierreSesion(): void
        + cambiarVista(vista: string): void
        + inicializarAplicacion(): Promise<void>
        + manejarError(error: Error): void
    }
    
    ' === FORMULARIOS DE AUTENTICACIÓN ===
    class FormularioInicioSesion {
        - nombreUsuario: string
        - contrasena: string
        - cargando: boolean
        - error: string
        --
        + manejarEnvio(): Promise<void>
        + validarCredenciales(): boolean
        + manejarRecuperacionContrasena(): void
    }
    
    class FormularioRegistro {
        - datosFormulario: Object
        - validacion: Object
        --
        + manejarEnvio(): Promise<void>
        + validarFormulario(): boolean
        + verificarFortalezaContrasena(): boolean
    }
    
    class FormularioRecuperacionContrasena {
        - numeroCedula: string
        - token: string
        - nuevaContrasena: string
        --
        + solicitarRecuperacion(): Promise<void>
        + restablecerContrasena(): Promise<void>
    }
    
    ' === PANELES PRINCIPALES ===
    class PanelAdministrador {
        - estadisticas: Object
        - usuarios: Array
        - erroresSistema: Array
        --
        + cargarEstadisticasSistema(): Promise<void>
        + gestionarUsuarios(): void
        + verRegistrosAuditoria(): void
        + manejarErroresSistema(): void
    }
    
    class PanelDoctor {
        - pacientes: Array
        - citas: Array
        - resultadosLaboratorio: Array
        --
        + cargarPacientes(): Promise<void>
        + crearReceta(): Promise<void>
        + revisarResultadosLaboratorio(): void
        + agendarCita(): void
    }
    
    class PanelEnfermero {
        - pacientesAsignados: Array
        - signosVitales: Array
        - medicamentos: Array
        - notasEnfermeria: Array
        --
        + cargarPacientesAsignados(): Promise<void>
        + registrarSignosVitales(): Promise<void>
        + administrarMedicamento(): Promise<void>
        + crearNotaEnfermeria(): Promise<void>
    }
    
    ' === COMPONENTES DE GESTIÓN DE PACIENTES ===
    class FormularioRegistroPaciente {
        - datosPaciente: Object
        - validacion: Object
        --
        + manejarEnvio(): Promise<void>
        + validarDatosPaciente(): boolean
        + verificarConflictosAlergias(): Promise<void>
    }
    
    class ModalDetallesPaciente {
        - paciente: Paciente
        - historialMedico: Array
        - tratamientosActuales: Array
        --
        + cargarDetallesPaciente(): Promise<void>
        + actualizarInfoPaciente(): Promise<void>
        + verHistorialMedico(): void
    }
    
    class PacientesAsignadosEnfermero {
        - pacientes: Array
        - cargando: boolean
        - pacienteSeleccionado: Paciente
        --
        + cargarPacientes(): Promise<void>
        + filtrarPorTurno(): Array
        + seleccionarPaciente(paciente: Paciente): void
    }
    
    ' === COMPONENTES DE FORMULARIOS MÉDICOS ===
    class FormularioSignosVitales {
        - temperatura: number
        - presionArterial: string
        - frecuenciaCardiaca: number
        - frecuenciaRespiratoria: number
        - saturacionOxigeno: number
        --
        + manejarEnvio(): Promise<void>
        + validarSignosVitales(): boolean
        + calcularNivelRiesgo(): string
    }
    
    class FormularioMedicamento {
        - medicamento: Object
        - dosis: string
        - frecuencia: string
        - duracion: string
        --
        + manejarEnvio(): Promise<void>
        + verificarStockMedicamento(): Promise<boolean>
        + validarDosis(): boolean
        + verificarConflictosAlergias(): Promise<boolean>
    }
    
    class FormularioNota {
        - contenido: string
        - categoria: string
        - prioridad: string
        --
        + manejarEnvio(): Promise<void>
        + validarContenido(): boolean
        + guardarComoBorrador(): void
    }
    
    ' === COMPONENTES ESPECIALIZADOS ===
    class GestorStockMedicamentos {
        - inventario: Array
        - historialDispensacion: Array
        --
        + cargarInventario(): Promise<void>
        + dispensarMedicamento(): Promise<void>
        + actualizarStock(): Promise<void>
        + generarReporteStock(): Object
    }
    
    class SalaEmergencias {
        - pacientesEmergencia: Array
        - colaTriage: Array
        --
        + cargarPacientesEmergencia(): Promise<void>
        + realizarTriage(): void
        + asignarUrgencia(): void
    }
    
    class GestionCamas {
        - camas: Array
        - disponibilidad: Object
        --
        + cargarEstadoCamas(): Promise<void>
        + asignarCama(): Promise<void>
        + darAltaCama(): Promise<void>
    }
    
    class ReportesAnaliticas {
        - datosReporte: Object
        - graficas: Array
        --
        + generarReporte(): Promise<Object>
        + exportarAPDF(): void
        + crearGraficas(): void
    }
}

' ==================== CAPA DE LÓGICA DE NEGOCIO (HOOKS REACT) ====================

package "Capa de Lógica de Negocio - Hooks React" #F3E5F5 {
    
    class usarPacientes {
        - pacientes: Array
        - cargando: boolean
        - error: string
        --
        + cargarPacientes(opciones: Object): Promise<void>
        + agregarPaciente(paciente: Paciente): Promise<void>
        + actualizarPaciente(id: number, datos: Object): Promise<void>
        + eliminarPaciente(id: number): Promise<void>
        + filtrarPacientes(criterios: Object): Array
    }
    
    class usarCitas {
        - citas: Array
        - cargando: boolean
        --
        + cargarCitas(): Promise<void>
        + agendarCita(datos: Object): Promise<void>
        + cancelarCita(id: number): Promise<void>
        + actualizarCita(id: number, datos: Object): Promise<void>
    }
    
    class usarTratamientos {
        - tratamientos: Array
        - cargando: boolean
        --
        + cargarTratamientos(): Promise<void>
        + agregarTratamiento(tratamiento: Tratamiento): Promise<void>
        + actualizarTratamiento(id: number, datos: Object): Promise<void>
        + completarTratamiento(id: number): Promise<void>
    }
    
    class usarSignosVitales {
        - signosVitales: Array
        - cargando: boolean
        --
        + cargarSignosVitales(): Promise<void>
        + registrarSignosVitales(datos: Object): Promise<void>
        + obtenerVitalesRecientes(idPaciente: number): Object
        + calcularTendencias(): Object
    }
    
    class usarNotasEnfermeria {
        - notas: Array
        - cargando: boolean
        --
        + cargarNotas(): Promise<void>
        + crearNota(nota: Object): Promise<void>
        + editarNota(id: number, contenido: string, razon: string): Promise<void>
        + eliminarNota(id: number): Promise<void>
        + obtenerHistorialEdiciones(idNota: number): Array
    }
    
    class usarBaseDatosAvanzada {
        - recetas: Array
        - administracionMedicamentos: Array
        --
        + agregarReceta(datos: Object): Promise<void>
        + registrarAdminMedicamento(datos: Object): Promise<void>
        + generarReporteMedicamentos(): Object
    }
}

' ==================== CAPA DE SERVICIOS ====================

package "Capa de Servicios" #E8F5E8 {
    
    class ServicioBaseDatos {
        - bd: SQLite
        --
        ' Inicialización
        + inicializarBaseDatos(): Promise<BaseDatos>
        + crearTablas(): Promise<void>
        + poblarDatosIniciales(): Promise<void>
        
        ' Operaciones CRUD Pacientes
        + obtenerTodosPacientes(): Promise<Array>
        + obtenerPacientePorId(id: number): Promise<Paciente>
        + crearPaciente(datos: Object): Promise<void>
        + actualizarPaciente(id: number, datos: Object): Promise<void>
        + eliminarPaciente(id: number): Promise<void>
        
        ' Operaciones CRUD Usuarios
        + obtenerUsuarioPorCedula(cedula: string): Promise<Usuario>
        + crearUsuario(datos: Object): Promise<void>
        + actualizarContrasenaUsuario(id: number, contrasena: string): Promise<void>
        
        ' Signos Vitales
        + obtenerSignosVitales(): Promise<Array>
        + agregarSignosVitales(datos: Object): Promise<void>
        + obtenerSignosVitalesPorPaciente(idPaciente: number): Promise<Array>
        
        ' Notas de Enfermería
        + obtenerNotasEnfermeria(): Promise<Array>
        + crearNotaEnfermeria(datos: Object): Promise<void>
        + editarNotaEnfermeria(idNota: number, contenido: string, editadoPor: string, razon: string): Promise<void>
        + obtenerHistorialEdicionNota(idNota: number): Promise<Array>
        
        ' Inventario de Medicamentos
        + obtenerInventarioMedicamentos(): Promise<Array>
        + actualizarStockMedicamento(id: number, cantidad: number): Promise<void>
        + dispensarMedicamento(datos: Object): Promise<void>
        
        ' Asignaciones de Enfermería
        + obtenerPacientesAsignadosEnfermero(idEnfermero: number): Promise<Array>
        + crearAsignacionPaciente(datos: Object): Promise<void>
        
        ' Auditoría y Seguridad
        + crearRegistroAuditoria(accion: string, idUsuario: number, detalles: Object): Promise<void>
        + registrarIntentoInicioSesion(cedula: string, exitoso: boolean, direccionIP: string): Promise<void>
        + bloquearCuenta(cedula: string, razon: string): Promise<void>
        + estaCuentaBloqueada(cedula: string): Promise<boolean>
        
        ' Gestión de Errores
        + reportarErrorSistema(error: Object): Promise<void>
        + obtenerErroresSistema(): Promise<Array>
        
        ' Recuperación de Contraseña
        + crearTokenRestablecimientoContrasena(cedula: string, direccionIP: string): Promise<Object>
        + validarTokenRestablecimientoContrasena(token: string): Promise<Object>
        + restablecerContrasenaConToken(token: string, nuevaContrasena: string): Promise<void>
    }
    
    class ServicioAutenticacion {
        --
        + iniciarSesion(cedula: string, contrasena: string): Promise<Usuario>
        + cerrarSesion(): void
        + hashearContrasena(contrasena: string): string
        + validarFortalezaContrasena(contrasena: string): Object
        + solicitarRecuperacionContrasena(numeroCedula: string, direccionIP: string): Promise<Object>
        + restablecerContrasena(token: string, nuevaContrasena: string): Promise<void>
    }
}

' ==================== MODELOS DE DOMINIO ====================

package "Modelos de Dominio" #FFF9C4 {
    
    class Usuario {
        + id: number
        + nombreUsuario: string
        + nombre: string
        + rol: string
        + cedula: string
        + email: string
        + hashContrasena: string
        + numeroCedula: string
        + especialidad: string
        + turnosAsignados: string
        + estaActivo: boolean
        + ultimoInicioSesion: string
        + intentosFallidos: number
        + cuentaBloqueada: boolean
        + creadoEn: string
    }
    
    class Paciente {
        + id: number
        + nombre: string
        + edad: number
        + curp: string
        + genero: string
        + contacto: string
        + direccion: string
        + habitacion: string
        + condicion: string
        + nivelTriage: string
        + fechaIngreso: string
        + fechaAlta: string
        + tipoSangre: string
        + alergias: string
        + diagnostico: string
        + doctorPrincipal: string
        + idEnfermeroAsignado: number
        + estado: string
        + piso: string
        + area: string
        + cama: string
    }
    
    class Cita {
        + id: number
        + idPaciente: number
        + fecha: string
        + hora: string
        + doctor: string
        + motivo: string
        + estado: string
        + notas: string
        + creadoEn: string
    }
    
    class Tratamiento {
        + id: number
        + idPaciente: number
        + medicamento: string
        + dosis: string
        + frecuencia: string
        + fechaInicio: string
        + fechaFin: string
        + prescritoPor: string
        + estado: string
        + notas: string
    }
    
    class SignosVitales {
        + id: number
        + idPaciente: number
        + fecha: string
        + temperatura: number
        + presionArterial: string
        + frecuenciaCardiaca: number
        + frecuenciaRespiratoria: number
        + saturacionOxigeno: number
        + peso: number
        + altura: number
        + nivelDolor: number
        + registradoPor: string
        + notas: string
    }
    
    class NotaEnfermeria {
        + id: number
        + idPaciente: number
        + idEnfermero: number
        + nombreEnfermero: string
        + turno: string
        + contenido: string
        + categoria: string
        + prioridad: string
        + creadoEn: string
        + actualizadoEn: string
        + estaEditado: boolean
        + conteoEdiciones: number
    }
    
    class InventarioMedicamentos {
        + id: number
        + nombre: string
        + ingredienteActivo: string
        + presentacion: string
        + concentracion: string
        + categoria: string
        + esControlado: boolean
        + cantidad: number
        + unidad: string
        + stockMinimo: number
        + stockMaximo: number
        + precioUnitario: number
        + proveedor: string
        + numeroLote: string
        + fechaCaducidad: string
        + ubicacion: string
        + estado: string
    }
    
    class AsignacionPaciente {
        + id: number
        + idEnfermero: number
        + idPaciente: number
        + fechaAsignacion: string
        + tipoTurno: string
        + estado: string
        + notas: string
    }
    
    class RegistroAuditoria {
        + id: number
        + idUsuario: number
        + accion: string
        + nombreTabla: string
        + idRegistro: number
        + valoresAntiguos: string
        + valoresNuevos: string
        + direccionIP: string
        + agenteUsuario: string
        + marcaTiempo: string
    }
    
    class HistorialEdicion {
        + id: number
        + idNota: number
        + editadoPor: string
        + rolEditadoPor: string
        + razonEdicion: string
        + contenidoAntiguo: string
        + contenidoNuevo: string
        + marcaTiempoEdicion: string
        + tiempoDesdeCreacion: number
    }
}

' ==================== UTILIDADES Y VALIDACIONES ====================

package "Utilidades y Validaciones" #FFF3E0 {
    
    class ValidacionEdicionNotas {
        --
        + puedeEditarNota(idNota: number, idUsuario: number): Promise<boolean>
        + estaDentro24Horas(creadoEn: string): boolean
        + validarRazonEdicion(razon: string): boolean
        + registrarEdicion(idNota: number, editadoPor: string, razon: string): Promise<void>
    }
    
    class ValidacionSignosVitales {
        --
        + validarTemperatura(temp: number): boolean
        + validarPresionArterial(pa: string): boolean
        + validarFrecuenciaCardiaca(fc: number): boolean
        + calcularNivelRiesgo(vitales: Object): string
        + verificarValoresCriticos(vitales: Object): Array
    }
    
    class ValidacionAlergias {
        --
        + verificarAlergiasMedicamentos(idPaciente: number, medicamento: string): Promise<boolean>
        + validarListaAlergias(alergias: string): boolean
        + obtenerInteraccionesMedicamentos(medicamentos: Array): Array
    }
    
    class ValidacionTriage {
        --
        + calcularNivelTriage(sintomas: Object, vitales: Object): string
        + validarAsignacionTriage(nivel: string): boolean
        + obtenerColorTriage(nivel: string): string
    }
    
    class ValidacionStock {
        --
        + verificarStockMedicamento(idMedicamento: number, cantidadSolicitada: number): Promise<boolean>
        + validarDispensacion(datos: Object): boolean
        + calcularPuntoReorden(medicamento: Object): number
    }
    
    class ValidacionSeguridad {
        --
        + validarFortalezaContrasena(contrasena: string): Object
        + verificarBloqueCuenta(cedula: string): Promise<boolean>
        + validarCedula(cedula: string): boolean
        + sanitizarEntrada(entrada: string): string
    }
}

' ==================== RELACIONES ====================

' Aplicación Principal
Aplicacion --> FormularioInicioSesion : contiene
Aplicacion --> PanelAdministrador : contiene
Aplicacion --> PanelDoctor : contiene
Aplicacion --> PanelEnfermero : contiene
Aplicacion --> ServicioAutenticacion : usa

' Componentes a Hooks
PanelAdministrador --> usarPacientes : usa
PanelDoctor --> usarPacientes : usa
PanelDoctor --> usarCitas : usa
PanelEnfermero --> usarPacientes : usa
PanelEnfermero --> usarSignosVitales : usa
PanelEnfermero --> usarNotasEnfermeria : usa

FormularioRegistroPaciente --> usarPacientes : usa
FormularioSignosVitales --> usarSignosVitales : usa
FormularioMedicamento --> usarTratamientos : usa
FormularioNota --> usarNotasEnfermeria : usa

' Hooks a Servicios
usarPacientes --> ServicioBaseDatos : usa
usarCitas --> ServicioBaseDatos : usa
usarTratamientos --> ServicioBaseDatos : usa
usarSignosVitales --> ServicioBaseDatos : usa
usarNotasEnfermeria --> ServicioBaseDatos : usa
usarBaseDatosAvanzada --> ServicioBaseDatos : usa

' Servicios a Modelos
ServicioBaseDatos ..> Paciente : gestiona
ServicioBaseDatos ..> Usuario : gestiona
ServicioBaseDatos ..> Cita : gestiona
ServicioBaseDatos ..> Tratamiento : gestiona
ServicioBaseDatos ..> SignosVitales : gestiona
ServicioBaseDatos ..> NotaEnfermeria : gestiona
ServicioBaseDatos ..> InventarioMedicamentos : gestiona
ServicioBaseDatos ..> AsignacionPaciente : gestiona
ServicioBaseDatos ..> RegistroAuditoria : crea
ServicioBaseDatos ..> HistorialEdicion : rastrea

ServicioAutenticacion --> ServicioBaseDatos : usa
ServicioAutenticacion ..> Usuario : autentica

' Componentes a Validaciones
FormularioSignosVitales --> ValidacionSignosVitales : valida
FormularioMedicamento --> ValidacionAlergias : valida
FormularioNota --> ValidacionEdicionNotas : valida
SalaEmergencias --> ValidacionTriage : valida
GestorStockMedicamentos --> ValidacionStock : valida
FormularioInicioSesion --> ValidacionSeguridad : valida

' Relaciones entre Modelos
Paciente "1" -- "0..*" Cita : tiene
Paciente "1" -- "0..*" Tratamiento : recibe
Paciente "1" -- "0..*" SignosVitales : monitorizado
Paciente "1" -- "0..*" NotaEnfermeria : documentado
Paciente "0..1" -- "0..1" AsignacionPaciente : asignado
Usuario "1" -- "0..*" NotaEnfermeria : crea
Usuario "1" -- "0..*" RegistroAuditoria : genera
NotaEnfermeria "1" -- "0..*" HistorialEdicion : tiene

@enduml
```

## Arquitectura del Sistema

### 1. **Capa de Presentación (Componentes React)**
- **Aplicación**: Componente principal que maneja el estado global
- **Formularios**: Inicio de sesión, registro, recuperación de contraseña
- **Paneles**: Administrador, Doctor, Enfermero con funcionalidades específicas
- **Componentes Especializados**: Gestión de pacientes, medicamentos, emergencias

### 2. **Capa de Lógica de Negocio (Hooks React)**
- **Hooks Personalizados**: Encapsulan la lógica de estado y efectos secundarios
- **Gestión de Datos**: Hooks específicos para cada entidad del dominio
- **Reutilización**: Lógica compartida entre múltiples componentes

### 3. **Capa de Servicios**
- **ServicioBaseDatos**: Repositorio centralizado para operaciones de base de datos
- **ServicioAutenticacion**: Manejo de autenticación y autorización
- **Abstracción**: Proporciona interfaz limpia para acceso a datos

### 4. **Modelos de Dominio**
- **Entidades**: Representan las estructuras de datos del sistema hospitalario
- **Relaciones**: Definen las asociaciones entre entidades
- **Validaciones**: Reglas de negocio implementadas en las entidades

### 5. **Utilidades y Validaciones**
- **Validadores Especializados**: Para cada dominio específico (médico, farmacéutico, etc.)
- **Seguridad**: Validaciones de entrada y control de acceso
- **Reglas de Negocio**: Lógica específica del dominio hospitalario

## Patrones de Diseño Implementados

1. **Patrón Repositorio**: ServicioBaseDatos centraliza el acceso a datos
2. **Patrón Capa de Servicio**: Separación clara entre lógica de negocio y acceso a datos
3. **Patrón Hooks Personalizados**: Encapsulación de estado y lógica reutilizable
4. **Patrón de Validación**: Validadores especializados para cada dominio
5. **Arquitectura en Capas**: Separación clara de responsabilidades por capas

## Tecnologías Utilizadas

- **Frontend**: React, Lucide Icons, TailwindCSS
- **Backend**: Tauri (Rust)
- **Base de Datos**: SQLite con tauri-plugin-sql-api
- **Estado**: React Hooks (useState, useEffect, hooks personalizados)
- **Validaciones**: Utilidades personalizadas para validación médica
- **Seguridad**: Hash de contraseñas, control de acceso por roles

---

*Diagrama generado para el Sistema Hospitalario - Una aplicación completa de gestión médica con arquitectura moderna y escalable.*