# 📊 Diagrama Completo de Base de Datos
## Sistema Hospitalario San Rafael v3.0

**Base de Datos:** SQLite  
**Ubicación:** `~/.local/share/[app-identifier]/hospital.db`  
**Normativa:** NOM-004-SSA3-2012 (Expediente Clínico)  
**Última Actualización:** 2026-01-09

---

## 📋 Índice de Contenido

1. [Tablas de Usuarios y Autenticación](#tablas-de-usuarios-y-autenticación)
2. [Tablas de Pacientes (Core)](#tablas-de-pacientes-core)
3. [Registros Clínicos](#registros-clínicos)
4. [Procedimientos de Enfermería](#procedimientos-de-enfermería)
5. [Laboratorio y Diagnósticos](#laboratorio-y-diagnósticos)
6. [Farmacia y Prescripciones](#farmacia-y-prescripciones)
7. [Departamento de Emergencia](#departamento-de-emergencia)
8. [Servicios Quirúrgicos](#servicios-quirúrgicos)
9. [Gestión de Instalaciones](#gestión-de-instalaciones)
10. [Facturación y Financiero](#facturación-y-financiero)
11. [Gestión de Personal](#gestión-de-personal)
12. [Comunicaciones y Notificaciones](#comunicaciones-y-notificaciones)
13. [Cuidado Preventivo](#cuidado-preventivo)
14. [Seguridad y Auditoría](#seguridad-y-auditoría)

---

## Tablas de Usuarios y Autenticación

### 👤 users
**Descripción:** Tabla principal de usuarios del sistema - Doctores, Enfermeros, Administradores, Pacientes

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Identificador único |
| `username` | TEXT | UNIQUE, NOT NULL | Nombre de usuario para login |
| `password_hash` | TEXT | NOT NULL | Contraseña encriptada (bcrypt) |
| `role` | TEXT | NOT NULL | Rol: 'admin', 'nurse', 'doctor', 'patient' |
| `name` | TEXT | NOT NULL | Nombre completo del usuario |
| `email` | TEXT | UNIQUE | Correo electrónico |
| `phone` | TEXT | - | Teléfono de contacto |
| `profile_photo` | TEXT | - | URL de foto de perfil |
| `bio` | TEXT | - | Descripción/biografía |
| `department` | TEXT | - | Departamento asignado |
| `specialization` | TEXT | - | Especialización médica |
| `license_number` | TEXT | - | Cédula profesional |
| `is_active` | INTEGER | DEFAULT 1 | 0=inactivo, 1=activo |
| `last_login` | TEXT | - | Último acceso (ISO 8601) |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Última modificación |

**Índices:**
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**Relaciones:**
- ← `prescriptions.doctor_id`
- ← `imaging_tests.ordered_by`, `radiologist_id`
- ← `surgeries.surgeon_id`, `anesthesiologist_id`
- ← `shifts.user_id`
- ← `vaccinations.administered_by`
- ← `audit_logs.user_id`
- ← `password_reset_tokens.user_id`
- ← `notifications.user_id`

---

## Tablas de Pacientes (Core)

### 🏥 patients
**Descripción:** Información demográfica y clínica principal de pacientes hospitalizados

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único del paciente |
| `name` | TEXT | NOT NULL | Nombre completo |
| `age` | INTEGER | NOT NULL | Edad en años |
| `gender` | TEXT | - | Género (M/F) |
| `room` | TEXT | NOT NULL | Habitación asignada (ej: "301-A") |
| `floor` | TEXT | DEFAULT '1' | Piso del hospital |
| `area` | TEXT | DEFAULT 'General' | Área de ingreso (UCI, Maternidad, etc.) |
| `bed` | TEXT | DEFAULT 'A' | Número de cama dentro de habitación |
| `condition` | TEXT | NOT NULL | Estado clínico: 'Estable', 'Crítico', 'Recuperación', 'Observación' |
| `triage_level` | TEXT | - | Nivel de triaje: 'ROJO', 'NARANJA', 'AMARILLO', 'VERDE', 'AZUL' |
| `admission_date` | TEXT | NOT NULL | Fecha de ingreso (ISO 8601) |
| `blood_type` | TEXT | NOT NULL | Tipo de sangre (O+, A-, etc.) |
| `allergies` | TEXT | - | Alergias conocidas |
| `emergency_contact_name` | TEXT | - | Nombre del contacto de emergencia |
| `emergency_contact_phone` | TEXT | - | Teléfono del contacto |
| `address` | TEXT | - | Domicilio del paciente |
| `city` | TEXT | - | Ciudad |
| `insurance_provider` | TEXT | - | Aseguradora (IMSS, Privado, etc.) |
| `insurance_number` | TEXT | - | Número de póliza |
| `primary_doctor` | TEXT | - | Doctor responsable principal |
| `discharge_date` | TEXT | - | Fecha de alta (si aplica) |
| `status` | TEXT | DEFAULT 'Active' | Estado: 'Active', 'Discharged', 'Transferred' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Última actualización |

**Índices:**
```sql
CREATE INDEX idx_patients_name ON patients(name);
CREATE INDEX idx_patients_room ON patients(room);
CREATE INDEX idx_patients_condition ON patients(condition);
CREATE INDEX idx_patients_status ON patients(status);
```

**Relaciones:**
- → `appointments.patient_id`
- → `treatments.patient_id`
- → `vital_signs.patient_id`
- → `nurse_notes.patient_id`
- → `medical_history.patient_id`
- → `non_pharmacological_treatments.patient_id`
- → `lab_tests.patient_id`
- → `imaging_tests.patient_id`
- → `prescriptions.patient_id`
- → `surgeries.patient_id`
- → `patient_transfers.patient_id`
- → `invoices.patient_id`
- → `vaccinations.patient_id`

### 📅 appointments
**Descripción:** Citas médicas y procedimientos programados

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `patient_name` | TEXT | NOT NULL | Nombre del paciente (desnormalizado) |
| `date` | TEXT | NOT NULL | Fecha de cita (YYYY-MM-DD) |
| `time` | TEXT | NOT NULL | Hora (HH:MM) |
| `type` | TEXT | NOT NULL | Tipo: 'Consulta', 'Cirugía', 'Laboratorio', etc. |
| `status` | TEXT | NOT NULL | Estado: 'Programada', 'Completada', 'Cancelada' |
| `doctor` | TEXT | - | Doctor responsable |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**Índices:**
```sql
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
```

---

## Registros Clínicos

### 💊 treatments
**Descripción:** Medicamentos y tratamientos activos del paciente (NOM-004: INMUTABLE)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `medication` | TEXT | NOT NULL | Nombre del medicamento |
| `dose` | TEXT | NOT NULL | Dosis (ej: "500 mg") |
| `frequency` | TEXT | NOT NULL | Frecuencia (ej: "Cada 8 horas") |
| `start_date` | TEXT | NOT NULL | Fecha de inicio |
| `end_date` | TEXT | - | Fecha de fin (si aplica) |
| `applied_by` | TEXT | NOT NULL | Enfermero/doctor que aplica |
| `last_application` | TEXT | NOT NULL | Última aplicación |
| `responsible_doctor` | TEXT | - | Doctor responsable |
| `administration_times` | TEXT | - | JSON: horarios de administración |
| `status` | TEXT | DEFAULT 'Activo' | 'Activo', 'Completado', 'Suspendido' |
| `notes` | TEXT | - | Notas adicionales |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**Trigger NOM-004:** `prevent_delete_treatments` - **No permite eliminación física**

**Índices:**
```sql
CREATE INDEX idx_treatments_patient_id ON treatments(patient_id);
CREATE INDEX idx_treatments_status ON treatments(status);
```

### 📊 vital_signs
**Descripción:** Signos vitales registrados (NOM-004: INMUTABLE)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `date` | TEXT | NOT NULL | Fecha del registro |
| `temperature` | TEXT | NOT NULL | Temperatura en °C |
| `blood_pressure` | TEXT | NOT NULL | Presión arterial (ej: "120/80") |
| `heart_rate` | TEXT | NOT NULL | Frecuencia cardíaca (lpm) |
| `respiratory_rate` | TEXT | NOT NULL | Frecuencia respiratoria |
| `registered_by` | TEXT | NOT NULL | Enfermero que registra |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**Trigger NOM-004:** `prevent_delete_vital_signs` - **No permite eliminación física**

**Índices:**
```sql
CREATE INDEX idx_vital_signs_patient_id ON vital_signs(patient_id);
CREATE INDEX idx_vital_signs_date ON vital_signs(date);
```

### 📝 nurse_notes
**Descripción:** Notas de enfermería evolutivas (NOM-004: INMUTABLE)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `date` | TEXT | NOT NULL | Fecha del registro |
| `note` | TEXT | NOT NULL | Contenido de la nota |
| `note_type` | TEXT | DEFAULT 'evolutiva' | 'evolutiva', 'incidente', 'observación' |
| `nurse_name` | TEXT | NOT NULL | Enfermero autor |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**Trigger NOM-004:** `prevent_delete_nurse_notes` - **No permite eliminación física**

### 📋 medical_history
**Descripción:** Antecedentes médicos y diagnósticos históricos (NOM-004: INMUTABLE)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `date` | TEXT | NOT NULL | Fecha del evento |
| `diagnosis` | TEXT | NOT NULL | Diagnóstico |
| `treatment` | TEXT | NOT NULL | Tratamiento aplicado |
| `notes` | TEXT | - | Notas del médico |
| `doctor` | TEXT | NOT NULL | Doctor responsable |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**Trigger NOM-004:** `prevent_delete_medical_history` - **No permite eliminación física**

---

## Procedimientos de Enfermería

### 💉 non_pharmacological_treatments
**Descripción:** Procedimientos no farmacológicos (Curaciones, Nebulizaciones, etc.) - NOM-004: INMUTABLE

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `treatment_type` | TEXT | NOT NULL | 'Curación', 'Nebulización', 'Fluidoterapia', etc. |
| `description` | TEXT | NOT NULL | Descripción detallada |
| `application_date` | TEXT | NOT NULL | Fecha de aplicación |
| `application_time` | TEXT | - | Hora |
| `duration` | TEXT | - | Duración del procedimiento |
| `performed_by` | TEXT | NOT NULL | Enfermero/técnico |
| `materials_used` | TEXT | - | Materiales utilizados |
| `observations` | TEXT | - | Observaciones |
| `outcome` | TEXT | - | Resultado |
| `next_application` | TEXT | - | Próxima aplicación programada |
| `status` | TEXT | DEFAULT 'Completado' | 'Completado', 'Pendiente', 'Cancelado' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**Trigger NOM-004:** `prevent_delete_non_pharma_treatments` - **No permite eliminación física**

### 📋 nursing_shift_reports
**Descripción:** Reportes de turno de enfermería (NOM-004: INMUTABLE)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `shift_date` | TEXT | NOT NULL | Fecha del turno |
| `shift_type` | TEXT | NOT NULL | 'Mañana', 'Tarde', 'Noche' |
| `nurse_id` | INTEGER | FK → users(id) | ID del enfermero |
| `nurse_name` | TEXT | NOT NULL | Nombre del enfermero |
| `start_time` | TEXT | NOT NULL | Hora de inicio |
| `end_time` | TEXT | - | Hora de fin |
| `patients_assigned` | TEXT | NOT NULL | JSON: array de IDs de pacientes |
| `general_observations` | TEXT | - | Observaciones generales |
| `incidents` | TEXT | - | Incidentes reportados |
| `pending_tasks` | TEXT | - | Tareas pendientes |
| `handover_notes` | TEXT | - | Notas de relevo |
| `supervisor_name` | TEXT | - | Supervisor del turno |
| `status` | TEXT | DEFAULT 'En Curso' | 'En Curso', 'Completado' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Última actualización |

**Trigger NOM-004:** `prevent_delete_nursing_shift_reports` - **No permite eliminación física**

---

## Laboratorio y Diagnósticos

### 🧪 lab_tests
**Descripción:** Pruebas de laboratorio solicitadas y resultados

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `test` | TEXT | NOT NULL | Nombre de la prueba |
| `date` | TEXT | NOT NULL | Fecha de solicitud |
| `status` | TEXT | NOT NULL | 'Pendiente', 'En Proceso', 'Completado' |
| `results` | TEXT | - | Resultados en formato texto/JSON |
| `ordered_by` | TEXT | NOT NULL | Doctor que solicita |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

### 🖼️ imaging_tests
**Descripción:** Pruebas de imagen (Rayos X, CT, MRI, Ultrasonido)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `test_type` | TEXT | NOT NULL | 'Rayos X', 'CT Scan', 'MRI', 'Ultrasonido' |
| `body_part` | TEXT | NOT NULL | Parte del cuerpo a examinar |
| `ordered_by` | INTEGER | FK → users(id) | Doctor que ordena |
| `ordered_date` | TEXT | NOT NULL | Fecha de orden |
| `scheduled_date` | TEXT | - | Fecha programada |
| `performed_date` | TEXT | - | Fecha de realización |
| `radiologist_id` | INTEGER | FK → users(id) | ID del radiólogo |
| `priority` | TEXT | DEFAULT 'Routine' | 'STAT', 'Urgent', 'Routine' |
| `status` | TEXT | DEFAULT 'Ordered' | 'Ordered', 'Scheduled', 'Completed' |
| `findings` | TEXT | - | Hallazgos |
| `impression` | TEXT | - | Impresión del radiólogo |
| `images_path` | TEXT | - | Ruta de imágenes |
| `report_url` | TEXT | - | URL del reporte |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

---

## Farmacia y Prescripciones

### 💊 prescriptions
**Descripción:** Prescripciones médicas emitidas

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `doctor_id` | INTEGER | FK → users(id) | Doctor prescriptor |
| `medication_name` | TEXT | NOT NULL | Nombre del medicamento |
| `dosage` | TEXT | NOT NULL | Dosis |
| `frequency` | TEXT | NOT NULL | Frecuencia |
| `duration` | TEXT | NOT NULL | Duración del tratamiento |
| `instructions` | TEXT | - | Instrucciones especiales |
| `prescribed_date` | TEXT | NOT NULL | Fecha de prescripción |
| `start_date` | TEXT | NOT NULL | Fecha de inicio |
| `end_date` | TEXT | - | Fecha de finalización |
| `status` | TEXT | DEFAULT 'Active' | 'Active', 'Expired', 'Cancelled' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

### 📦 pharmacy_inventory
**Descripción:** Inventario de medicamentos en farmacia

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `medication_name` | TEXT | NOT NULL | Nombre comercial |
| `generic_name` | TEXT | - | Nombre genérico |
| `category` | TEXT | NOT NULL | Categoría terapéutica |
| `quantity` | INTEGER | NOT NULL | Cantidad disponible |
| `unit` | TEXT | NOT NULL | Unidad: 'comprimidos', 'ml', 'frascos' |
| `reorder_level` | INTEGER | NOT NULL | Nivel mínimo para reorden |
| `unit_price` | REAL | NOT NULL | Precio unitario |
| `supplier` | TEXT | - | Proveedor |
| `batch_number` | TEXT | - | Número de lote |
| `manufacture_date` | TEXT | - | Fecha de manufactura |
| `expiry_date` | TEXT | NOT NULL | Fecha de expiración |
| `storage_location` | TEXT | - | Ubicación en farmacia |
| `status` | TEXT | DEFAULT 'Available' | 'Available', 'Discontinued' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |
| `updated_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Última actualización |

---

## Departamento de Emergencia

### 🚨 emergency_cases
**Descripción:** Casos de emergencia atendidos en servicio de urgencias

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_name` | TEXT | NOT NULL | Nombre del paciente |
| `age` | INTEGER | - | Edad |
| `gender` | TEXT | - | Género |
| `arrival_time` | TEXT | NOT NULL | Hora de llegada |
| `triage_level` | INTEGER | NOT NULL | 1-5: 1=más urgente |
| `chief_complaint` | TEXT | NOT NULL | Motivo principal de consulta |
| `vital_signs` | TEXT | - | Signos vitales iniciales (JSON) |
| `assigned_to` | TEXT | - | Personal asignado |
| `status` | TEXT | DEFAULT 'Waiting' | 'Waiting', 'In Treatment', 'Admitted', 'Discharged' |
| `emergency_contact` | TEXT | - | Contacto de emergencia |
| `ambulance_arrival` | INTEGER | DEFAULT 0 | 1=llegó en ambulancia |
| `outcome` | TEXT | - | Resultado del tratamiento |
| `discharge_time` | TEXT | - | Hora de egreso |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

---

## Servicios Quirúrgicos

### 🏥 surgeries
**Descripción:** Procedimientos quirúrgicos programados y realizados

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `procedure_name` | TEXT | NOT NULL | Nombre del procedimiento |
| `scheduled_date` | TEXT | NOT NULL | Fecha programada |
| `scheduled_time` | TEXT | NOT NULL | Hora programada |
| `duration` | INTEGER | NOT NULL | Duración estimada en minutos |
| `operating_room` | TEXT | NOT NULL | Quirófano asignado |
| `surgeon_id` | INTEGER | FK → users(id) | Cirujano responsable |
| `anesthesiologist_id` | INTEGER | FK → users(id) | Anestesiólogo |
| `nurses` | TEXT | - | JSON: array de enfermeros |
| `status` | TEXT | DEFAULT 'Scheduled' | 'Scheduled', 'In Progress', 'Completed', 'Cancelled' |
| `pre_op_notes` | TEXT | - | Notas pre-operatorias |
| `post_op_notes` | TEXT | - | Notas post-operatorias |
| `complications` | TEXT | - | Complicaciones reportadas |
| `completed_at` | TEXT | - | Fecha/hora de finalización |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

---

## Gestión de Instalaciones

### 🛏️ rooms
**Descripción:** Habitaciones y camas del hospital

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `room_number` | TEXT | UNIQUE, NOT NULL | Número/identificador (ej: "301-A") |
| `floor` | INTEGER | NOT NULL | Piso |
| `department` | TEXT | NOT NULL | Departamento (UCI, Maternidad, etc.) |
| `room_type` | TEXT | NOT NULL | 'Individual', 'Compartida', 'UCI', 'Quirófano' |
| `bed_count` | INTEGER | NOT NULL | Total de camas |
| `occupied_beds` | INTEGER | DEFAULT 0 | Camas ocupadas |
| `status` | TEXT | DEFAULT 'Available' | 'Available', 'Occupied', 'Maintenance', 'Reserved' |
| `equipment` | TEXT | - | JSON: equipos disponibles |
| `daily_rate` | REAL | - | Tarifa diaria |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

### 🔄 patient_transfers
**Descripción:** Historial de traslados entre habitaciones (NOM-004: INMUTABLE)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `from_floor` | TEXT | - | Piso de origen |
| `from_area` | TEXT | - | Área de origen |
| `from_room` | TEXT | - | Habitación de origen |
| `from_bed` | TEXT | - | Cama de origen |
| `to_floor` | TEXT | NOT NULL | Piso destino |
| `to_area` | TEXT | NOT NULL | Área destino |
| `to_room` | TEXT | NOT NULL | Habitación destino |
| `to_bed` | TEXT | NOT NULL | Cama destino |
| `transfer_date` | TEXT | NOT NULL | Fecha del traslado |
| `transfer_time` | TEXT | NOT NULL | Hora del traslado |
| `reason` | TEXT | - | Razón del traslado |
| `transferred_by` | TEXT | NOT NULL | Personal que realiza traslado |
| `notes` | TEXT | - | Notas adicionales |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

**⚠️ RESTRICCIÓN:** Los enfermeros NO pueden crear registros en `patient_transfers`. Solo administradores y doctores.

---

## Facturación y Financiero

### 💰 invoices
**Descripción:** Facturas y estados de cuenta de pacientes

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `invoice_number` | TEXT | UNIQUE, NOT NULL | Número de factura |
| `invoice_date` | TEXT | NOT NULL | Fecha de emisión |
| `due_date` | TEXT | NOT NULL | Fecha de vencimiento |
| `subtotal` | REAL | NOT NULL | Subtotal |
| `tax` | REAL | DEFAULT 0 | Impuestos |
| `discount` | REAL | DEFAULT 0 | Descuentos |
| `total` | REAL | NOT NULL | Monto total |
| `amount_paid` | REAL | DEFAULT 0 | Cantidad pagada |
| `status` | TEXT | DEFAULT 'Pending' | 'Pending', 'Partial', 'Paid', 'Overdue' |
| `payment_method` | TEXT | - | Método de pago |
| `notes` | TEXT | - | Notas |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

### 📄 invoice_items
**Descripción:** Líneas de detalle en facturas

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `invoice_id` | INTEGER | FK → invoices(id) | Referencia a factura |
| `description` | TEXT | NOT NULL | Descripción del concepto |
| `quantity` | INTEGER | NOT NULL | Cantidad |
| `unit_price` | REAL | NOT NULL | Precio unitario |
| `total` | REAL | NOT NULL | Total (quantity × unit_price) |
| `item_type` | TEXT | NOT NULL | 'consultation', 'procedure', 'medication', 'room' |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

---

## Gestión de Personal

### 📅 shifts
**Descripción:** Turnos laborales del personal

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `user_id` | INTEGER | FK → users(id) | ID del empleado |
| `date` | TEXT | NOT NULL | Fecha del turno |
| `start_time` | TEXT | NOT NULL | Hora de inicio |
| `end_time` | TEXT | NOT NULL | Hora de fin |
| `shift_type` | TEXT | NOT NULL | 'Mañana', 'Tarde', 'Noche' |
| `department` | TEXT | NOT NULL | Departamento asignado |
| `status` | TEXT | DEFAULT 'Scheduled' | 'Scheduled', 'In Progress', 'Completed' |
| `notes` | TEXT | - | Notas |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

---

## Comunicaciones y Notificaciones

### 🔔 notifications
**Descripción:** Sistema de notificaciones para usuarios

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `user_id` | INTEGER | FK → users(id) | Destinatario |
| `title` | TEXT | NOT NULL | Título de notificación |
| `message` | TEXT | NOT NULL | Contenido |
| `type` | TEXT | NOT NULL | 'info', 'warning', 'error', 'success' |
| `priority` | TEXT | DEFAULT 'normal' | 'low', 'normal', 'high', 'urgent' |
| `is_read` | INTEGER | DEFAULT 0 | 0=no leída, 1=leída |
| `link` | TEXT | - | URL/ruta asociada |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Fecha de creación |

**Índices:**
```sql
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
```

---

## Cuidado Preventivo

### 💉 vaccinations
**Descripción:** Registro de vacunas administradas

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `patient_id` | INTEGER | FK → patients(id) | Referencia al paciente |
| `vaccine_name` | TEXT | NOT NULL | Nombre de la vacuna |
| `dose_number` | INTEGER | NOT NULL | Número de dosis |
| `date_administered` | TEXT | NOT NULL | Fecha de administración |
| `next_due_date` | TEXT | - | Próxima dosis programada |
| `administered_by` | INTEGER | FK → users(id) | Personal que administra |
| `batch_number` | TEXT | - | Número de lote |
| `site` | TEXT | - | Sitio de inyección |
| `reaction_notes` | TEXT | - | Notas de reacciones |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Registro creado |

---

## Seguridad y Auditoría

### 🔍 audit_logs
**Descripción:** Registro de auditoría para cumplimiento NOM-004

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `user_id` | INTEGER | FK → users(id) | Usuario que realiza acción |
| `action` | TEXT | NOT NULL | 'CREATE', 'READ', 'UPDATE', 'DELETE' |
| `table_name` | TEXT | NOT NULL | Tabla afectada |
| `record_id` | INTEGER | - | ID del registro modificado |
| `old_value` | TEXT | - | Valor anterior (JSON) |
| `new_value` | TEXT | - | Nuevo valor (JSON) |
| `ip_address` | TEXT | - | IP del usuario |
| `timestamp` | TEXT | DEFAULT CURRENT_TIMESTAMP | Fecha/hora |

**Propósito:** Garantizar trazabilidad completa para cumplimiento normativo

### 🔐 password_reset_tokens
**Descripción:** Tokens para recuperación de contraseña

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---|---|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | ID único |
| `user_id` | INTEGER | FK → users(id) | Usuario solicitante |
| `token` | TEXT | UNIQUE, NOT NULL | Token seguro (UUID) |
| `expires_at` | TEXT | NOT NULL | Expiración del token |
| `used` | INTEGER | DEFAULT 0 | 0=no usado, 1=usado |
| `created_at` | TEXT | DEFAULT CURRENT_TIMESTAMP | Creación del token |

---

## 🔗 Diagrama de Relaciones

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIOS                                 │
│  ┌──────────────────────────────────────┐                       │
│  │        users (Autenticación)         │                       │
│  ├──────────────────────────────────────┤                       │
│  │ id (PK)                              │                       │
│  │ username (UNIQUE)                    │◄──┐                  │
│  │ password_hash                        │   │                  │
│  │ role: admin|nurse|doctor|patient     │   │                  │
│  │ name, email, phone, department       │   │                  │
│  │ specialization, license_number       │   │                  │
│  └──────────────────────────────────────┘   │                  │
└─────────────────────────────────────────────┼──────────────────┘
                                              │
        ┌─────────────────────────────────────┼─────────────────────────┐
        │                                     │                         │
        │         PACIENTES (CORE)            │      OPERACIONES       │
        │                                     │                         │
  ┌─────┴──────────────────────┐         ┌───┴──────────────────┐    │
  │     patients               │         │  shifts              │    │
  ├────────────────────────────┤         ├──────────────────────┤    │
  │ id (PK)                    │         │ id (PK)              │    │
  │ name, age, gender          │         │ user_id (FK→users)   │    │
  │ room, floor, bed           │         │ date, start_time     │    │
  │ condition, triage_level    │◄────────│ shift_type, status   │    │
  │ admission_date             │         └──────────────────────┘    │
  │ blood_type, allergies      │                                     │
  │ primary_doctor, status     │         ┌──────────────────────┐    │
  └────┬─────────────────────┬─┘         │  audit_logs          │    │
       │                     │           ├──────────────────────┤    │
       │                     │           │ user_id (FK→users)   │    │
       │                     │           │ action, table_name   │    │
       │                     │           │ old_value, new_value │    │
       │                     │           │ timestamp            │    │
       │                     │           └──────────────────────┘    │
       │                     │                                        │
       │                     │           ┌──────────────────────┐    │
       │                     │           │ notifications        │    │
       │                     │           ├──────────────────────┤    │
       │                     │           │ user_id (FK→users)   │    │
       │                     │           │ title, message       │    │
       │                     │           │ type, priority       │    │
       │                     │           └──────────────────────┘    │
       │                     │                                        │
       │      REGISTROS CLÍNICOS (NOM-004: INMUTABLES)              │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       │      │  ┌─────────────────┐  ┌──────────────────────┐  │  │
       │      │  │  treatments     │  │  vital_signs         │  │  │
       │      │  ├─────────────────┤  ├──────────────────────┤  │  │
       ├─────►│  │ patient_id (FK) │  │ patient_id (FK)      │  │  │
       │      │  │ medication      │  │ date, temperature    │  │  │
       │      │  │ dose, frequency │  │ blood_pressure       │  │  │
       │      │  │ status, notes   │  │ heart_rate           │  │  │
       │      │  └─────────────────┘  └──────────────────────┘  │  │
       │      │                                                  │  │
       │      │  ┌─────────────────┐  ┌──────────────────────┐  │  │
       │      │  │  nurse_notes    │  │  medical_history     │  │  │
       │      │  ├─────────────────┤  ├──────────────────────┤  │  │
       ├─────►│  │ patient_id (FK) │  │ patient_id (FK)      │  │  │
       │      │  │ date, note      │  │ date, diagnosis      │  │  │
       │      │  │ note_type       │  │ treatment, doctor    │  │  │
       │      │  │ nurse_name      │  └──────────────────────┘  │  │
       │      │  └─────────────────┘                             │  │
       │      │                                                  │  │
       │      │  ┌────────────────────────────────┐             │  │
       ├─────►│  │non_pharmacological_treatments  │             │  │
       │      │  ├────────────────────────────────┤             │  │
       │      │  │ patient_id (FK)                │             │  │
       │      │  │ treatment_type                 │             │  │
       │      │  │ application_date, performed_by │             │  │
       │      │  └────────────────────────────────┘             │  │
       │      │                                                  │  │
       │      │  ┌──────────────────────────────┐               │  │
       ├─────►│  │ nursing_shift_reports        │               │  │
       │      │  ├──────────────────────────────┤               │  │
       │      │  │ nurse_id (FK→users)          │               │  │
       │      │  │ patients_assigned (JSON)     │               │  │
       │      │  │ general_observations         │               │  │
       │      │  │ incidents, handover_notes    │               │  │
       │      │  └──────────────────────────────┘               │  │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       │      LABORATORIO Y DIAGNÓSTICOS                             │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       │      │  ┌──────────────┐  ┌──────────────────────────┐ │  │
       ├─────►│  │  lab_tests   │  │  imaging_tests           │ │  │
       │      │  ├──────────────┤  ├──────────────────────────┤ │  │
       │      │  │patient_id(FK)│  │ patient_id (FK)          │ │  │
       │      │  │test, results │  │ test_type, body_part     │ │  │
       │      │  │ordered_by    │  │ ordered_by, radiologist  │ │  │
       │      │  └──────────────┘  │ findings, impression     │ │  │
       │      │                     └──────────────────────────┘ │  │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       │      FARMACIA Y PRESCRIPCIONES                             │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       │      │  ┌──────────────┐  ┌──────────────────────────┐ │  │
       ├─────►│  │prescriptions │  │pharmacy_inventory        │ │  │
       │      │  ├──────────────┤  ├──────────────────────────┤ │  │
       │      │  │patient_id(FK)│  │ medication_name          │ │  │
       │      │  │doctor_id(FK) │  │ quantity, unit, expiry   │ │  │
       │      │  │medication    │  │ supplier, price          │ │  │
       │      │  │dosage        │  └──────────────────────────┘ │  │
       │      │  └──────────────┘                                │  │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       │      CIRUGÍA Y EMERGENCIA                                  │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       │      │  ┌──────────────┐  ┌──────────────────────────┐ │  │
       ├─────►│  │  surgeries   │  │ emergency_cases          │ │  │
       │      │  ├──────────────┤  ├──────────────────────────┤ │  │
       │      │  │patient_id(FK)│  │ patient_name             │ │  │
       │      │  │procedure_name│  │ arrival_time, triage     │ │  │
       │      │  │surgeon_id(FK)│  │ chief_complaint          │ │  │
       │      │  │status        │  │ status, outcome          │ │  │
       │      │  └──────────────┘  └──────────────────────────┘ │  │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       │      INSTALACIONES                                         │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       │      │  ┌────────────────┐  ┌──────────────────────────┐ │ │
       │      │  │  rooms         │  │ patient_transfers        │ │ │
       │      │  ├────────────────┤  ├──────────────────────────┤ │ │
       │      │  │room_number(UK) │  │ patient_id (FK)          │ │ │
       ├─────►│  │floor, bed_count│  │ from_room, to_room       │ │ │
       │      │  │occupied_beds   │  │ transfer_date/time       │ │ │
       │      │  │status          │  │ reason, notes            │ │ │
       │      │  └────────────────┘  └──────────────────────────┘ │ │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       │      FACTURACIÓN                                           │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       │      │  ┌────────────────┐  ┌──────────────────────────┐ │ │
       ├─────►│  │  invoices      │  │ invoice_items            │ │ │
       │      │  ├────────────────┤  ├──────────────────────────┤ │ │
       │      │  │patient_id (FK) │  │ invoice_id (FK)          │ │ │
       │      │  │invoice_number  │  │ description, quantity    │ │ │
       │      │  │total, status   │  │ unit_price, item_type    │ │ │
       │      │  └────────────────┘  └──────────────────────────┘ │ │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       │      VACUNACIONES                                          │
       │      ┌──────────────────────────────────────────────────┐  │
       │      │                                                  │  │
       ├─────►│  ┌──────────────────────────────────────────────┐ │ │
       │      │  │ vaccinations                                 │ │ │
       │      │  ├──────────────────────────────────────────────┤ │ │
       │      │  │ patient_id (FK)                              │ │ │
       │      │  │ vaccine_name, dose_number                    │ │ │
       │      │  │ date_administered, administered_by (FK→users)│ │ │
       │      │  └──────────────────────────────────────────────┘ │ │
       │      │                                                  │  │
       │      └──────────────────────────────────────────────────┘  │
       │                                                             │
       └─────────────────────────────────────────────────────────────┘

       ┌──────────────────────────────────┐
       │  SEGURIDAD                       │
       ├──────────────────────────────────┤
       │  password_reset_tokens           │
       │  - user_id (FK→users)            │
       │  - token, expires_at             │
       └──────────────────────────────────┘
```

---

## 📊 Estadísticas de la Base de Datos

| Concepto | Cantidad |
|----------|----------|
| **Tablas principales** | 30 tablas |
| **Tablas núcleo** | 3 (users, patients, appointments) |
| **Tablas de registros clínicos** | 6 (con protección NOM-004) |
| **Tablas de procedimientos** | 2 (enfermería) |
| **Tablas de laboratorio** | 2 |
| **Tablas de farmacia** | 2 |
| **Tablas de emergencia/cirugía** | 2 |
| **Tablas de instalaciones** | 2 |
| **Tablas de facturación** | 2 |
| **Tablas de personal** | 1 |
| **Tablas de comunicación** | 1 |
| **Tablas preventivas** | 1 |
| **Tablas de seguridad** | 2 |
| **Índices de rendimiento** | 16 índices |
| **Triggers de protección** | 6 triggers NOM-004 |

---

## 🔐 Medidas de Seguridad

### NOM-004-SSA3-2012
- ✅ **Integridad:** Triggers `BEFORE DELETE` previenen eliminación física
- ✅ **Trazabilidad:** Tabla `audit_logs` registra todas las acciones
- ✅ **Confidencialidad:** Basada en roles (`users.role`)
- ✅ **Conservación:** Soft delete mediante `deleted_at` (opcional)

### Restricciones de Acceso
- **Enfermeros:** Solo lectura de `patients`, escritura en `nurse_notes`, `vital_signs`, `non_pharmacological_treatments`
- **Doctores:** Lectura completa, escritura en `prescriptions`, `surgeries`, `medical_history`
- **Administradores:** Acceso total
- **Pacientes:** Solo sus propios registros

---

## 🔧 Mantenimiento y Backups

### Recomendaciones
1. **Backups diarios** de `hospital.db`
2. **Comprobación de integridad** (PRAGMA integrity_check)
3. **Análisis de auditoría** mensual via `audit_logs`
4. **Limpieza de tokens** expirados (`password_reset_tokens`)
5. **Monitoreo de espacio** en disco

### Consultas de Mantenimiento
```sql
-- Verificar integridad
PRAGMA integrity_check;

-- Analizar base de datos
ANALYZE;

-- Optimizar indices
REINDEX;

-- Ver tamaño de tabla
SELECT name, page_count * page_size as size FROM pragma_page_count(), pragma_page_size();
```

---

## 📝 Cambios Recientes (v3.0)

### ✅ Completado en esta sesión:
- ✅ Remover edición de condición clínica (solo lectura)
- ✅ Triaje inmutable e incluido en registro de pacientes
- ✅ Bloquear traslados/cambios de habitación para enfermeros
- ✅ Auditoría completa de cambios

### 🔄 En Progreso:
- Validación de CURP único
- Cumplimiento NOM-004 verificado

### 📋 Próximas Mejoras:
- Dashboard de cumplimiento normativo
- Alertas automáticas de medicamentos próximos a vencer
- Reportes de satisfacción de pacientes

---

**Generado:** 2026-01-09  
**Sistema:** Hospital Management System v3.0  
**Responsable:** Equipo de Desarrollo  
**Cumplimiento:** NOM-004-SSA3-2012 ✅
