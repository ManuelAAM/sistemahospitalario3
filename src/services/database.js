import Database from 'tauri-plugin-sql-api';

let db = null;

// Exportar función para obtener la instancia de db
export function getDb() {
  return db;
}

// Inicializa la conexión a la BD
export async function initDatabase() {
  if (db) return db;
  
  try { // <--- AGREGADO: Bloque Try
    console.log('🔌 Initializing SQLite database...');
    db = await Database.load('sqlite:hospital.db');
    console.log('✅ Database loaded successfully');
    
    await createTables();
    await seedInitialData();
    
    return db;
  } catch (error) { // <--- AGREGADO: Captura de error
    console.error('❌ Error CRÍTICO de Base de Datos:', error);
    console.error('Error completo:', JSON.stringify(error, null, 2));
    console.error('Stack trace:', error?.stack);
    // Esto lanzará el error hacia la interfaz para que salga el aviso rojo
    const errorMsg = error?.message || error?.toString() || 'Error desconocido al inicializar base de datos';
    throw new Error(`No se pudo conectar a la base de datos: ${errorMsg}`);
  }
}

// Crea todas las tablas necesarias
async function createTables() {
  try {
    console.log('🛠️ Creating database tables...');
    
    // IMPORTANTE: Forzar recreación de tablas problemáticas
    try {
      await db.execute('DROP TABLE IF EXISTS treatments');
      await db.execute('DROP TABLE IF EXISTS appointments');
      await db.execute('DROP TABLE IF EXISTS medication_inventory');
      console.log('🔄 Dropped old tables to recreate with correct schema');
    } catch (e) {
      console.log('ℹ️ Tables did not exist yet, proceeding with creation');
    }
    
    // Tabla de Usuarios
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        license_number TEXT,
        assigned_shifts TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Pacientes
    await db.execute(`
      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        curp TEXT UNIQUE NOT NULL,
        room TEXT NOT NULL,
        condition TEXT NOT NULL,
        triage_level TEXT NOT NULL,
        triage_evaluated_by TEXT,
        triage_symptoms TEXT,
        triage_timestamp TEXT,
        admission_date TEXT NOT NULL,
        blood_type TEXT NOT NULL,
        allergies TEXT,
        diagnosis TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Signos Vitales
    await db.execute(`
      CREATE TABLE IF NOT EXISTS vital_signs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        temperature TEXT NOT NULL,
        blood_pressure TEXT NOT NULL,
        heart_rate TEXT NOT NULL,
        respiratory_rate TEXT NOT NULL,
        registered_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabla de Tratamientos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        medication TEXT NOT NULL,
        dose TEXT NOT NULL,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        applied_by TEXT NOT NULL,
        last_application TEXT NOT NULL,
        responsible_doctor TEXT,
        administration_times TEXT,
        status TEXT DEFAULT 'Activo',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabla de Notas de Enfermería
    await db.execute(`
      CREATE TABLE IF NOT EXISTS nurse_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        note TEXT NOT NULL,
        note_type TEXT DEFAULT 'Evolución',
        nurse_name TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabla de Citas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        patient_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        doctor TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabla de Intentos de Login (Seguridad)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        success INTEGER NOT NULL,
        ip_address TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username)
      )
    `);

    // Tabla de Bloqueos de Cuenta (Seguridad)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS account_lockouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        locked_at TEXT DEFAULT CURRENT_TIMESTAMP,
        locked_until TEXT,
        reason TEXT,
        attempt_count INTEGER DEFAULT 3,
        temporary_password TEXT,
        FOREIGN KEY (username) REFERENCES users(username)
      )
    `);

    // Tabla de Errores del Sistema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_errors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        error_code TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        module TEXT,
        user_id INTEGER,
        user_name TEXT,
        ip_address TEXT,
        stack_trace TEXT,
        status TEXT DEFAULT 'Abierto',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        resolved_at TEXT,
        resolved_by TEXT,
        resolution_notes TEXT
      )
    `);

    // Tabla de Asignación de Turnos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shift_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        day_of_week TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        date TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Tablas de Módulos Avanzados
    await db.execute(`
      CREATE TABLE IF NOT EXISTS non_pharmacological_treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        treatment_type TEXT NOT NULL,
        description TEXT,
        application_date TEXT NOT NULL,
        duration_minutes INTEGER,
        performed_by TEXT,
        outcome TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS patient_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nurse_id INTEGER NOT NULL,
        patient_id INTEGER NOT NULL,
        assignment_date TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        status TEXT DEFAULT 'Active',
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nurse_id) REFERENCES users(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS nurse_shift_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nurse_id INTEGER NOT NULL,
        shift_date TEXT NOT NULL,
        shift_type TEXT NOT NULL,
        report_content TEXT NOT NULL,
        pending_items TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (nurse_id) REFERENCES users(id)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_number TEXT UNIQUE NOT NULL,
        floor INTEGER NOT NULL,
        department TEXT NOT NULL,
        room_type TEXT NOT NULL,
        bed_count INTEGER NOT NULL,
        occupied_beds INTEGER DEFAULT 0,
        status TEXT DEFAULT 'Available',
        equipment TEXT,
        daily_rate REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Órdenes de Alta Médica (NOM-004 Compliance)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS discharge_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        doctor_id INTEGER NOT NULL,
        doctor_name TEXT NOT NULL,
        discharge_type TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        follow_up_instructions TEXT,
        medications TEXT,
        restrictions TEXT,
        status TEXT DEFAULT 'active',
        cancellation_reason TEXT,
        discharge_executed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (doctor_id) REFERENCES users(id)
      )
    `);

    // Tabla de Inventario de Medicamentos (NOM-176-SSA1-1998 Compliance)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS medication_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        active_ingredient TEXT,
        presentation TEXT,
        concentration TEXT,
        category TEXT DEFAULT 'ESTANDAR',
        is_controlled INTEGER DEFAULT 0,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT DEFAULT 'unidades',
        min_stock INTEGER DEFAULT 10,
        max_stock INTEGER DEFAULT 100,
        unit_price REAL DEFAULT 0,
        supplier TEXT,
        lot_number TEXT,
        expiration_date TEXT,
        location TEXT,
        storage_conditions TEXT,
        last_restocked TEXT,
        last_dispensed TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de Registro de Dispensación de Medicamentos
    await db.execute(`
      CREATE TABLE IF NOT EXISTS medication_dispensations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medication_id INTEGER NOT NULL,
        medication_name TEXT NOT NULL,
        patient_id INTEGER NOT NULL,
        patient_name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        dispensed_by TEXT NOT NULL,
        doctor_prescription TEXT,
        lot_number TEXT,
        stock_before INTEGER,
        stock_after INTEGER,
        reason TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (medication_id) REFERENCES medication_inventory(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Tabla de Tokens de Restablecimiento de Contraseña
    await db.execute(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        license_number TEXT NOT NULL,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        used INTEGER DEFAULT 0,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        used_at TEXT,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (username) REFERENCES users(username)
      )
    `);

    console.log('✅ All database tables verified/created');
    
    // ============================================================
    // NOM-004-SSA3-2012: PROTECCIÓN DE INTEGRIDAD DEL EXPEDIENTE
    // ============================================================
    console.log('🔒 Creating NOM-004 compliance triggers...');
    
    // Trigger: Impedir eliminación de notas de enfermería
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_nurse_notes
      BEFORE DELETE ON nurse_notes
      BEGIN
        SELECT RAISE(ABORT, 'NOM-004 VIOLACIÓN: No se permite eliminar notas de enfermería. El expediente clínico debe mantener su integridad completa para garantizar trazabilidad legal.');
      END
    `);

    // Trigger: Impedir eliminación de signos vitales
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_vital_signs
      BEFORE DELETE ON vital_signs
      BEGIN
        SELECT RAISE(ABORT, 'NOM-004 VIOLACIÓN: No se permite eliminar registros de signos vitales. El expediente clínico debe mantener su integridad completa para garantizar trazabilidad legal.');
      END
    `);

    // Trigger: Impedir eliminación de tratamientos
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_treatments
      BEFORE DELETE ON treatments
      BEGIN
        SELECT RAISE(ABORT, 'NOM-004 VIOLACIÓN: No se permite eliminar registros de tratamientos. El expediente clínico debe mantener su integridad completa para garantizar trazabilidad legal.');
      END
    `);

    // Trigger: Impedir eliminación de tratamientos no farmacológicos
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_non_pharma_treatments
      BEFORE DELETE ON non_pharmacological_treatments
      BEGIN
        SELECT RAISE(ABORT, 'NOM-004 VIOLACIÓN: No se permite eliminar tratamientos no farmacológicos. El expediente clínico debe mantener su integridad completa para garantizar trazabilidad legal.');
      END
    `);

    // Trigger: Impedir eliminación de reportes de turno
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS prevent_delete_shift_reports
      BEFORE DELETE ON nurse_shift_reports
      BEGIN
        SELECT RAISE(ABORT, 'NOM-004 VIOLACIÓN: No se permite eliminar reportes de turno. El expediente clínico debe mantener su integridad completa para garantizar trazabilidad legal.');
      END
    `);

    console.log('✅ NOM-004 compliance triggers created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw new Error(`Failed to create tables: ${error.message || error}`);
  }
}

// ========== DATA SEEDING (REINICIO FORZADO DE CREDENCIALES) ==========

export async function seedInitialData() {
  console.log('⚡ Running seedInitialData...');

  const targetUser = 'enfermero';
  const targetLicense = 'ENF-12345';
  
  // 1. ELIMINAR USUARIO EXISTENTE (Para asegurar que la contraseña se resetee)
  // Primero borramos todas las relaciones FOREIGN KEY para evitar errores
  try {
    // Obtener el ID del usuario antes de eliminarlo
    const userResult = await db.select("SELECT id FROM users WHERE username = ?", [targetUser]);
    const userId = userResult.length > 0 ? userResult[0].id : null;
    
    if (userId) {
      // Eliminar relaciones con FOREIGN KEY (ignorar si las tablas no existen)
      try {
        await db.execute("DELETE FROM patient_assignments WHERE nurse_id = ?", [userId]);
      } catch (e) { /* Tabla puede no existir aún */ }
      
      try {
        await db.execute("DELETE FROM nursing_shift_reports WHERE nurse_id = ?", [userId]);
      } catch (e) { /* Tabla puede no existir aún */ }
      
      console.log('🧹 Deleted user foreign key relationships');
    }
    
    // Ahora eliminar intentos de login, bloqueos y el usuario
    await db.execute("DELETE FROM login_attempts WHERE username = ?", [targetUser]);
    await db.execute("DELETE FROM account_lockouts WHERE username = ?", [targetUser]);
    await db.execute("DELETE FROM users WHERE username = ? OR license_number = ?", [targetUser, targetLicense]);
    console.log('🧹 Cleaned up old user data (forced reset).');
  } catch (e) {
    console.warn('⚠️ Warning cleaning old user:', e);
  }

  // 2. CREAR USUARIO NUEVO CON CONTRASEÑA CORRECTA
  // Contraseña en texto plano: Enfermero123
  // Hash guardado: hash_Enfermero123
  console.log('👤 Creating fresh Nurse User...');
  await db.execute(`
    INSERT OR IGNORE INTO users (username, password_hash, role, name, email, license_number, assigned_shifts)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    targetUser, 
    'hash_Enfermero123', 
    'nurse', 
    'Enf. Laura Martínez', 
    'laura.martinez@hospital.com', 
    targetLicense, 
    '{"start": "06:00", "end": "22:00", "area": "Piso 3 - Ala Norte"}' 
  ]);

  // Crear usuarios adicionales para pruebas de recuperación
  console.log('👥 Creating additional test users...');
  
  // Verificar si los usuarios adicionales ya existen antes de insertarlos
  const existingUsers = await db.select('SELECT username FROM users WHERE username IN (?, ?)', 
    ['carlos.lopez', 'ana.garcia']);
  
  const existingUsernames = existingUsers.map(u => u.username);
  
  try {
    // Usuario 2: Enfermero de turno noche
    if (!existingUsernames.includes('carlos.lopez')) {
      await db.execute(`
        INSERT OR IGNORE INTO users (username, password_hash, role, name, email, license_number, assigned_shifts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'carlos.lopez',
        'hash_Enfermero456',
        'nurse',
        'Enf. Carlos López',
        'carlos.lopez@hospital.com',
        'ENF-67890',
        '{"start": "22:00", "end": "06:00", "area": "Piso 2 - Ala Sur"}'
      ]);
      console.log('✅ User carlos.lopez created');
    } else {
      console.log('ℹ️ User carlos.lopez already exists, skipping');
    }

    // Usuario 3: Enfermera de urgencias
    if (!existingUsernames.includes('ana.garcia')) {
      await db.execute(`
        INSERT OR IGNORE INTO users (username, password_hash, role, name, email, license_number, assigned_shifts)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'ana.garcia',
        'hash_Urgencias2024',
        'nurse',
        'Enf. Ana García',
        'ana.garcia@hospital.com',
        'ENF-11223',
        '{"start": "14:00", "end": "22:00", "area": "Urgencias"}'
      ]);
      console.log('✅ User ana.garcia created');
    } else {
      console.log('ℹ️ User ana.garcia already exists, skipping');
    }

    console.log('✅ Additional test users processed successfully');
  } catch (e) {
    console.warn('⚠️ Error creating test users:', e.message);
  }

  // 3. Verificar/Crear Pacientes (MASIVAMENTE EXPANDIDO - 50+ pacientes)
  const patients = await db.select("SELECT count(*) as count FROM patients");
  if (patients[0].count === 0) {
      console.log('🌱 Seeding 50+ Patients with extensive data...');
      const patientData = [
        // Piso 3 - Medicina Interna (15 pacientes)
        ['Juan Pérez García', 45, 'PEXJ791015HDFRXN01', '301-A', 'Estable', 'VERDE', '2026-01-05', 'O+', 'Penicilina', 'Neumonía adquirida en comunidad', 'Dr. Fernando Ramírez'],
        ['María González López', 62, 'GOGM620312MDFNRR04', '302-B', 'Crítico', 'ROJO', '2026-01-06', 'A-', 'Ninguna', 'Post-operatorio cirugía cardiovascular', 'Dr. Carlos Mendoza'],
        ['Carlos Ruiz Hernández', 28, 'RUCC960523HDFRZR08', '303-A', 'Recuperación', 'AMARILLO', '2026-01-07', 'B+', 'Polen', 'Apendicectomía laparoscópica', 'Dra. Patricia Vega'],
        ['Ana Martínez Sánchez', 35, 'MASA890215MDFRNN08', '304-A', 'Estable', 'VERDE', '2026-01-06', 'AB+', 'Ninguna', 'Diabetes tipo 2 descompensada', 'Dr. Roberto Castro'],
        ['Roberto Díaz Torres', 58, 'DITR651120HDFZRB03', '305-A', 'En observación', 'AMARILLO', '2026-01-07', 'O-', 'Sulfas', 'Infarto agudo al miocardio', 'Dr. Carlos Mendoza'],
        ['Laura Fernández Cruz', 72, 'FECL520408MDFRNR09', '306-B', 'Estable', 'VERDE', '2026-01-05', 'A+', 'Aspirina', 'Fractura de cadera', 'Dr. Miguel Ortega'],
        ['Pedro Ramírez Ortiz', 41, 'RAOP820930HDFLRD04', '307-A', 'Crítico', 'ROJO', '2026-01-08', 'B-', 'Ninguna', 'Politraumatismo por accidente', 'Dra. Sandra López'],
        ['Sofia Morales Reyes', 29, 'MORS941112MDFRRF05', '308-A', 'Estable', 'VERDE', '2026-01-07', 'O+', 'Ninguna', 'Parto eutócico - puerperio inmediato', 'Dra. Elena Torres'],
        ['Miguel Ángel Vargas', 67, 'VARM570625HDFRRG06', '309-B', 'En observación', 'NARANJA', '2026-01-06', 'AB-', 'Yodo', 'Insuficiencia renal crónica', 'Dr. Roberto Castro'],
        ['Carmen Jiménez Flores', 54, 'JIFC700518MDFLRR07', '310-A', 'Estable', 'VERDE', '2026-01-08', 'A+', 'Ninguna', 'Hipertensión arterial sistémica', 'Dr. Fernando Ramírez'],
        ['José Luis Castro Ramos', 38, 'CARJ851203HDFSLS08', '311-A', 'Recuperación', 'VERDE', '2026-01-07', 'O+', 'Ninguna', 'Gastritis aguda', 'Dra. Patricia Vega'],
        ['Patricia Mendoza Silva', 48, 'MESP750822MDFNLT09', '312-B', 'Estable', 'VERDE', '2026-01-06', 'B+', 'Látex', 'Colecistitis aguda', 'Dr. Miguel Ortega'],
        ['Raúl Ortega Moreno', 33, 'ORMR921009HDFRRL10', '313-A', 'En observación', 'AMARILLO', '2026-01-08', 'A-', 'Ninguna', 'Cetoacidosis diabética', 'Dr. Roberto Castro'],
        ['Gabriela Soto Vega', 26, 'SOVG970315MDFTVB11', '314-A', 'Estable', 'VERDE', '2026-01-07', 'O+', 'Ninguna', 'Asma bronquial', 'Dr. Fernando Ramírez'],
        ['Fernando Luna Paredes', 61, 'LUPF621128HDFLRR12', '315-B', 'Crítico', 'ROJO', '2026-01-08', 'B-', 'Ninguna', 'Accidente cerebrovascular isquémico', 'Dra. Sandra López'],
        
        // Piso 4 - UCI y Cardiología (15 pacientes)
        ['Alejandro Torres Guzmán', 55, 'TOGA651015HDFZRJ13', '401-A', 'Crítico', 'ROJO', '2026-01-06', 'O+', 'Ninguna', 'Infarto masivo - UCI', 'Dr. Carlos Mendoza'],
        ['Elena Vásquez Moreno', 70, 'VAME540203MDFSNL14', '402-B', 'Crítico', 'ROJO', '2026-01-05', 'A-', 'Penicilina', 'Choque séptico - UCI', 'Dra. Sandra López'],
        ['Rodrigo Silva Castillo', 32, 'SICR911210HDFLSD15', '403-A', 'En observación', 'AMARILLO', '2026-01-07', 'B+', 'Ninguna', 'Post-operatorio neurocirugía', 'Dr. Luis Herrera'],
        ['Marcela Ramos Cruz', 44, 'RACM791022MDFMSR16', '404-A', 'Estable', 'VERDE', '2026-01-06', 'AB+', 'Ninguna', 'Arritmia supraventricular', 'Dr. Carlos Mendoza'],
        ['Diego Herrera Jiménez', 29, 'HEJD951118HDFRRG17', '405-B', 'Crítico', 'ROJO', '2026-01-08', 'O-', 'Ninguna', 'Traumatismo craneoencefálico severo', 'Dr. Luis Herrera'],
        ['Claudia Núñez Peña', 58, 'NUPC661205MDFÑLD18', '406-A', 'Estable', 'VERDE', '2026-01-05', 'A+', 'Aspirina', 'Angina inestable', 'Dr. Carlos Mendoza'],
        ['Sebastián Morales Torres', 36, 'MOTS870823HDFRBS19', '407-A', 'En observación', 'AMARILLO', '2026-01-07', 'B-', 'Ninguna', 'Pancreatitis aguda', 'Dra. Patricia Vega'],
        ['Valeria Castañeda López', 42, 'CALV810314MDFSTL20', '408-B', 'Estable', 'VERDE', '2026-01-06', 'O+', 'Ninguna', 'Fibrilación auricular', 'Dr. Carlos Mendoza'],
        ['Andrés Pacheco Ruiz', 50, 'PARA731208HDFCHN21', '409-A', 'Crítico', 'ROJO', '2026-01-08', 'AB-', 'Sulfas', 'Edema pulmonar agudo', 'Dra. Sandra López'],
        ['Mónica Salinas Vega', 39, 'SAVM841115MDFSLM22', '410-A', 'Recuperación', 'VERDE', '2026-01-07', 'A-', 'Ninguna', 'Post-cateterismo cardíaco', 'Dr. Carlos Mendoza'],
        ['Javier Cruz Mendoza', 63, 'CUMJ610429HDFRZV23', '411-B', 'En observación', 'AMARILLO', '2026-01-06', 'B+', 'Yodo', 'Insuficiencia cardíaca congestiva', 'Dr. Carlos Mendoza'],
        ['Paola Guerrero Santos', 31, 'GUSP920907MDFRRP24', '412-A', 'Estable', 'VERDE', '2026-01-07', 'O+', 'Ninguna', 'Miocarditis viral', 'Dr. Carlos Mendoza'],
        ['Óscar Domínguez Flores', 47, 'DOFO760619HDFMLR25', '413-A', 'Crítico', 'ROJO', '2026-01-08', 'A+', 'Ninguna', 'Shock cardiogénico', 'Dra. Sandra López'],
        ['Lorena Aguilar Ramírez', 53, 'AGRL701003MDFGMR26', '414-B', 'Estable', 'VERDE', '2026-01-05', 'B-', 'Látex', 'Hipertensión pulmonar', 'Dr. Carlos Mendoza'],
        ['Ricardo Flores Herrera', 41, 'FLHR821127HDFRLC27', '415-A', 'En observación', 'AMARILLO', '2026-01-07', 'O-', 'Ninguna', 'Taquicardia ventricular', 'Dr. Carlos Mendoza'],

        // Piso 2 - Pediatría y Ginecología (20 pacientes)
        ['Isabella Martín López', 8, 'MALI151220MDFNSL28', '201-A', 'Estable', 'VERDE', '2026-01-06', 'O+', 'Ninguna', 'Bronquiolitis', 'Dra. Carmen Rodríguez'],
        ['Mateo García Santos', 12, 'GASM111015HDFRSN29', '202-A', 'En observación', 'AMARILLO', '2026-01-07', 'A+', 'Penicilina', 'Apendicitis aguda', 'Dr. Jorge Méndez'],
        ['Sofía Hernández Cruz', 5, 'HECS181030MDFRRF30', '203-B', 'Estable', 'VERDE', '2026-01-05', 'B+', 'Ninguna', 'Gastroenteritis aguda', 'Dra. Carmen Rodríguez'],
        ['Daniel Torres Morales', 15, 'TOMD081205HDFRMN31', '204-A', 'Crítico', 'ROJO', '2026-01-08', 'O-', 'Ninguna', 'Trauma abdominal por accidente', 'Dr. Jorge Méndez'],
        ['Camila Ruiz Fernández', 10, 'RUFC131112MDFZML32', '205-A', 'Recuperación', 'VERDE', '2026-01-07', 'AB+', 'Ninguna', 'Post-operatorio amigdalectomía', 'Dr. Jorge Méndez'],
        ['Alejandro Díaz Vega', 14, 'DIVA091018HDFZLJ33', '206-B', 'Estable', 'VERDE', '2026-01-06', 'A-', 'Aspirina', 'Fractura de antebrazo', 'Dr. Jorge Méndez'],
        ['Valentina Soto Ramírez', 7, 'SORV160825MDFTML34', '207-A', 'En observación', 'AMARILLO', '2026-01-07', 'B-', 'Ninguna', 'Crisis asmática', 'Dra. Carmen Rodríguez'],
        ['Santiago López García', 11, 'LOGA120703HDFPNT35', '208-A', 'Estable', 'VERDE', '2026-01-06', 'O+', 'Ninguna', 'Neumonía infantil', 'Dra. Carmen Rodríguez'],
        ['Emilia Moreno Torres', 6, 'MOTE171115MDFRNM36', '209-B', 'Crítico', 'ROJO', '2026-01-08', 'A+', 'Látex', 'Meningitis bacteriana', 'Dr. Jorge Méndez'],
        ['Nicolás Herrera Soto', 13, 'HESN100901HDFRTC37', '210-A', 'Estable', 'VERDE', '2026-01-05', 'B+', 'Ninguna', 'Diabetes juvenil', 'Dra. Carmen Rodríguez'],
        
        // Ginecología y Obstetricia
        ['Adriana Castillo Mendoza', 28, 'CAMA951203MDFSTD38', '211-A', 'Estable', 'VERDE', '2026-01-06', 'O+', 'Ninguna', 'Embarazo gemelar 36 SDG', 'Dra. Elena Torres'],
        ['Fernanda Silva Ruiz', 32, 'SIRF911025MDFLLR39', '212-B', 'En observación', 'AMARILLO', '2026-01-07', 'A-', 'Ninguna', 'Preeclampsia leve', 'Dra. Elena Torres'],
        ['Carolina Vázquez Flores', 25, 'VAFC981210MDFZLR40', '213-A', 'Estable', 'VERDE', '2026-01-05', 'B+', 'Ninguna', 'Parto prematuro 34 SDG', 'Dra. Elena Torres'],
        ['Natalia Gómez Castro', 29, 'GOCN940615MDFMST41', '214-A', 'Crítico', 'ROJO', '2026-01-08', 'AB-', 'Penicilina', 'Ruptura uterina - emergencia', 'Dra. Elena Torres'],
        ['Alejandra Pérez Morales', 35, 'PEMA881122MDFRZL42', '215-B', 'Recuperación', 'VERDE', '2026-01-07', 'O-', 'Ninguna', 'Cesárea por circular de cordón', 'Dra. Elena Torres'],
        ['Paulina Rojas Jiménez', 27, 'ROJP960408MDFMSL43', '216-A', 'Estable', 'VERDE', '2026-01-06', 'A+', 'Ninguna', 'Embarazo múltiple - trillizos', 'Dra. Elena Torres'],
        ['Mariana Delgado Sánchez', 33, 'DESM901015MDFLN44', '217-A', 'En observación', 'AMARILLO', '2026-01-07', 'B-', 'Aspirina', 'Diabetes gestacional', 'Dra. Elena Torres'],
        ['Daniela Ortiz Vega', 26, 'ORVD970312MDFRTD45', '218-B', 'Estable', 'VERDE', '2026-01-05', 'O+', 'Ninguna', 'Embarazo de alto riesgo', 'Dra. Elena Torres'],
        ['Lucía Ramírez Torres', 30, 'RATL931108MDFMSR46', '219-A', 'Crítico', 'ROJO', '2026-01-08', 'AB+', 'Sulfas', 'Hemorragia post-parto', 'Dra. Elena Torres'],
        ['Andrea González Moreno', 24, 'GOMA991201MDFNRD47', '220-A', 'Recuperación', 'VERDE', '2026-01-07', 'A-', 'Ninguna', 'Puerperio fisiológico gemelar', 'Dra. Elena Torres']
      ];
      
      for (const p of patientData) {
        await db.execute(
          `INSERT INTO patients (name, age, curp, room, condition, triage_level, admission_date, blood_type, allergies, diagnosis, primary_doctor) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p
        );
      }
      console.log(`✅ Created ${patientData.length} patients with comprehensive data`);
  }

  // 4. Verificar/Crear Signos Vitales (MASIVAMENTE EXPANDIDO - todos los pacientes)
  const vitals = await db.select("SELECT count(*) as count FROM vital_signs");
  if (vitals[0].count === 0) {
      console.log('🌱 Seeding Comprehensive Vital Signs for ALL patients...');
      const pList = await db.select("SELECT id FROM patients ORDER BY id");
      
      if (pList.length > 0) {
        const vitalRecords = [];
        
        // Generar múltiples registros de signos vitales por paciente (simulando evolución)
        for (let i = 0; i < Math.min(pList.length, 50); i++) {
          const patientId = pList[i].id;
          const baseDate = '08/01';
          
          // Pacientes críticos - signos vitales cada 2 horas
          if (i % 7 === 0 || i % 11 === 0) { // Algunos pacientes críticos
            const criticalSigns = [
              [patientId, `${baseDate} 06:00`, '38.5', '160/95', '110', '28', 'Enf. Carlos López'],
              [patientId, `${baseDate} 08:00`, '38.8', '165/98', '115', '30', 'Enf. Laura Martínez'],
              [patientId, `${baseDate} 10:00`, '39.2', '170/100', '118', '32', 'Enf. Laura Martínez'],
              [patientId, `${baseDate} 12:00`, '38.9', '162/96', '112', '29', 'Enf. Laura Martínez'],
              [patientId, `${baseDate} 14:00`, '38.6', '158/94', '108', '27', 'Enf. Ana García'],
              [patientId, `${baseDate} 16:00`, '38.3', '155/92', '105', '26', 'Enf. Ana García'],
              [patientId, `${baseDate} 18:00`, '38.0', '150/88', '102', '24', 'Enf. Ana García'],
              [patientId, `${baseDate} 20:00`, '37.8', '148/86', '98', '23', 'Enf. Carlos López'],
              [patientId, `${baseDate} 22:00`, '37.5', '145/84', '95', '22', 'Enf. Carlos López']
            ];
            vitalRecords.push(...criticalSigns);
          }
          // Pacientes en observación - signos vitales cada 4 horas
          else if (i % 5 === 0) {
            const observationSigns = [
              [patientId, `${baseDate} 08:00`, '37.2', '135/85', '88', '22', 'Enf. Laura Martínez'],
              [patientId, `${baseDate} 12:00`, '37.4', '138/88', '92', '23', 'Enf. Laura Martínez'],
              [patientId, `${baseDate} 16:00`, '37.1', '132/82', '85', '21', 'Enf. Ana García'],
              [patientId, `${baseDate} 20:00`, '36.9', '130/80', '82', '20', 'Enf. Carlos López'],
              [patientId, `${baseDate} 00:00`, '36.8', '128/78', '80', '19', 'Enf. Carlos López']
            ];
            vitalRecords.push(...observationSigns);
          }
          // Pacientes estables - signos vitales cada 8 horas
          else {
            const stableSigns = [
              [patientId, `${baseDate} 08:00`, '36.6', '120/78', '72', '18', 'Enf. Laura Martínez'],
              [patientId, `${baseDate} 16:00`, '36.8', '118/76', '70', '17', 'Enf. Ana García'],
              [patientId, `${baseDate} 00:00`, '36.5', '115/75', '68', '18', 'Enf. Carlos López']
            ];
            vitalRecords.push(...stableSigns);
          }
          
          // Pacientes pediátricos (ajustar signos vitales para niños)
          if (i >= 20 && i <= 29) { // Rango pediátrico
            const pediatricSigns = [
              [patientId, `${baseDate} 08:00`, '37.0', '95/60', '100', '24', 'Enf. Carmen Rodríguez'],
              [patientId, `${baseDate} 14:00`, '37.2', '98/62', '105', '26', 'Enf. Carmen Rodríguez'],
              [patientId, `${baseDate} 20:00`, '36.8', '92/58', '98', '22', 'Enf. Carmen Rodríguez']
            ];
            vitalRecords.push(...pediatricSigns);
          }
        }
        
        // Insertar todos los signos vitales
        for (const v of vitalRecords) {
          await db.execute(
            `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            v
          );
        }
        
        console.log(`✅ Created ${vitalRecords.length} comprehensive vital signs records for ${Math.min(pList.length, 50)} patients`);
      }
  }
  
  // 5. Verificar/Crear Asignaciones de Pacientes a Enfermeros (MASIVAMENTE EXPANDIDO)
  const assignments = await db.select("SELECT count(*) as count FROM patient_assignments");
  if (assignments[0].count === 0) {
      console.log('🏥 Seeding Comprehensive Patient Assignments for ALL nurses...');
      
      // Obtener IDs de enfermeros y pacientes
      const nurses = await db.select("SELECT id, username, name FROM users WHERE role = 'nurse'");
      const patientsList = await db.select("SELECT id, first_name, last_name, floor FROM patients ORDER BY id");
      
      if (nurses.length > 0 && patientsList.length > 0) {
          const today = new Date().toLocaleDateString('es-MX');
          const assignmentData = [];
          
          // Buscar enfermeros específicos por nombre
          const lauraMartinez = nurses.find(n => n.name === 'Enf. Laura Martínez');
          const carlosLopez = nurses.find(n => n.name === 'Enf. Carlos López');
          const anaGarcia = nurses.find(n => n.name === 'Enf. Ana García');
          const sandraLopez = nurses.find(n => n.name === 'Enf. Sandra López');
          const carmenRodriguez = nurses.find(n => n.name === 'Enf. Carmen Rodríguez');
          const elenaTorres = nurses.find(n => n.name === 'Enf. Elena Torres');
          
          // LAURA MARTÍNEZ - Medicina Interna (15 pacientes)
          if (lauraMartinez) {
              // Turno Matutino: Pacientes de Medicina Interna (Piso 3)
              const medicinaPatients = patientsList.filter(p => p.floor === 'Piso 3 - Medicina Interna').slice(0, 8);
              medicinaPatients.forEach((patient, idx) => {
                assignmentData.push([
                  lauraMartinez.id, patient.id, today, 'Matutino', 'Active',
                  `Medicina Interna - ${patient.first_name} ${patient.last_name} - Habitación asignada`
                ]);
              });
              
              // Turno Vespertino: Otros pacientes de Medicina Interna
              const medicinaPatients2 = patientsList.filter(p => p.floor === 'Piso 3 - Medicina Interna').slice(8, 15);
              medicinaPatients2.forEach((patient, idx) => {
                assignmentData.push([
                  lauraMartinez.id, patient.id, today, 'Vespertino', 'Active',
                  `Medicina Interna - Continuidad de cuidados - ${patient.first_name} ${patient.last_name}`
                ]);
              });
          }
            
          // CARLOS LÓPEZ - UCI/Cardiología (15 pacientes)
          if (carlosLopez) {
              // Turno Nocturno: Pacientes críticos UCI
              const ucuPatients = patientsList.filter(p => p.floor === 'Piso 4 - UCI/Cardiología').slice(0, 10);
              ucuPatients.forEach((patient, idx) => {
                assignmentData.push([
                  carlosLopez.id, patient.id, today, 'Nocturno', 'Active',
                  `UCI/Cardiología - Paciente crítico ${patient.first_name} ${patient.last_name} - Monitoreo continuo`
                ]);
              });
              
              // Turno Matutino: Continuidad UCI
              const ucuPatients2 = patientsList.filter(p => p.floor === 'Piso 4 - UCI/Cardiología').slice(10, 15);
              ucuPatients2.forEach((patient, idx) => {
                assignmentData.push([
                  carlosLopez.id, patient.id, today, 'Matutino', 'Active',
                  `UCI - Relevo turno nocturno - ${patient.first_name} ${patient.last_name}`
                ]);
              });
          }
            
          // ANA GARCÍA - Pediatría/Ginecología (14 pacientes)
          if (anaGarcia) {
              // Turno Vespertino: Pacientes pediátricos
              const pedPatients = patientsList.filter(p => p.floor === 'Piso 2 - Pediatría').slice(0, 8);
              pedPatients.forEach((patient, idx) => {
                assignmentData.push([
                  anaGarcia.id, patient.id, today, 'Vespertino', 'Active',
                  `Pediatría - Menor ${patient.first_name} ${patient.last_name} - Cuidados especializados`
                ]);
              });
              
              // Turno Nocturno: Ginecología
              const ginecPatients = patientsList.filter(p => p.floor === 'Piso 2 - Ginecología').slice(0, 6);
              ginecPatients.forEach((patient, idx) => {
                assignmentData.push([
                  anaGarcia.id, patient.id, today, 'Nocturno', 'Active',
                  `Ginecología - ${patient.first_name} ${patient.last_name} - Cuidados post-operatorios`
                ]);
              });
          }
            
          // SANDRA LÓPEZ - UCI Especializada (6 pacientes)
          if (sandraLopez) {
              // Turno Matutino: Pacientes UCI críticos
              const ucuCriticos = patientsList.filter(p => p.floor === 'Piso 4 - UCI/Cardiología').slice(15, 21);
              ucuCriticos.forEach((patient, idx) => {
                assignmentData.push([
                  sandraLopez.id, patient.id, today, 'Matutino', 'Active',
                  `UCI Crítica - ${patient.first_name} ${patient.last_name} - Soporte vital avanzado`
                ]);
              });
          }
            
          // CARMEN RODRÍGUEZ - Pediatría Especializada (5 pacientes)
          if (carmenRodriguez) {
              // Turno Matutino: Pacientes pediátricos
              const pedEspecial = patientsList.filter(p => p.floor === 'Piso 2 - Pediatría').slice(8, 13);
              pedEspecial.forEach((patient, idx) => {
                assignmentData.push([
                  carmenRodriguez.id, patient.id, today, 'Matutino', 'Active',
                  `Pediatría Esp. - ${patient.first_name} ${patient.last_name} - Cuidados pediátricos`
                ]);
              });
          }
            
          // ELENA TORRES - Ginecología/Obstetricia (5 pacientes)
          if (elenaTorres) {
              // Turno Vespertino: Pacientes obstétricas
              const obstetric = patientsList.filter(p => p.floor === 'Piso 2 - Ginecología').slice(6, 11);
              obstetric.forEach((patient, idx) => {
                assignmentData.push([
                  elenaTorres.id, patient.id, today, 'Vespertino', 'Active',
                  `Obstetricia - ${patient.first_name} ${patient.last_name} - Control puerperal`
                ]);
              });
          }
          
          // Insertar todas las asignaciones
          for (const assignment of assignmentData) {
            await db.execute(`
                INSERT INTO patient_assignments (nurse_id, patient_id, assignment_date, shift_type, status, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `, assignment);
          }
          
          console.log(`✅ Created ${assignmentData.length} comprehensive patient assignments across all shifts and specialties`);
          console.log(`📊 Assignments distribution: ${nurses.length} nurses with multiple patients each`);
      }
  }
  
  // 6. Verificar/Crear Habitaciones
  const rooms = await db.select("SELECT count(*) as count FROM rooms");
  if (rooms[0].count === 0) {
      console.log('🌱 Seeding Rooms...');
      
      // Habitaciones del Piso 3 - Ala Norte
      await db.execute(`
          INSERT INTO rooms (room_number, floor, department, room_type, bed_count, occupied_beds, status, equipment)
          VALUES ('301-A', 3, 'Medicina Interna', 'Individual', 1, 1, 'Occupied', '["Monitor de signos vitales", "Oxígeno"]')
      `);
      
      await db.execute(`
          INSERT INTO rooms (room_number, floor, department, room_type, bed_count, occupied_beds, status, equipment)
          VALUES ('302-B', 3, 'Cirugía', 'Individual', 1, 1, 'Occupied', '["Monitor cardíaco", "Oxígeno", "Bomba de infusión"]')
      `);
      
      await db.execute(`
          INSERT INTO rooms (room_number, floor, department, room_type, bed_count, occupied_beds, status, equipment)
          VALUES ('303-A', 3, 'Post-operatorio', 'Individual', 1, 1, 'Occupied', '["Monitor", "Oxígeno"]')
      `);
      
      // Habitaciones disponibles
      await db.execute(`
          INSERT INTO rooms (room_number, floor, department, room_type, bed_count, occupied_beds, status, equipment)
          VALUES ('304-A', 3, 'Medicina Interna', 'Individual', 1, 0, 'Available', '["Monitor", "Oxígeno"]')
      `);
      
      await db.execute(`
          INSERT INTO rooms (room_number, floor, department, room_type, bed_count, occupied_beds, status, equipment)
          VALUES ('305-B', 3, 'Medicina Interna', 'Compartida', 2, 0, 'Available', '["Monitor", "Oxígeno"]')
      `);
      
      // UCI
      await db.execute(`
          INSERT INTO rooms (room_number, floor, department, room_type, bed_count, occupied_beds, status, equipment)
          VALUES ('401-UCI', 4, 'Cuidados Intensivos', 'UCI', 1, 0, 'Available', '["Ventilador", "Monitor multiparamétrico", "Bomba de infusión", "Desfibrilador"]')
      `);
      
      console.log('✅ Rooms created');
  }
  
  // 7. Poblar Inventario de Medicamentos
  try {
    console.log('🔍 Checking medication inventory...');
    const medications = await db.select("SELECT count(*) as count FROM medication_inventory");
    console.log(`📊 Current medication count: ${medications[0].count}`);
    
    if (medications[0].count === 0) {
        console.log('💊 Seeding Medication Inventory...');
        const now = new Date().toISOString();
        
        const meds = [
          // ANALGÉSICOS Y ANTIINFLAMATORIOS
          ['Paracetamol 500mg', 'Paracetamol', 'Tabletas', '500mg', 'ANALGESICO', 0, 500, 'tabletas', 100, 1000, 2.50, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante A1'],
          ['Ibuprofeno 400mg', 'Ibuprofeno', 'Tabletas', '400mg', 'AINE', 0, 300, 'tabletas', 80, 500, 3.00, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante A2'],
          ['Diclofenaco 75mg/3ml', 'Diclofenaco', 'Ampolletas', '75mg/3ml', 'AINE', 0, 80, 'ampolletas', 20, 150, 8.00, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante A3'],
          ['Ketorolaco 30mg/ml', 'Ketorolaco', 'Ampolletas', '30mg/ml', 'AINE', 0, 60, 'ampolletas', 15, 120, 12.50, 'Laboratorios Farma', 'Farmacia Principal - Estante A4'],
          ['Naproxeno 250mg', 'Naproxeno', 'Tabletas', '250mg', 'AINE', 0, 200, 'tabletas', 50, 400, 4.50, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante A5'],
          
          // ANTIBIÓTICOS
          ['Amoxicilina 500mg', 'Amoxicilina', 'Cápsulas', '500mg', 'ANTIBIOTICO', 0, 200, 'cápsulas', 50, 400, 5.50, 'Laboratorios Farma', 'Farmacia Principal - Estante B1'],
          ['Cefalexina 500mg', 'Cefalexina', 'Cápsulas', '500mg', 'ANTIBIOTICO', 0, 150, 'cápsulas', 40, 300, 8.00, 'Laboratorios Farma', 'Farmacia Principal - Estante B2'],
          ['Azitromicina 500mg', 'Azitromicina', 'Tabletas', '500mg', 'ANTIBIOTICO', 0, 100, 'tabletas', 25, 200, 15.00, 'Distribuidora Especializada', 'Farmacia Principal - Estante B3'],
          ['Ciprofloxacino 500mg', 'Ciprofloxacino', 'Tabletas', '500mg', 'ANTIBIOTICO', 0, 120, 'tabletas', 30, 250, 12.00, 'Laboratorios Farma', 'Farmacia Principal - Estante B4'],
          ['Clindamicina 300mg', 'Clindamicina', 'Cápsulas', '300mg', 'ANTIBIOTICO', 0, 80, 'cápsulas', 20, 150, 18.50, 'Distribuidora Especializada', 'Farmacia Principal - Estante B5'],
          ['Ceftriaxona 1g', 'Ceftriaxona', 'Vial', '1g', 'ANTIBIOTICO', 0, 50, 'viales', 15, 100, 35.00, 'Distribuidora Especializada', 'Farmacia Principal - Estante B6'],
          
          // MEDICAMENTOS CARDIOVASCULARES
          ['Losartán 50mg', 'Losartán', 'Tabletas', '50mg', 'ANTIHIPERTENSIVO', 0, 250, 'tabletas', 60, 400, 4.50, 'Laboratorios Farma', 'Farmacia Principal - Estante D2'],
          ['Enalapril 10mg', 'Enalapril', 'Tabletas', '10mg', 'ANTIHIPERTENSIVO', 0, 200, 'tabletas', 50, 350, 3.80, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante D3'],
          ['Amlodipino 5mg', 'Amlodipino', 'Tabletas', '5mg', 'ANTIHIPERTENSIVO', 0, 180, 'tabletas', 45, 300, 5.20, 'Laboratorios Farma', 'Farmacia Principal - Estante D4'],
          ['Atorvastatina 20mg', 'Atorvastatina', 'Tabletas', '20mg', 'HIPOLIPEMIANTE', 0, 150, 'tabletas', 40, 250, 8.90, 'Distribuidora Especializada', 'Farmacia Principal - Estante D5'],
          ['Carvedilol 25mg', 'Carvedilol', 'Tabletas', '25mg', 'BETABLOQUEADOR', 0, 100, 'tabletas', 25, 200, 12.50, 'Laboratorios Farma', 'Farmacia Principal - Estante D6'],
          ['Aspirina 100mg', 'Ácido Acetilsalicílico', 'Tabletas', '100mg', 'ANTIAGREGANTE', 0, 300, 'tabletas', 75, 500, 2.80, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante D7'],
          
          // MEDICAMENTOS PARA DIABETES
          ['Metformina 850mg', 'Metformina', 'Tabletas', '850mg', 'ANTIDIABETICO', 0, 400, 'tabletas', 100, 600, 3.50, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante D1'],
          ['Glibenclamida 5mg', 'Glibenclamida', 'Tabletas', '5mg', 'ANTIDIABETICO', 0, 200, 'tabletas', 50, 350, 4.20, 'Laboratorios Farma', 'Farmacia Principal - Estante D8'],
          ['Insulina Glargina 100UI/ml', 'Insulina Glargina', 'Pluma precargada', '100UI/ml', 'ANTIDIABETICO', 0, 30, 'plumas', 10, 50, 450.00, 'Laboratorios Especializados', 'Farmacia - Refrigerador R1'],
          ['Insulina Lispro 100UI/ml', 'Insulina Lispro', 'Vial', '100UI/ml', 'ANTIDIABETICO', 0, 25, 'viales', 8, 40, 380.00, 'Laboratorios Especializados', 'Farmacia - Refrigerador R2'],
          
          // GASTROPROTECTORES Y DIGESTIVOS
          ['Omeprazol 20mg', 'Omeprazol', 'Cápsulas', '20mg', 'GASTROPROTECTOR', 0, 150, 'cápsulas', 40, 300, 4.00, 'Laboratorios Farma', 'Farmacia Principal - Estante C1'],
          ['Pantoprazol 40mg', 'Pantoprazol', 'Tabletas', '40mg', 'GASTROPROTECTOR', 0, 120, 'tabletas', 30, 250, 6.50, 'Distribuidora Especializada', 'Farmacia Principal - Estante C2'],
          ['Ranitidina 150mg', 'Ranitidina', 'Tabletas', '150mg', 'ANTIHISTAMINICO H2', 0, 100, 'tabletas', 25, 200, 5.80, 'Laboratorios Farma', 'Farmacia Principal - Estante C3'],
          ['Sucralfato 1g', 'Sucralfato', 'Sobres', '1g', 'PROTECTOR GASTRICO', 0, 60, 'sobres', 15, 120, 8.20, 'Distribuidora Especializada', 'Farmacia Principal - Estante C4'],
          
          // MEDICAMENTOS CONTROLADOS
          ['Morfina 10mg/ml', 'Morfina', 'Ampolletas', '10mg/ml', 'OPIOIDE', 1, 50, 'ampolletas', 10, 100, 25.00, 'Distribuidora Especializada', 'Farmacia - Estante Controlados E1'],
          ['Fentanilo 50mcg/ml', 'Fentanilo', 'Ampolletas', '50mcg/ml', 'OPIOIDE', 1, 30, 'ampolletas', 8, 60, 45.00, 'Distribuidora Especializada', 'Farmacia - Estante Controlados E2'],
          ['Midazolam 5mg/ml', 'Midazolam', 'Ampolletas', '5mg/ml', 'BENZODIACEPINA', 1, 40, 'ampolletas', 10, 80, 18.50, 'Distribuidora Especializada', 'Farmacia - Estante Controlados E3'],
          ['Tramadol 100mg', 'Tramadol', 'Ampolletas', '100mg/2ml', 'OPIOIDE', 1, 60, 'ampolletas', 15, 120, 15.00, 'Laboratorios Farma', 'Farmacia - Estante Controlados E4'],
          
          // SOLUCIONES Y ELECTROLITOS
          ['Solución Salina 0.9% 1000ml', 'Cloruro de Sodio', 'Bolsa IV', '0.9%', 'SOLUCIONES', 0, 100, 'bolsas', 30, 200, 15.00, 'Distribuidora Farmacéutica México', 'Almacén - Área de Soluciones'],
          ['Dextrosa 5% 1000ml', 'Dextrosa', 'Bolsa IV', '5%', 'SOLUCIONES', 0, 80, 'bolsas', 25, 150, 18.00, 'Distribuidora Farmacéutica México', 'Almacén - Área de Soluciones'],
          ['Hartmann 1000ml', 'Lactato de Ringer', 'Bolsa IV', '1000ml', 'SOLUCIONES', 0, 60, 'bolsas', 20, 120, 22.00, 'Distribuidora Farmacéutica México', 'Almacén - Área de Soluciones'],
          ['Cloruro de Potasio 2mEq/ml', 'Cloruro de Potasio', 'Ampolletas', '2mEq/ml', 'ELECTROLITOS', 0, 40, 'ampolletas', 12, 80, 8.50, 'Laboratorios Farma', 'Farmacia Principal - Estante F1'],
          
          // MEDICAMENTOS RESPIRATORIOS
          ['Salbutamol 100mcg', 'Salbutamol', 'Inhalador', '100mcg/dosis', 'BRONCODILATADOR', 0, 50, 'inhaladores', 15, 100, 85.00, 'Distribuidora Especializada', 'Farmacia Principal - Estante G1'],
          ['Budesonida 200mcg', 'Budesonida', 'Inhalador', '200mcg/dosis', 'CORTICOSTEROIDE', 0, 30, 'inhaladores', 10, 60, 120.00, 'Laboratorios Especializados', 'Farmacia Principal - Estante G2'],
          ['Teofilina 300mg', 'Teofilina', 'Tabletas de liberación prolongada', '300mg', 'BRONCODILATADOR', 0, 80, 'tabletas', 20, 150, 12.80, 'Laboratorios Farma', 'Farmacia Principal - Estante G3'],
          
          // MEDICAMENTOS NEUROLÓGICOS
          ['Fenitoína 100mg', 'Fenitoína', 'Cápsulas', '100mg', 'ANTICONVULSIVANTE', 0, 60, 'cápsulas', 15, 120, 8.90, 'Laboratorios Farma', 'Farmacia Principal - Estante H1'],
          ['Carbamazepina 200mg', 'Carbamazepina', 'Tabletas', '200mg', 'ANTICONVULSIVANTE', 0, 80, 'tabletas', 20, 150, 6.50, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante H2'],
          ['Levetiracetam 500mg', 'Levetiracetam', 'Tabletas', '500mg', 'ANTICONVULSIVANTE', 0, 40, 'tabletas', 12, 80, 25.00, 'Distribuidora Especializada', 'Farmacia Principal - Estante H3'],
          
          // ANTIHISTAMÍNICOS Y CORTICOSTEROIDES
          ['Loratadina 10mg', 'Loratadina', 'Tabletas', '10mg', 'ANTIHISTAMINICO', 0, 200, 'tabletas', 50, 350, 3.20, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante I1'],
          ['Cetirizina 10mg', 'Cetirizina', 'Tabletas', '10mg', 'ANTIHISTAMINICO', 0, 150, 'tabletas', 40, 300, 4.80, 'Laboratorios Farma', 'Farmacia Principal - Estante I2'],
          ['Prednisolona 20mg', 'Prednisolona', 'Tabletas', '20mg', 'CORTICOSTEROIDE', 0, 100, 'tabletas', 25, 200, 8.50, 'Laboratorios Farma', 'Farmacia Principal - Estante I3'],
          ['Dexametasona 4mg/ml', 'Dexametasona', 'Ampolletas', '4mg/ml', 'CORTICOSTEROIDE', 0, 50, 'ampolletas', 15, 100, 12.00, 'Distribuidora Especializada', 'Farmacia Principal - Estante I4'],
          
          // MEDICAMENTOS DE URGENCIAS
          ['Epinefrina 1mg/ml', 'Epinefrina', 'Ampolletas', '1mg/ml', 'VASOPRESOR', 0, 20, 'ampolletas', 8, 40, 35.00, 'Distribuidora Especializada', 'Farmacia - Carro de Emergencias'],
          ['Atropina 1mg/ml', 'Atropina', 'Ampolletas', '1mg/ml', 'ANTICOLINERGICO', 0, 30, 'ampolletas', 10, 60, 18.00, 'Distribuidora Especializada', 'Farmacia - Carro de Emergencias'],
          ['Dopamina 200mg/5ml', 'Dopamina', 'Ampolletas', '200mg/5ml', 'INOTRÓPICO', 0, 25, 'ampolletas', 8, 50, 28.00, 'Distribuidora Especializada', 'Farmacia - Carro de Emergencias'],
          ['Norepinefrina 4mg/4ml', 'Norepinefrina', 'Ampolletas', '4mg/4ml', 'VASOPRESOR', 0, 15, 'ampolletas', 5, 30, 45.00, 'Distribuidora Especializada', 'Farmacia - Carro de Emergencias'],
          
          // MEDICAMENTOS PEDIÁTRICOS
          ['Paracetamol Jarabe 120mg/5ml', 'Paracetamol', 'Jarabe', '120mg/5ml', 'ANALGESICO PEDIATRICO', 0, 40, 'frascos', 12, 80, 25.00, 'Laboratorios Farma', 'Farmacia Pediátrica - Estante P1'],
          ['Amoxicilina Suspensión 250mg/5ml', 'Amoxicilina', 'Suspensión', '250mg/5ml', 'ANTIBIOTICO PEDIATRICO', 0, 30, 'frascos', 10, 60, 35.00, 'Laboratorios Farma', 'Farmacia Pediátrica - Estante P2'],
          ['Ibuprofeno Suspensión 100mg/5ml', 'Ibuprofeno', 'Suspensión', '100mg/5ml', 'AINE PEDIATRICO', 0, 25, 'frascos', 8, 50, 28.00, 'Distribuidora Farmacéutica México', 'Farmacia Pediátrica - Estante P3'],
          
          // ANTIEMÉTICOS Y PROCINÉTICOS
          ['Ondansetrón 4mg', 'Ondansetrón', 'Tabletas', '4mg', 'ANTIEMETICO', 0, 60, 'tabletas', 15, 120, 18.50, 'Distribuidora Especializada', 'Farmacia Principal - Estante J1'],
          ['Metoclopramida 10mg', 'Metoclopramida', 'Tabletas', '10mg', 'PROCINETICO', 0, 100, 'tabletas', 25, 200, 4.20, 'Laboratorios Farma', 'Farmacia Principal - Estante J2'],
          ['Dimenhidrinato 50mg', 'Dimenhidrinato', 'Tabletas', '50mg', 'ANTIEMETICO', 0, 80, 'tabletas', 20, 150, 6.80, 'Distribuidora Farmacéutica México', 'Farmacia Principal - Estante J3']
        ];
        
        let inserted = 0;
        for (const m of meds) {
          try {
            await db.execute(
              `INSERT INTO medication_inventory (
                name, active_ingredient, presentation, concentration, category,
                is_controlled, quantity, unit, min_stock, max_stock, unit_price,
                supplier, location, storage_conditions, status, last_restocked, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8], m[9], m[10], m[11], m[12], 'Temperatura ambiente (15-30°C)', 'active', now, now, now]
            );
            inserted++;
            console.log(`  ✅ Inserted: ${m[0]}`);
          } catch (medError) {
            console.error(`  ❌ Error inserting ${m[0]}:`, medError);
          }
        }
        console.log(`✅ Created ${inserted}/${meds.length} medications in inventory`);
    } else {
        console.log(`ℹ️ Medication inventory already has ${medications[0].count} items, skipping`);
    }
  } catch (e) {
    console.error('⚠️ Error in medication inventory seeding:', e);
  }
  
  // 8. Poblar Tratamientos/Medicaciones (MASIVAMENTE EXPANDIDO)
  try {
    const treatments = await db.select("SELECT count(*) as count FROM treatments");
    if (treatments[0].count === 0) {
        console.log('💊 Seeding Comprehensive Treatments for ALL patients...');
        const pList = await db.select("SELECT id FROM patients ORDER BY id");
        
        if (pList.length > 0) {
          const treatmentData = [];
          
          // Generar tratamientos diversos por especialidad y condición
          for (let i = 0; i < Math.min(pList.length, 50); i++) {
            const patientId = pList[i].id;
            
            // Pacientes de Medicina Interna (primeros 15)
            if (i < 15) {
              if (i === 0) { // Neumonía
                treatmentData.push(
                  [patientId, 'Amoxicilina 500mg', '500mg cada 8 horas', 'Cada 8 horas', '2026-01-05', '2026-01-12', 'Enf. Laura Martínez', '08/01 08:00', 'Dr. Ramírez', 'Activo'],
                  [patientId, 'Paracetamol 500mg', '500mg cada 6 horas', 'Cada 6 horas', '2026-01-05', null, 'Enf. Laura Martínez', '08/01 08:30', 'Dr. Ramírez', 'Activo']
                );
              } else if (i === 1) { // Post-operatorio cardiovascular
                treatmentData.push(
                  [patientId, 'Morfina 10mg', '10mg IV cada 4 horas', 'Cada 4 horas', '2026-01-06', null, 'Enf. Carlos López', '08/01 06:00', 'Dr. González', 'Activo'],
                  [patientId, 'Omeprazol 20mg', '20mg cada 12 horas', 'Cada 12 horas', '2026-01-06', null, 'Enf. Laura Martínez', '08/01 08:00', 'Dr. González', 'Activo'],
                  [patientId, 'Atorvastatina 20mg', '20mg cada 24 horas', 'Diaria', '2026-01-06', null, 'Enf. Laura Martínez', '08/01 20:00', 'Dr. González', 'Activo']
                );
              } else if (i === 2) { // Apendicectomía
                treatmentData.push(
                  [patientId, 'Ibuprofeno 400mg', '400mg cada 8 horas', 'Cada 8 horas', '2026-01-07', '2026-01-10', 'Enf. Ana García', '08/01 09:00', 'Dr. Hernández', 'Activo'],
                  [patientId, 'Cefalexina 500mg', '500mg cada 6 horas', 'Cada 6 horas', '2026-01-07', '2026-01-14', 'Enf. Ana García', '08/01 09:30', 'Dr. Hernández', 'Activo']
                );
              } else if (i === 3) { // Diabetes
                treatmentData.push(
                  [patientId, 'Metformina 850mg', '850mg cada 12 horas', 'Cada 12 horas', '2026-01-06', null, 'Enf. Laura Martínez', '08/01 07:30', 'Dr. Martínez', 'Activo'],
                  [patientId, 'Insulina Glargina', '20 UI subcutánea', 'Diaria nocturna', '2026-01-06', null, 'Enf. Laura Martínez', '08/01 22:00', 'Dr. Martínez', 'Activo'],
                  [patientId, 'Glibenclamida 5mg', '5mg cada 12 horas', 'Cada 12 horas', '2026-01-06', null, 'Enf. Laura Martínez', '08/01 08:00', 'Dr. Martínez', 'Activo']
                );
              } else if (i === 4) { // Infarto
                treatmentData.push(
                  [patientId, 'Losartán 50mg', '50mg cada 24 horas', 'Diaria', '2026-01-07', null, 'Enf. Carlos López', '08/01 08:00', 'Dr. López', 'Activo'],
                  [patientId, 'Aspirina 100mg', '100mg cada 24 horas', 'Diaria', '2026-01-07', null, 'Enf. Carlos López', '08/01 08:30', 'Dr. López', 'Activo'],
                  [patientId, 'Carvedilol 25mg', '12.5mg cada 12 horas', 'Cada 12 horas', '2026-01-07', null, 'Enf. Carlos López', '08/01 09:00', 'Dr. López', 'Activo']
                );
              } else { // Otros pacientes - tratamientos variados
                const commonMeds = [
                  ['Paracetamol 500mg', '500mg cada 8 horas', 'Cada 8 horas'],
                  ['Omeprazol 20mg', '20mg cada 12 horas', 'Cada 12 horas'],
                  ['Loratadina 10mg', '10mg cada 24 horas', 'Diaria']
                ];
                const randomMed = commonMeds[Math.floor(Math.random() * commonMeds.length)];
                treatmentData.push([patientId, randomMed[0], randomMed[1], randomMed[2], '2026-01-06', null, 'Enf. Laura Martínez', '08/01 08:00', 'Dr. Ramírez', 'Activo']);
              }
            }
            
            // Pacientes de UCI/Cardiología (15-29)
            else if (i >= 15 && i < 30) {
              if (i === 15) { // Infarto masivo UCI
                treatmentData.push(
                  [patientId, 'Dopamina 200mg/5ml', '5mcg/kg/min IV continua', 'Continua', '2026-01-06', null, 'Enf. Sandra López', '08/01 06:00', 'Dr. Mendoza', 'Activo'],
                  [patientId, 'Morfina 10mg', '2mg IV cada 2 horas PRN', 'PRN dolor', '2026-01-06', null, 'Enf. Sandra López', '08/01 06:30', 'Dr. Mendoza', 'Activo'],
                  [patientId, 'Heparina 25000UI', '1000UI/h IV continua', 'Continua', '2026-01-06', null, 'Enf. Sandra López', '08/01 07:00', 'Dr. Mendoza', 'Activo']
                );
              } else if (i === 16) { // Choque séptico
                treatmentData.push(
                  [patientId, 'Norepinefrina 4mg/4ml', '0.1mcg/kg/min', 'Continua', '2026-01-05', null, 'Enf. Sandra López', '08/01 05:00', 'Dra. López', 'Activo'],
                  [patientId, 'Ceftriaxona 1g', '1g IV cada 12 horas', 'Cada 12 horas', '2026-01-05', '2026-01-12', 'Enf. Sandra López', '08/01 06:00', 'Dra. López', 'Activo'],
                  [patientId, 'Dexametasona 4mg/ml', '8mg IV cada 8 horas', 'Cada 8 horas', '2026-01-05', '2026-01-09', 'Enf. Sandra López', '08/01 06:30', 'Dra. López', 'Activo']
                );
              } else { // Otros pacientes críticos
                const criticalMeds = [
                  ['Midazolam 5mg/ml', '2-5mg IV PRN', 'PRN agitación'],
                  ['Fentanilo 50mcg/ml', '25mcg IV cada 2h PRN', 'PRN dolor severo'],
                  ['Pantoprazol 40mg', '40mg IV cada 12 horas', 'Cada 12 horas']
                ];
                const randomMed = criticalMeds[Math.floor(Math.random() * criticalMeds.length)];
                treatmentData.push([patientId, randomMed[0], randomMed[1], randomMed[2], '2026-01-06', null, 'Enf. Sandra López', '08/01 08:00', 'Dr. Herrera', 'Activo']);
              }
            }
            
            // Pacientes Pediátricos (30-39)
            else if (i >= 30 && i < 40) {
              const pediatricMeds = [
                ['Paracetamol Jarabe 120mg/5ml', '10ml cada 6 horas', 'Cada 6 horas'],
                ['Amoxicilina Suspensión 250mg/5ml', '5ml cada 8 horas', 'Cada 8 horas'],
                ['Ibuprofeno Suspensión 100mg/5ml', '5ml cada 8 horas', 'Cada 8 horas'],
                ['Salbutamol 100mcg', '2 puffs cada 6 horas', 'Cada 6 horas']
              ];
              const randomMed = pediatricMeds[Math.floor(Math.random() * pediatricMeds.length)];
              treatmentData.push([patientId, randomMed[0], randomMed[1], randomMed[2], '2026-01-06', null, 'Enf. Carmen Rodríguez', '08/01 08:00', 'Dra. Rodríguez', 'Activo']);
            }
            
            // Pacientes Obstétricos (40-49)
            else {
              const obstetricMeds = [
                ['Oxitocina 10UI', '2-10mUI/min IV', 'Según necesidad'],
                ['Metoclopramida 10mg', '10mg IV cada 8 horas', 'Cada 8 horas'],
                ['Sulfato Ferroso 325mg', '1 tableta cada 12 horas', 'Cada 12 horas'],
                ['Ácido Fólico 5mg', '1 tableta diaria', 'Diaria']
              ];
              const randomMed = obstetricMeds[Math.floor(Math.random() * obstetricMeds.length)];
              treatmentData.push([patientId, randomMed[0], randomMed[1], randomMed[2], '2026-01-06', null, 'Enf. Elena Torres', '08/01 08:00', 'Dra. Torres', 'Activo']);
            }
          }
          
          // Insertar todos los tratamientos
          for (const t of treatmentData) {
            await db.execute(
              `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, end_date, applied_by, last_application, responsible_doctor, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              t
            );
          }
          console.log(`✅ Created ${treatmentData.length} comprehensive treatments for multiple specialties`);
        }
    }
  } catch (e) {
    console.warn('⚠️ Error seeding treatments:', e);
  }
  
  // 9. Poblar Notas de Enfermería (MASIVAMENTE EXPANDIDO)
  try {
    const notes = await db.select("SELECT count(*) as count FROM nurse_notes");
    if (notes[0].count === 0) {
        console.log('📝 Seeding Comprehensive Nurse Notes for ALL patients...');
        const pList = await db.select("SELECT id, first_name, last_name, floor, medical_condition FROM patients ORDER BY id");
        
        if (pList.length > 0) {
          const noteData = [];
          const shifts = [
            { time: '06:00', nurse: 'Enf. Laura Martínez' },
            { time: '14:00', nurse: 'Enf. Carlos López' }, 
            { time: '22:00', nurse: 'Enf. Ana García' }
          ];
          
          for (let i = 0; i < Math.min(pList.length, 50); i++) {
            const patient = pList[i];
            const patientName = `${patient.first_name} ${patient.last_name}`;
            
            // Generar notas por día (últimos 3 días) y turno
            for (let day = 0; day < 3; day++) {
              const currentDate = new Date();
              currentDate.setDate(currentDate.getDate() - day);
              const dateStr = currentDate.toLocaleString('es-MX').split(',')[0];
              
              for (const shift of shifts) {
                let noteContent = '';
                let noteType = 'Evolución';
                
                // Notas específicas por piso/especialidad
                if (patient.floor === 'Piso 3 - Medicina Interna') {
                  const internalMedicineNotes = [
                    { note: `Paciente ${patientName} presenta evolución favorable. Signos vitales estables. Refiere disminución del dolor. Continúa con tratamiento farmacológico indicado.`, type: 'Evolución' },
                    { note: `${patientName} - Deambulación asistida realizada sin complicaciones. Ingesta oral adecuada, tolera dieta completa. Educación sobre medicamentos proporcionada.`, type: 'Procedimiento' },
                    { note: `Observación: ${patientName} manifiesta ligero malestar matutino. Aplicados medicamentos según horario. Familiares informados del estado general.`, type: 'Evolución' },
                    { note: `Paciente colaborador. ${patientName} cumple con reposo relativo indicado. Herida quirúrgica sin signos de infección. Curaciones realizadas.`, type: 'Procedimiento' },
                    { note: `Turno tranquilo. ${patientName} descansó adecuadamente. Medicación administrada según prescripción médica. Pendiente evaluación médica matutina.`, type: 'Evolución' }
                  ];
                  const randomNote = internalMedicineNotes[Math.floor(Math.random() * internalMedicineNotes.length)];
                  noteContent = randomNote.note;
                  noteType = randomNote.type;
                }
                
                else if (patient.floor === 'Piso 4 - UCI/Cardiología') {
                  const ucuNotes = [
                    { note: `UCI: ${patientName} - Paciente crítico estable. Monitorización continua. Parámetros hemodinámicos dentro de rangos aceptables. Familia informada.`, type: 'Evolución' },
                    { note: `${patientName} - Soporte ventilatorio mecánico 40%. Gasometría arterial dentro de parámetros. Sedación controlada. Cuidados intensivos continuos.`, type: 'Procedimiento' },
                    { note: `Cardiología: ${patientName} presenta ritmo sinusal regular. Medicación vasoactiva ajustada según indicaciones médicas. Familiar acompañante presente.`, type: 'Evolución' },
                    { note: `Paciente ${patientName} - Despertar neurológico adecuado. Responde a estímulos verbales. Bomba de infusión funcionando correctamente.`, type: 'Evolución' },
                    { note: `UCI: ${patientName} - Balance hídrico negativo 200ml. Diuresis espontánea. Monitoreo cardíaco continuo. Pronóstico reservado pero estable.`, type: 'Procedimiento' }
                  ];
                  const randomNote = ucuNotes[Math.floor(Math.random() * ucuNotes.length)];
                  noteContent = randomNote.note;
                  noteType = randomNote.type;
                }
                
                else if (patient.floor === 'Piso 2 - Pediatría') {
                  const pediatricNotes = [
                    { note: `Pediatría: ${patientName} - Menor tranquilo acompañado de madre. Ingesta de alimentos adecuada para la edad. Temperatura corporal normal.`, type: 'Evolución' },
                    { note: `${patientName} - Actividad lúdica supervisada realizada. Medicamentos administrados con colaboración. Familiar instruido sobre cuidados.`, type: 'Procedimiento' },
                    { note: `Menor ${patientName} - Sueño reparador durante turno nocturno. Signos vitales apropiados para grupo etario. Control pediátrico pendiente.`, type: 'Evolución' },
                    { note: `${patientName} - Hidratación oral exitosa. Menor activo y reactivo. Educación a familiares sobre administración de medicamentos en casa.`, type: 'Procedimiento' },
                    { note: `Pediatría: ${patientName} - Evolución clínica satisfactoria. Menor colabora con procedimientos. Apoyo emocional brindado a familia.`, type: 'Evolución' }
                  ];
                  const randomNote = pediatricNotes[Math.floor(Math.random() * pediatricNotes.length)];
                  noteContent = randomNote.note;
                  noteType = randomNote.type;
                }
                
                else if (patient.floor === 'Piso 2 - Ginecología') {
                  const gynecologyNotes = [
                    { note: `Ginecología: ${patientName} - Postoperatorio inmediato sin complicaciones. Sangrado vaginal escaso esperado. Dolor controlado con analgesia.`, type: 'Evolución' },
                    { note: `${patientName} - Deambulación temprana realizada exitosamente. Catéter vesical retirado. Micción espontánea presente.`, type: 'Procedimiento' },
                    { note: `Paciente ${patientName} - Revisión de suturas sin signos de dehiscencia. Orientada en tiempo y espacio. Familiar acompañante presente.`, type: 'Evolución' },
                    { note: `${patientName} - Ingesta oral reiniciada progresivamente. Tolera líquidos y dieta blanda. Medicación para el dolor efectiva.`, type: 'Evolución' },
                    { note: `Ginecología: ${patientName} - Control puerperal satisfactorio. Loquios normales. Lactancia materna establecida exitosamente.`, type: 'Procedimiento' }
                  ];
                  const randomNote = gynecologyNotes[Math.floor(Math.random() * gynecologyNotes.length)];
                  noteContent = randomNote.note;
                  noteType = randomNote.type;
                }
                
                noteData.push([
                  patient.id,
                  dateStr,
                  noteContent,
                  noteType,
                  shift.nurse
                ]);
              }
            }
          }
          
          // Insertar todas las notas
          for (const n of noteData) {
            await db.execute(
              `INSERT INTO nurse_notes (patient_id, date, note, note_type, nurse_name)
               VALUES (?, ?, ?, ?, ?)`,
              n
            );
          }
          console.log(`✅ Created ${noteData.length} comprehensive nurse notes across all specialties and shifts`);
        }
    }
  } catch (e) {
    console.warn('⚠️ Error seeding nurse notes:', e);
  }
  
  // 10. Poblar Citas Médicas (MASIVAMENTE EXPANDIDO)
  try {
    const appointments = await db.select("SELECT count(*) as count FROM appointments");
    if (appointments[0].count === 0) {
        console.log('📅 Seeding Comprehensive Medical Appointments for ALL patients...');
        const pList = await db.select("SELECT id, first_name, last_name, medical_condition, floor FROM patients ORDER BY id");
        
        if (pList.length > 0) {
          const appointmentData = [];
          const doctors = [
            'Dr. Ramírez Moreno', 'Dr. González Herrera', 'Dr. Hernández López', 'Dra. Martínez Silva',
            'Dr. López Fernández', 'Dra. García Ruiz', 'Dr. Torres Mendoza', 'Dra. Rodríguez Vargas',
            'Dr. Mendoza Castro', 'Dra. López Jiménez', 'Dr. Herrera Valdés', 'Dra. Torres Sánchez'
          ];
          
          const specialties = [
            'Medicina Interna', 'Cardiología', 'Gastroenterología', 'Neumología', 'Endocrinología',
            'Neurología', 'Pediatría', 'Ginecología', 'Obstetricia', 'Cirugía General',
            'Traumatología', 'Oncología', 'Dermatología', 'Urología', 'Oftalmología'
          ];
          
          // Tipos de citas por especialidad
          const appointmentTypes = {
            'Medicina Interna': ['Control general', 'Seguimiento', 'Consulta inicial', 'Revisión de laboratorios'],
            'Cardiología': ['Ecocardiograma', 'Control post-infarto', 'Holter 24h', 'Consulta hipertensión'],
            'Gastroenterología': ['Endoscopia', 'Control gastritis', 'Colonoscopia', 'Consulta digestiva'],
            'Neumología': ['Espirometría', 'Control asma', 'Consulta EPOC', 'Radiografía tórax'],
            'Endocrinología': ['Control diabetes', 'Consulta tiroides', 'Metabolismo', 'Control hormonal'],
            'Neurología': ['Electroencefalograma', 'Control epilepsia', 'Consulta cefaleas', 'TAC cerebral'],
            'Pediatría': ['Control niño sano', 'Vacunación', 'Consulta pediatrica', 'Control crecimiento'],
            'Ginecología': ['Papanicolaou', 'Control prenatal', 'Ecografía pélvica', 'Consulta ginecológica'],
            'Obstetricia': ['Control prenatal', 'Ecografía obstétrica', 'Control post-parto', 'Consulta embarazo'],
            'Cirugía General': ['Consulta pre-operatoria', 'Control post-operatorio', 'Evaluación quirúrgica', 'Seguimiento'],
            'Traumatología': ['Control fractura', 'Fisioterapia', 'Radiografía control', 'Consulta ortopedia'],
            'Oncología': ['Quimioterapia', 'Control oncológico', 'TAC control', 'Consulta oncología'],
            'Dermatología': ['Consulta dermatológica', 'Control lesiones', 'Biopsia', 'Seguimiento'],
            'Urología': ['Consulta urológica', 'Ecografía renal', 'Control próstata', 'Cistoscopia'],
            'Oftalmología': ['Consulta oftalmológica', 'Control glaucoma', 'Fondo de ojo', 'Graduación']
          };
          
          for (let i = 0; i < Math.min(pList.length, 50); i++) {
            const patient = pList[i];
            const patientName = `${patient.first_name} ${patient.last_name}`;
            
            // Generar 2-4 citas por paciente
            const numAppointments = Math.floor(Math.random() * 3) + 2;
            
            for (let j = 0; j < numAppointments; j++) {
              // Fechas futuras (próximos 30 días)
              const futureDate = new Date();
              futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
              const dateStr = futureDate.toISOString().split('T')[0];
              
              // Horarios realistas
              const hours = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
              const randomHour = hours[Math.floor(Math.random() * hours.length)];
              
              // Especialidad basada en condición médica
              let specialty = specialties[Math.floor(Math.random() * specialties.length)];
              if (patient.floor === 'Piso 4 - UCI/Cardiología' || patient.medical_condition?.includes('Cardíaco')) {
                specialty = 'Cardiología';
              } else if (patient.floor === 'Piso 2 - Pediatría') {
                specialty = 'Pediatría';
              } else if (patient.floor === 'Piso 2 - Ginecología') {
                specialty = Math.random() > 0.5 ? 'Ginecología' : 'Obstetricia';
              } else if (patient.medical_condition?.includes('Diabetes')) {
                specialty = 'Endocrinología';
              }
              
              // Tipo de cita específico
              const appointmentTypesForSpecialty = appointmentTypes[specialty] || ['Consulta general'];
              const randomType = appointmentTypesForSpecialty[Math.floor(Math.random() * appointmentTypesForSpecialty.length)];
              
              appointmentData.push([
                patient.id,
                patientName,
                dateStr,
                randomHour,
                `${specialty} - ${randomType}`,
                Math.random() > 0.2 ? 'Programada' : 'Pendiente',
                doctors[Math.floor(Math.random() * doctors.length)]
              ]);
            }
          }
          
          // Insertar todas las citas
          for (const a of appointmentData) {
            await db.execute(
              `INSERT INTO appointments (patient_id, patient_name, date, time, type, status, doctor)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              a
            );
          }
          console.log(`✅ Created ${appointmentData.length} comprehensive medical appointments across all specialties`);
        }
    }
  } catch (e) {
    console.warn('⚠️ Error seeding appointments:', e);
  }

  // 11. Poblar Historial Médico (NUEVO - Para gráficas y tendencias)
  try {
    const medicalHistory = await db.select("SELECT count(*) as count FROM medical_history");
    if (medicalHistory[0].count === 0) {
        console.log('📋 Seeding Comprehensive Medical History for ALL patients...');
        const pList = await db.select("SELECT id, first_name, last_name, medical_condition, floor FROM patients ORDER BY id");
        
        if (pList.length > 0) {
          const historyData = [];
          const doctors = [
            'Dr. Ramírez Moreno', 'Dr. González Herrera', 'Dr. Hernández López', 'Dra. Martínez Silva',
            'Dr. López Fernández', 'Dra. García Ruiz', 'Dr. Torres Mendoza', 'Dra. Rodríguez Vargas'
          ];
          
          for (let i = 0; i < Math.min(pList.length, 50); i++) {
            const patient = pList[i];
            const patientName = `${patient.first_name} ${patient.last_name}`;
            
            // Generar 2-5 registros históricos por paciente (últimos 6 meses)
            const numRecords = Math.floor(Math.random() * 4) + 2;
            
            for (let j = 0; j < numRecords; j++) {
              const daysAgo = Math.floor(Math.random() * 180) + (j * 30); // Distribuir en 6 meses
              const recordDate = new Date();
              recordDate.setDate(recordDate.getDate() - daysAgo);
              const dateStr = recordDate.toISOString().split('T')[0];
              
              let diagnosis = '';
              let treatment = '';
              let notes = '';
              
              // Diagnósticos y tratamientos basados en la especialidad
              if (patient.floor === 'Piso 3 - Medicina Interna') {
                const conditions = [
                  { dx: 'Neumonía adquirida en comunidad', tx: 'Amoxicilina 500mg cada 8h por 10 días', note: 'Evolución favorable, radiografía de control en 1 semana' },
                  { dx: 'Hipertensión arterial esencial', tx: 'Losartán 50mg cada 24h, restricción de sodio', note: 'Control mensual de presión arterial, objetivo <130/80 mmHg' },
                  { dx: 'Diabetes Mellitus tipo 2', tx: 'Metformina 850mg cada 12h, dieta 1800 kcal', note: 'HbA1c 7.2%, control cada 3 meses' },
                  { dx: 'Gastritis crónica', tx: 'Omeprazol 20mg cada 12h antes de alimentos', note: 'Evitar irritantes gástricos, valorar endoscopia' }
                ];
                const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                diagnosis = randomCondition.dx;
                treatment = randomCondition.tx;
                notes = randomCondition.note;
              }
              
              else if (patient.floor === 'Piso 4 - UCI/Cardiología') {
                const conditions = [
                  { dx: 'Infarto agudo de miocardio STEMI', tx: 'Aspirina 100mg, Clopidogrel 75mg, Atorvastatina 80mg, Metoprolol', note: 'Cateterismo realizado, stent colocado en arteria descendente anterior, UCE por 72h' },
                  { dx: 'Insuficiencia cardíaca congestiva', tx: 'Furosemida 40mg, Enalapril 10mg, Carvedilol 6.25mg', note: 'Fracción de eyección 35%, restricción de líquidos 1.5L/día' },
                  { dx: 'Choque séptico de origen pulmonar', tx: 'Ceftriaxona 2g IV cada 12h, Norepinefrina en infusión continua', note: 'Cultivos tomados, soporte ventilatorio mecánico, pronóstico reservado' },
                  { dx: 'Arritmia cardíaca - Fibrilación auricular', tx: 'Amiodarona 200mg cada 12h, Anticoagulación con Warfarina', note: 'Control de INR semanal, objetivo 2-3' }
                ];
                const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                diagnosis = randomCondition.dx;
                treatment = randomCondition.tx;
                notes = randomCondition.note;
              }
              
              else if (patient.floor === 'Piso 2 - Pediatría') {
                const conditions = [
                  { dx: 'Bronquiolitis viral', tx: 'Salbutamol nebulizaciones cada 4h, hidratación oral', note: 'Saturación de oxígeno >92%, vigilar signos de dificultad respiratoria' },
                  { dx: 'Gastroenteritis aguda', tx: 'Vida Suero Oral, probióticos, dieta astringente', note: 'Tolerando vía oral, hidratación adecuada' },
                  { dx: 'Faringitis estreptocócica', tx: 'Penicilina V 250mg cada 8h por 10 días', note: 'Cultivo positivo para Streptococcus beta hemolítico grupo A' },
                  { dx: 'Otitis media aguda', tx: 'Amoxicilina suspensión 125mg cada 8h por 7 días', note: 'Membrana timpánica hiperémica, control en 48h' }
                ];
                const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                diagnosis = randomCondition.dx;
                treatment = randomCondition.tx;
                notes = randomCondition.note;
              }
              
              else if (patient.floor === 'Piso 2 - Ginecología') {
                const conditions = [
                  { dx: 'Postoperatorio de cesárea segmentaria', tx: 'Ketorolaco 30mg IV cada 8h, profilaxis antibiótica', note: 'Herida quirúrgica limpia, involución uterina adecuada' },
                  { dx: 'Amenaza de aborto', tx: 'Reposo absoluto, Progesterona 200mg cada 12h', note: 'Ultrasonido con embrión vivo, FCF 140 lpm' },
                  { dx: 'Preeclampsia leve', tx: 'Alfametildopa 250mg cada 8h, vigilancia de TA', note: 'TA 145/90, proteinuria +, control obstétrico estrecho' },
                  { dx: 'Miomatosis uterina', tx: 'Ácido tranexámico, valoración quirúrgica', note: 'Mioma intramural de 6cm, anemia leve secundaria' }
                ];
                const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
                diagnosis = randomCondition.dx;
                treatment = randomCondition.tx;
                notes = randomCondition.note;
              }
              
              else {
                diagnosis = 'Consulta de valoración general';
                treatment = 'Manejo expectante, observación';
                notes = 'Paciente estable, continuar vigilancia';
              }
              
              historyData.push([
                patient.id,
                dateStr,
                diagnosis,
                treatment,
                notes,
                doctors[Math.floor(Math.random() * doctors.length)]
              ]);
            }
          }
          
          // Insertar todos los registros históricos
          for (const h of historyData) {
            await db.execute(
              `INSERT INTO medical_history (patient_id, date, diagnosis, treatment, notes, doctor)
               VALUES (?, ?, ?, ?, ?, ?)`,
              h
            );
          }
          console.log(`✅ Created ${historyData.length} comprehensive medical history records`);
        }
    }
  } catch (e) {
    console.warn('⚠️ Error seeding medical history:', e);
  }

  // 12. Poblar Pruebas de Laboratorio (NUEVO - Para historial clínico)
  try {
    const labTests = await db.select("SELECT count(*) as count FROM lab_tests");
    if (labTests[0].count === 0) {
        console.log('🔬 Seeding Comprehensive Lab Tests for patients...');
        const pList = await db.select("SELECT id, first_name, last_name, floor FROM patients ORDER BY id");
        
        if (pList.length > 0) {
          const labData = [];
          const doctors = ['Dr. Ramírez', 'Dr. González', 'Dra. Martínez', 'Dr. López'];
          
          const labTestsTypes = [
            { name: 'Biometría Hemática Completa', results: 'Hb: 14.2 g/dL, Leucocitos: 7,500/mm³, Plaquetas: 250,000/mm³' },
            { name: 'Química Sanguínea (Glucosa, Urea, Creatinina)', results: 'Glucosa: 95 mg/dL, Urea: 32 mg/dL, Creatinina: 0.9 mg/dL' },
            { name: 'Perfil Lipídico', results: 'Colesterol Total: 180 mg/dL, HDL: 45 mg/dL, LDL: 110 mg/dL, TG: 125 mg/dL' },
            { name: 'Pruebas de Función Hepática', results: 'AST: 25 U/L, ALT: 28 U/L, Bilirrubina Total: 0.8 mg/dL' },
            { name: 'Electrolitos Séricos', results: 'Na: 140 mEq/L, K: 4.2 mEq/L, Cl: 102 mEq/L' },
            { name: 'Gasometría Arterial', results: 'pH: 7.38, PO2: 95 mmHg, PCO2: 40 mmHg, HCO3: 24 mEq/L' },
            { name: 'Examen General de Orina', results: 'Aspecto claro, pH: 6.0, Densidad: 1.020, Leucocitos: 2-4/campo' },
            { name: 'Cultivo de Sangre', results: 'Negativo para crecimiento bacteriano a 72h' },
            { name: 'Rayos X de Tórax PA y Lateral', results: 'Silueta cardíaca normal, campos pulmonares sin infiltrados' },
            { name: 'Electrocardiograma de 12 derivaciones', results: 'Ritmo sinusal regular, FC: 75 lpm, sin alteraciones del ST-T' }
          ];
          
          for (let i = 0; i < Math.min(pList.length, 50); i++) {
            const patient = pList[i];
            
            // Cada paciente tiene 2-4 pruebas de laboratorio
            const numTests = Math.floor(Math.random() * 3) + 2;
            
            for (let j = 0; j < numTests; j++) {
              const daysAgo = Math.floor(Math.random() * 30) + (j * 7);
              const testDate = new Date();
              testDate.setDate(testDate.getDate() - daysAgo);
              const dateStr = testDate.toISOString().split('T')[0];
              
              const randomTest = labTestsTypes[Math.floor(Math.random() * labTestsTypes.length)];
              const status = daysAgo > 3 ? 'Completado' : (daysAgo > 1 ? 'En Proceso' : 'Pendiente');
              const results = status === 'Completado' ? randomTest.results : null;
              
              labData.push([
                patient.id,
                randomTest.name,
                dateStr,
                status,
                results,
                doctors[Math.floor(Math.random() * doctors.length)]
              ]);
            }
          }
          
          // Insertar todas las pruebas
          for (const l of labData) {
            await db.execute(
              `INSERT INTO lab_tests (patient_id, test, date, status, results, ordered_by)
               VALUES (?, ?, ?, ?, ?, ?)`,
              l
            );
          }
          console.log(`✅ Created ${labData.length} lab test records`);
        }
    }
  } catch (e) {
    console.warn('⚠️ Error seeding lab tests:', e);
  }

  // 13. Poblar Tratamientos No Farmacológicos (NUEVO - Para notas editables)
  try {
    const nonPharmaTreatments = await db.select("SELECT count(*) as count FROM non_pharmacological_treatments");
    if (nonPharmaTreatments[0].count === 0) {
        console.log('🩹 Seeding Non-Pharmacological Treatments...');
        const pList = await db.select("SELECT id, first_name, last_name, floor FROM patients ORDER BY id");
        
        if (pList.length > 0) {
          const treatmentData = [];
          const nurses = ['Enf. Laura Martínez', 'Enf. Carlos López', 'Enf. Ana García', 'Enf. Sandra López'];
          
          const treatmentTypes = [
            { type: 'Curación', desc: 'Curación de herida quirúrgica', materials: 'Gasas estériles, solución salina, apósito adhesivo', outcome: 'Herida limpia sin signos de infección' },
            { type: 'Nebulización', desc: 'Nebulización con salbutamol', materials: 'Salbutamol 2.5mg, nebulizador, mascarilla', outcome: 'Mejoría de la saturación, disminución de sibilancias' },
            { type: 'Aspiración de secreciones', desc: 'Aspiración de secreciones orotraqueales', materials: 'Sonda de aspiración No. 12, guantes estériles', outcome: 'Vía aérea permeable, saturación >94%' },
            { type: 'Cambio de posición', desc: 'Movilización y cambio postural', materials: 'Almohadas, cojines antiescaras', outcome: 'Prevención de úlceras por presión' },
            { type: 'Fisioterapia respiratoria', desc: 'Ejercicios respiratorios y espirometría incentiva', materials: 'Espirómetro incentivo', outcome: 'Expansión pulmonar adecuada' },
            { type: 'Fluidoterapia', desc: 'Administración de solución Hartmann 1000ml', materials: 'Solución Hartmann, equipo de venoclisis', outcome: 'Hidratación adecuada, diuresis presente' },
            { type: 'Curación de úlcera por presión', desc: 'Curación de UPP grado II en región sacra', materials: 'Hidrocoloide, solución salina, gasas', outcome: 'Tejido de granulación presente, disminución del tamaño' },
            { type: 'Baño de esponja', desc: 'Baño en cama con agua tibia', materials: 'Toallas, agua tibia, jabón neutro', outcome: 'Paciente aseado, piel íntegra' }
          ];
          
          for (let i = 0; i < Math.min(pList.length, 30); i++) {
            const patient = pList[i];
            
            // Algunos pacientes tienen 1-3 tratamientos no farmacológicos
            const numTreatments = Math.floor(Math.random() * 3) + 1;
            
            for (let j = 0; j < numTreatments; j++) {
              const daysAgo = Math.floor(Math.random() * 7);
              const treatmentDate = new Date();
              treatmentDate.setDate(treatmentDate.getDate() - daysAgo);
              const dateStr = treatmentDate.toISOString().split('T')[0];
              const timeStr = `${8 + Math.floor(Math.random() * 12)}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
              
              const randomTreatment = treatmentTypes[Math.floor(Math.random() * treatmentTypes.length)];
              
              treatmentData.push([
                patient.id,
                randomTreatment.type,
                randomTreatment.desc,
                dateStr,
                timeStr,
                `${Math.floor(Math.random() * 45) + 15} minutos`,
                nurses[Math.floor(Math.random() * nurses.length)],
                randomTreatment.materials,
                `Paciente ${patient.first_name} ${patient.last_name} - Procedimiento realizado sin complicaciones`,
                randomTreatment.outcome,
                daysAgo === 0 ? 'Programar para mañana' : null,
                'Completado'
              ]);
            }
          }
          
          // Insertar todos los tratamientos
          for (const t of treatmentData) {
            await db.execute(
              `INSERT INTO non_pharmacological_treatments 
               (patient_id, treatment_type, description, application_date, application_time, duration, 
                performed_by, materials_used, observations, outcome, next_application, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              t
            );
          }
          console.log(`✅ Created ${treatmentData.length} non-pharmacological treatment records`);
        }
    }
  } catch (e) {
    console.warn('⚠️ Error seeding non-pharmacological treatments:', e);
  }
}

// ========== FUNCIONES DE LECTURA (READ) ==========

export async function getUserByCedula(cedula) {
  const db = await initDatabase();
  // Busca por cédula O por nombre de usuario
  const result = await db.select(
    'SELECT * FROM users WHERE license_number = ? OR username = ?', 
    [cedula, cedula]
  );
  return result.length > 0 ? result[0] : null;
}

/**
 * Obtiene pacientes con filtrado opcional por enfermero
 * @param {Object} options - Opciones de filtrado
 * @param {number} options.nurseId - ID del enfermero (si es enfermero)
 * @param {string} options.role - Rol del usuario ('admin', 'nurse', 'patient')
 * @param {string} options.shift - Turno actual ('Matutino', 'Vespertino', 'Nocturno')
 * @returns {Promise<Array>} Lista de pacientes
 */
export async function getPatients(options = {}) {
  const db = await initDatabase();
  
  // Si es admin, ver todos los pacientes
  if (options.role === 'admin') {
    return await db.select('SELECT * FROM patients ORDER BY id DESC');
  }
  
  // Si es enfermero, solo ver pacientes asignados a su turno
  if (options.role === 'nurse' && options.nurseId) {
    const query = `
      SELECT DISTINCT p.* 
      FROM patients p
      INNER JOIN patient_assignments pa ON p.id = pa.patient_id
      WHERE pa.nurse_id = ? 
        AND pa.status = 'Active'
        ${options.shift ? "AND pa.shift_type = ?" : ""}
      ORDER BY p.id DESC
    `;
    
    const params = options.shift 
      ? [options.nurseId, options.shift] 
      : [options.nurseId];
    
    return await db.select(query, params);
  }
  
  // Por defecto, devolver todos
  return await db.select('SELECT * FROM patients ORDER BY id DESC');
}

/**
 * Asigna un paciente a un enfermero para un turno específico
 * @param {number} nurseId - ID del enfermero
 * @param {number} patientId - ID del paciente
 * @param {string} shiftType - Tipo de turno ('Matutino', 'Vespertino', 'Nocturno')
 * @param {string} notes - Notas adicionales
 */
export async function assignPatientToNurse(nurseId, patientId, shiftType, notes = '') {
  const db = await initDatabase();
  const today = new Date().toLocaleDateString('es-MX');
  
  // Verificar si ya existe asignación activa
  const existing = await db.select(
    'SELECT * FROM patient_assignments WHERE nurse_id = ? AND patient_id = ? AND shift_type = ? AND status = "Active"',
    [nurseId, patientId, shiftType]
  );
  
  if (existing.length > 0) {
    console.log('Asignación ya existe');
    return existing[0];
  }
  
  await db.execute(
    `INSERT INTO patient_assignments (nurse_id, patient_id, assignment_date, shift_type, status, notes)
     VALUES (?, ?, ?, ?, 'Active', ?)`,
    [nurseId, patientId, today, shiftType, notes]
  );
  
  console.log(`✅ Paciente ${patientId} asignado a enfermero ${nurseId} para turno ${shiftType}`);
}

/**
 * Obtiene las asignaciones de un enfermero
 * @param {number} nurseId - ID del enfermero
 * @param {string} shiftType - Tipo de turno (opcional)
 */
export async function getNurseAssignments(nurseId, shiftType = null) {
  const db = await initDatabase();
  
  const query = shiftType
    ? 'SELECT pa.*, p.name, p.room, p.condition FROM patient_assignments pa INNER JOIN patients p ON pa.patient_id = p.id WHERE pa.nurse_id = ? AND pa.shift_type = ? AND pa.status = "Active"'
    : 'SELECT pa.*, p.name, p.room, p.condition FROM patient_assignments pa INNER JOIN patients p ON pa.patient_id = p.id WHERE pa.nurse_id = ? AND pa.status = "Active"';
  
  const params = shiftType ? [nurseId, shiftType] : [nurseId];
  
  return await db.select(query, params);
}

/**
 * Obtiene todas las habitaciones
 * @param {string} status - Filtrar por estado (opcional: 'Available', 'Occupied', 'Maintenance')
 */
export async function getRooms(status = null) {
  const db = await initDatabase();
  
  if (status) {
    return await db.select('SELECT * FROM rooms WHERE status = ? ORDER BY floor, room_number', [status]);
  }
  
  return await db.select('SELECT * FROM rooms ORDER BY floor, room_number');
}

/**
 * Verifica si una habitación tiene camas disponibles
 * @param {string} roomNumber - Número de habitación
 * @returns {Promise<Object>} { available: boolean, room: Object, freeSpots: number }
 */
export async function checkRoomAvailability(roomNumber) {
  const db = await initDatabase();
  
  const rooms = await db.select('SELECT * FROM rooms WHERE room_number = ?', [roomNumber]);
  
  if (rooms.length === 0) {
    return { 
      available: false, 
      room: null, 
      freeSpots: 0,
      error: 'Habitación no encontrada' 
    };
  }
  
  const room = rooms[0];
  const freeSpots = room.bed_count - room.occupied_beds;
  
  return {
    available: freeSpots > 0 && room.status === 'Available',
    room: room,
    freeSpots: freeSpots,
    error: null
  };
}

/**
 * Asigna un paciente a una habitación (ocupa una cama)
 * @param {number} patientId - ID del paciente
 * @param {string} roomNumber - Número de habitación
 * @throws {Error} Si la habitación no tiene camas disponibles
 */
export async function assignPatientToRoom(patientId, roomNumber) {
  const db = await initDatabase();
  
  // Verificar disponibilidad
  const availability = await checkRoomAvailability(roomNumber);
  
  if (!availability.available) {
    throw new Error(
      `❌ CAMA NO DISPONIBLE: ${availability.error || 'La habitación ' + roomNumber + ' no tiene camas libres'}. ` +
      `Camas ocupadas: ${availability.room?.occupied_beds || 0}/${availability.room?.bed_count || 0}`
    );
  }
  
  // Actualizar el campo room del paciente
  await db.execute(
    'UPDATE patients SET room = ? WHERE id = ?',
    [roomNumber, patientId]
  );
  
  // Incrementar camas ocupadas
  await db.execute(
    'UPDATE rooms SET occupied_beds = occupied_beds + 1 WHERE room_number = ?',
    [roomNumber]
  );
  
  // Si todas las camas están ocupadas, cambiar estado
  const updatedRoom = await db.select('SELECT * FROM rooms WHERE room_number = ?', [roomNumber]);
  if (updatedRoom[0].occupied_beds >= updatedRoom[0].bed_count) {
    await db.execute(
      'UPDATE rooms SET status = "Occupied" WHERE room_number = ?',
      [roomNumber]
    );
  }
  
  console.log(`✅ Paciente ${patientId} asignado a habitación ${roomNumber}`);
}

/**
 * Libera una cama cuando un paciente es dado de alta o transferido
 * @param {string} roomNumber - Número de habitación
 */
export async function releaseRoomBed(roomNumber) {
  const db = await initDatabase();
  
  const rooms = await db.select('SELECT * FROM rooms WHERE room_number = ?', [roomNumber]);
  
  if (rooms.length === 0) {
    console.warn('⚠️ Habitación no encontrada:', roomNumber);
    return;
  }
  
  // Decrementar camas ocupadas
  await db.execute(
    'UPDATE rooms SET occupied_beds = CASE WHEN occupied_beds > 0 THEN occupied_beds - 1 ELSE 0 END WHERE room_number = ?',
    [roomNumber]
  );
  
  // Si hay camas libres, cambiar estado a Available
  const updatedRoom = await db.select('SELECT * FROM rooms WHERE room_number = ?', [roomNumber]);
  if (updatedRoom[0].occupied_beds < updatedRoom[0].bed_count) {
    await db.execute(
      'UPDATE rooms SET status = "Available" WHERE room_number = ?',
      [roomNumber]
    );
  }
  
  console.log(`✅ Cama liberada en habitación ${roomNumber}`);
}

export async function getVitalSigns() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM vital_signs ORDER BY date ASC');
}

export async function getTreatments() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM treatments ORDER BY id DESC');
}

export async function getNurseNotes() {
  const db = await initDatabase();
  const notes = await db.select(`
    SELECT 
      n.*, 
      n.nurse_name as nurseName,
      p.name as patient_name,
      p.room as patient_room
    FROM nurse_notes n
    LEFT JOIN patients p ON n.patient_id = p.id
    ORDER BY n.created_at DESC
  `);
  
  // Agregar información de editabilidad
  const { checkEditTimeLimit } = await import('../utils/editTimeValidation.js');
  
  return notes.map(note => ({
    ...note,
    editStatus: checkEditTimeLimit(note.created_at)
  }));
}

export async function getAppointments() {
    const db = await initDatabase();
    return await db.select('SELECT * FROM appointments ORDER BY date DESC');
}

export async function getLoginAttempts(username) {
    const db = await initDatabase();
    return await db.select(
        `SELECT * FROM login_attempts WHERE username = ? ORDER BY timestamp DESC LIMIT 10`,
        [username]
    );
}

// ========== FUNCIONES DE ESCRITURA (WRITE) ==========

export async function addVitalSignsDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO vital_signs (patient_id, date, temperature, blood_pressure, heart_rate, respiratory_rate, registered_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.patient_id, data.date, data.temperature, data.blood_pressure, data.heart_rate, data.respiratory_rate, data.registered_by]
    );
    return await getVitalSigns();
}

export async function addTreatmentDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO treatments (patient_id, medication, dose, frequency, start_date, applied_by, last_application, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [data.patientId, data.medication, data.dose, data.frequency, data.startDate, data.appliedBy, data.lastApplication, 'Activo', data.notes]
    );
    return await getTreatments();
}

export async function addNurseNoteDB(data) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO nurse_notes (patient_id, date, note, nurse_name, note_type)
         VALUES (?, ?, ?, ?, ?)`,
        [data.patientId, data.date, data.note, data.nurseName, 'Evolución']
    );
    return await getNurseNotes();
}

/**
 * Actualiza una nota de enfermería con validación de tiempo (24h)
 * @param {number} noteId - ID de la nota
 * @param {Object} updateData - Datos a actualizar
 * @throws {Error} Si la nota no es editable por tiempo
 */
export async function updateNurseNote(noteId, updateData) {
  const db = await initDatabase();
  
  // Obtener la nota actual
  const currentNote = await db.select(
    'SELECT * FROM nurse_notes WHERE id = ?',
    [noteId]
  );
  
  if (currentNote.length === 0) {
    throw new Error('❌ Nota no encontrada');
  }
  
  // Validar tiempo de edición
  const { validateEditOperation } = await import('../utils/editTimeValidation.js');
  validateEditOperation(currentNote[0].created_at, 'edit');
  
  // Actualizar nota
  await db.execute(
    `UPDATE nurse_notes 
     SET note = ?, note_type = ?, date = ?
     WHERE id = ?`,
    [
      updateData.note || currentNote[0].note,
      updateData.note_type || currentNote[0].note_type,
      updateData.date || currentNote[0].date,
      noteId
    ]
  );
  
  console.log(`✅ Nota ${noteId} actualizada dentro del período de edición`);
  return await getNurseNotes();
}

/**
 * Elimina una nota de enfermería con validación de tiempo (24h)
 * @param {number} noteId - ID de la nota
 * @throws {Error} Si la nota no es editable por tiempo
 */
export async function deleteNurseNote(noteId) {
  const db = await initDatabase();
  
  // Obtener la nota actual
  const currentNote = await db.select(
    'SELECT * FROM nurse_notes WHERE id = ?',
    [noteId]
  );
  
  if (currentNote.length === 0) {
    throw new Error('❌ Nota no encontrada');
  }
  
  // Validar tiempo de edición
  const { validateEditOperation } = await import('../utils/editTimeValidation.js');
  validateEditOperation(currentNote[0].created_at, 'delete');
  
  // NOTA: Esta función podría estar bloqueada por triggers NOM-004
  // pero permitimos la eliminación dentro de 24h como excepción
  await db.execute(
    'DELETE FROM nurse_notes WHERE id = ?',
    [noteId]
  );
  
  console.log(`✅ Nota ${noteId} eliminada dentro del período de edición`);
  return await getNurseNotes();
}

/**
 * Obtiene una nota específica con estado de editabilidad
 * @param {number} noteId - ID de la nota
 */
export async function getNurseNoteById(noteId) {
  const db = await initDatabase();
  
  const notes = await db.select(
    'SELECT *, nurse_name as nurseName FROM nurse_notes WHERE id = ?',
    [noteId]
  );
  
  if (notes.length === 0) {
    return null;
  }
  
  const { checkEditTimeLimit } = await import('../utils/editTimeValidation.js');
  const note = notes[0];
  
  return {
    ...note,
    editStatus: checkEditTimeLimit(note.created_at)
  };
}

/**
 * Actualiza el estado de un paciente
 * 
 * IMPORTANTE: Esta función SOLO permite actualizar el campo 'condition'
 * El triaje (triage_level) NO puede ser modificado después del registro inicial
 * Los enfermeros NO tienen permiso para modificar el triaje de los pacientes
 * 
 * @param {number} id - ID del paciente
 * @param {Object} data - Datos a actualizar (solo se usa data.condition)
 * @returns {Promise<Array>} Lista actualizada de pacientes
 */
export async function updatePatientDB(id, data) {
    const db = await initDatabase();
    
    // SOLO se permite actualizar el campo 'condition'
    // El triaje está protegido y no se puede modificar
    await db.execute(
        `UPDATE patients SET condition = ? WHERE id = ?`,
        [data.condition, id]
    );
    return await getPatients();
}

/**
 * Agrega un nuevo paciente con validación de CURP único
 * @param {Object} patientData - Datos del paciente
 * @param {string} patientData.name - Nombre completo
 * @param {number} patientData.age - Edad
 * @param {string} patientData.curp - CURP (Clave Única de Registro de Población)
 * @param {string} patientData.room - Número de habitación
 * @param {string} patientData.condition - Estado clínico
 * @param {string} patientData.admission_date - Fecha de ingreso
 * @param {string} patientData.blood_type - Tipo de sangre
 * @param {string} patientData.allergies - Alergias (opcional)
 * @param {string} patientData.diagnosis - Diagnóstico (opcional)
 * @throws {Error} Si el CURP ya existe o es inválido
 */
export async function addPatient(patientData) {
  const db = await initDatabase();
  
  // Validar CURP
  const { validateCURP } = await import('../utils/curpValidation.js');
  const curpValidation = validateCURP(patientData.curp);
  
  if (!curpValidation.isValid) {
    throw new Error(
      '❌ CURP INVÁLIDO:\n' + 
      curpValidation.errors.map(e => `  • ${e}`).join('\n')
    );
  }
  
  const curpNormalizado = curpValidation.normalized;
  
  // Verificar si el CURP ya existe
  const existente = await db.select(
    'SELECT id, name FROM patients WHERE curp = ?',
    [curpNormalizado]
  );
  
  if (existente.length > 0) {
    throw new Error(
      `❌ CURP DUPLICADO: El CURP ${curpNormalizado} ya está registrado.\n` +
      `Paciente existente: ${existente[0].name} (ID: ${existente[0].id})\n\n` +
      `No se pueden crear expedientes duplicados. Verifique el CURP ingresado.`
    );
  }
  
  // Insertar paciente
  try {
    await db.execute(
      `INSERT INTO patients (
        name, age, curp, room, condition, admission_date, 
        blood_type, allergies, diagnosis,
        triage_level, triage_evaluated_by, triage_symptoms, triage_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientData.name,
        patientData.age,
        curpNormalizado,
        patientData.room || 'Sin asignar',
        patientData.condition || 'En valoración',
        patientData.admission_date || new Date().toISOString().split('T')[0],
        patientData.blood_type,
        patientData.allergies || '',
        patientData.diagnosis || '',
        patientData.triage_level,
        patientData.triage_evaluated_by || 'Sistema',
        patientData.triage_symptoms || '',
        patientData.triage_timestamp || new Date().toISOString()
      ]
    );
    
    console.log(`✅ Paciente registrado: ${patientData.name} (CURP: ${curpNormalizado}, Triaje: ${patientData.triage_level})`);
    return await getPatients();
  } catch (error) {
    // Capturar error de constraint UNIQUE de SQLite
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      throw new Error(
        `❌ ERROR DE DUPLICIDAD: El CURP ${curpNormalizado} ya existe en el sistema.\n` +
        `No se pueden registrar pacientes con el mismo CURP.`
      );
    }
    throw error;
  }
}

/**
 * Verifica si un CURP ya está registrado
 * @param {string} curp - CURP a verificar
 * @returns {Promise<Object>} { exists: boolean, patient: Object|null }
 */
export async function checkCURPDuplicate(curp) {
  const db = await initDatabase();
  
  const { validateCURP } = await import('../utils/curpValidation.js');
  const validation = validateCURP(curp);
  
  if (!validation.isValid) {
    return { exists: false, patient: null, error: 'CURP inválido' };
  }
  
  const result = await db.select(
    'SELECT * FROM patients WHERE curp = ?',
    [validation.normalized]
  );
  
  return {
    exists: result.length > 0,
    patient: result.length > 0 ? result[0] : null,
    error: null
  };
}

// ========== FUNCIONES DE SEGURIDAD ==========

export async function recordLoginAttempt(username, success, ipAddress = '') {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO login_attempts (username, success, ip_address) VALUES (?, ?, ?)`,
        [username, success ? 1 : 0, ipAddress]
    );
    
    // Si falló, verificamos si hay que bloquear
    if (!success) {
        const attempts = await db.select(
            `SELECT COUNT(*) as count FROM login_attempts 
             WHERE username = ? AND success = 0 
             AND timestamp > datetime('now', '-24 hours')`,
            [username]
        );
        
        if (attempts[0].count >= 3) {
            await lockAccount(username);
        }
    }
}

export async function lockAccount(username) {
    const db = await initDatabase();
    const temporaryPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
    
    await db.execute(
        `INSERT OR REPLACE INTO account_lockouts 
         (username, locked_at, locked_until, reason, attempt_count, temporary_password) 
         VALUES (?, datetime('now'), datetime('now', '+24 hours'), 'Tres intentos fallidos', 3, ?)`,
        [username, temporaryPassword]
    );
    
    return temporaryPassword;
}

export async function isAccountLocked(username) {
    const db = await initDatabase();
    const result = await db.select(
        `SELECT * FROM account_lockouts WHERE username = ? AND locked_until > datetime('now')`,
        [username]
    );
    return result.length > 0 ? result[0] : null;
}

export async function unlockAccount(username) {
    const db = await initDatabase();
    await db.execute(
        `DELETE FROM account_lockouts WHERE username = ?`,
        [username]
    );
}

// ========== FUNCIONES DE ERRORES Y TURNOS ==========

export async function reportError(errorData) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO system_errors 
         (error_code, error_message, error_type, severity, module, user_id, user_name, ip_address, stack_trace, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Abierto')`,
        [
            errorData.code || 'ERR_UNKNOWN',
            errorData.message || 'Error desconocido',
            errorData.type || 'generic',
            errorData.severity || 'medium',
            errorData.module || 'unknown',
            errorData.userId || null,
            errorData.userName || 'Sistema',
            errorData.ipAddress || '',
            errorData.stackTrace || ''
        ]
    );
}

export async function getSystemErrors(filters = {}) {
    const db = await initDatabase();
    let query = 'SELECT * FROM system_errors WHERE 1=1';
    const params = [];
    // Filtros simples
    if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }
    query += ' ORDER BY created_at DESC';
    if (filters.limit) query += ` LIMIT ${filters.limit}`;
    
    return await db.select(query, params);
}

export async function updateErrorStatus(errorId, status, resolvedBy = '', notes = '') {
    const db = await initDatabase();
    const resolvedAt = status === 'Resuelto' ? new Date().toLocaleString('es-MX') : null;
    await db.execute(
        `UPDATE system_errors 
         SET status = ?, resolved_at = ?, resolved_by = ?, resolution_notes = ? 
         WHERE id = ?`,
        [status, resolvedAt, resolvedBy, notes, errorId]
    );
}

export async function assignShift(userId, username, shiftType, dayOfWeek, startTime, endTime) {
    const db = await initDatabase();
    await db.execute(
        `INSERT INTO shift_assignments 
         (user_id, username, shift_type, day_of_week, start_time, end_time, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [userId, username, shiftType, dayOfWeek, startTime, endTime]
    );
}

export async function getUserShifts(username) {
    const db = await initDatabase();
    return await db.select(
        `SELECT * FROM shift_assignments WHERE username = ? AND is_active = 1`,
        [username]
    );
}

export async function getCurrentShift(username) {
    const db = await initDatabase();
    const now = new Date();
    const dayOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()];
    // Formato HH:MM
    const currentTime = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    
    const shifts = await db.select(
        `SELECT * FROM shift_assignments 
         WHERE username = ? AND day_of_week = ? AND is_active = 1
         AND start_time <= ? AND end_time >= ?`,
        [username, dayOfWeek, currentTime, currentTime]
    );
    
    return shifts.length > 0 ? shifts[0] : null;
}

// ============================================================
// GESTIÓN DE ÓRDENES DE ALTA MÉDICA (NOM-004 COMPLIANCE)
// ============================================================

/**
 * Crea una nueva orden de alta médica
 */
export async function createDischargeOrder(orderData) {
  const db = await initDatabase();
  const {
    patientId,
    doctorId,
    doctorName,
    dischargeType,
    diagnosis,
    recommendations,
    followUpInstructions,
    medications,
    restrictions
  } = orderData;

  const now = new Date().toISOString();

  try {
    await db.execute(
      `INSERT INTO discharge_orders (
        patient_id,
        doctor_id,
        doctor_name,
        discharge_type,
        diagnosis,
        recommendations,
        follow_up_instructions,
        medications,
        restrictions,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        patientId,
        doctorId,
        doctorName,
        dischargeType,
        diagnosis,
        recommendations || '',
        followUpInstructions || '',
        medications || '',
        restrictions || '',
        now,
        now
      ]
    );

    console.log('✅ Orden de alta médica creada');
    return { success: true, message: 'Orden de alta creada exitosamente' };
  } catch (error) {
    console.error('❌ Error creando orden de alta:', error);
    throw new Error('Error al crear orden de alta médica');
  }
}

/**
 * Obtiene la orden de alta activa de un paciente
 */
export async function getActiveDischargeOrder(patientId) {
  const db = await initDatabase();
  
  try {
    const result = await db.select(
      `SELECT * FROM discharge_orders 
       WHERE patient_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [patientId]
    );

    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error obteniendo orden de alta:', error);
    return null;
  }
}

/**
 * Valida si un paciente puede ser dado de alta
 */
export async function validatePatientDischarge(patientId) {
  const order = await getActiveDischargeOrder(patientId);
  
  if (!order) {
    return {
      canDischarge: false,
      hasOrder: false,
      message: '❌ No se puede dar de alta sin orden médica'
    };
  }

  return {
    canDischarge: true,
    hasOrder: true,
    order: order,
    message: '✅ Paciente autorizado para alta médica'
  };
}

/**
 * Completa el proceso de alta del paciente
 */
export async function dischargePatient(patientId) {
  const db = await initDatabase();
  
  // Validar que existe orden de alta
  const validation = await validatePatientDischarge(patientId);
  if (!validation.canDischarge) {
    throw new Error(
      '🚫 ALTA NO AUTORIZADA\n\n' +
      'No se puede dar de alta a este paciente sin una orden médica formal.\n\n' +
      'Requisito: El médico tratante debe emitir una orden de alta antes de cerrar la cuenta.'
    );
  }

  const now = new Date().toISOString();

  try {
    // Actualizar estado de la orden
    await db.execute(
      `UPDATE discharge_orders 
       SET status = 'completed',
           discharge_executed_at = ?,
           updated_at = ?
       WHERE patient_id = ? AND status = 'active'`,
      [now, now, patientId]
    );

    // Liberar la habitación del paciente
    const patient = await db.select('SELECT room FROM patients WHERE id = ?', [patientId]);
    if (patient && patient[0]?.room) {
      await db.execute(
        `UPDATE rooms SET occupied_beds = occupied_beds - 1 WHERE room_number = ?`,
        [patient[0].room]
      );
    }

    // Actualizar estado del paciente
    await db.execute(
      `UPDATE patients 
       SET status = 'discharged',
           room = 'Alta Médica',
           condition = 'Alta'
       WHERE id = ?`,
      [patientId]
    );

    console.log('✅ Alta médica completada');
    return { success: true, message: 'Alta médica completada exitosamente' };
  } catch (error) {
    console.error('❌ Error completando alta:', error);
    throw new Error('Error al completar alta médica');
  }
}

/**
 * Cancela una orden de alta médica
 */
export async function cancelDischargeOrder(patientId, reason) {
  const db = await initDatabase();
  const now = new Date().toISOString();

  try {
    await db.execute(
      `UPDATE discharge_orders 
       SET status = 'cancelled',
           cancellation_reason = ?,
           updated_at = ?
       WHERE patient_id = ? AND status = 'active'`,
      [reason, now, patientId]
    );
    
    console.log(`✅ Orden de alta cancelada para paciente ${patientId}`);
    return { success: true, message: 'Orden de alta cancelada' };
  } catch (error) {
    console.error('❌ Error cancelando orden:', error);
    throw error;
  }
}

// ============================================
// GESTIÓN DE INVENTARIO DE MEDICAMENTOS
// ============================================

/**
 * Obtiene todo el inventario de medicamentos
 */
export async function getMedicationInventory() {
  const db = await initDatabase();
  return await db.select('SELECT * FROM medication_inventory WHERE status = "active" ORDER BY name ASC');
}

/**
 * Busca un medicamento por nombre exacto
 */
export async function findMedicationByName(name) {
  const db = await initDatabase();
  const results = await db.select(
    'SELECT * FROM medication_inventory WHERE name = ? AND status = "active"',
    [name.trim()]
  );
  return results.length > 0 ? results[0] : null;
}

/**
 * Agrega un nuevo medicamento al inventario
 */
export async function addMedicationToInventory(medication) {
  const db = await initDatabase();
  const now = new Date().toISOString();

  try {
    await db.execute(
      `INSERT INTO medication_inventory (
        name, active_ingredient, presentation, concentration, category,
        is_controlled, quantity, unit, min_stock, max_stock, unit_price,
        supplier, lot_number, expiration_date, location, storage_conditions,
        last_restocked, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        medication.name,
        medication.active_ingredient || null,
        medication.presentation || null,
        medication.concentration || null,
        medication.category || 'ESTANDAR',
        medication.is_controlled ? 1 : 0,
        medication.quantity || 0,
        medication.unit || 'unidades',
        medication.min_stock || 10,
        medication.max_stock || 100,
        medication.unit_price || 0,
        medication.supplier || null,
        medication.lot_number || null,
        medication.expiration_date || null,
        medication.location || 'Farmacia Principal',
        medication.storage_conditions || 'Temperatura ambiente',
        now,
        now,
        now
      ]
    );
    
    console.log(`✅ Medicamento agregado al inventario: ${medication.name}`);
    return await getMedicationInventory();
  } catch (error) {
    console.error('❌ Error agregando medicamento:', error);
    throw error;
  }
}

/**
 * Actualiza el stock de un medicamento
 */
export async function updateMedicationStock(medicationId, newQuantity) {
  const db = await initDatabase();
  const now = new Date().toISOString();

  try {
    await db.execute(
      `UPDATE medication_inventory 
       SET quantity = ?, 
           last_restocked = ?,
           updated_at = ?
       WHERE id = ?`,
      [newQuantity, now, now, medicationId]
    );
    
    console.log(`✅ Stock actualizado para medicamento ${medicationId}: ${newQuantity} unidades`);
  } catch (error) {
    console.error('❌ Error actualizando stock:', error);
    throw error;
  }
}

/**
 * Dispensa un medicamento y reduce el stock
 * @throws {Error} Si no hay suficiente stock
 */
export async function dispenseMedication(dispensation) {
  const db = await initDatabase();
  const now = new Date().toISOString();

  try {
    // Buscar medicamento por nombre
    const medication = await findMedicationByName(dispensation.medicationName);
    
    if (!medication) {
      throw new Error(
        `❌ MEDICAMENTO NO ENCONTRADO\n\n` +
        `El medicamento "${dispensation.medicationName}" no existe en el inventario.\n\n` +
        `⚠️ Verifique el nombre o regístrelo primero en el sistema.`
      );
    }

    // Validar stock disponible
    const { validateStockAvailability } = await import('../utils/medicationStockValidation.js');
    const validation = validateStockAvailability(
      dispensation.medicationName,
      dispensation.quantity,
      medication.quantity
    );

    // Calcular nuevo stock
    const newStock = medication.quantity - dispensation.quantity;

    // Actualizar stock en inventario
    await db.execute(
      `UPDATE medication_inventory 
       SET quantity = ?,
           last_dispensed = ?,
           updated_at = ?
       WHERE id = ?`,
      [newStock, now, now, medication.id]
    );

    // Registrar dispensación para auditoría
    await db.execute(
      `INSERT INTO medication_dispensations (
        medication_id, medication_name, patient_id, patient_name,
        quantity, dispensed_by, doctor_prescription, lot_number,
        stock_before, stock_after, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        medication.id,
        medication.name,
        dispensation.patientId,
        dispensation.patientName || 'N/A',
        dispensation.quantity,
        dispensation.dispensedBy,
        dispensation.doctorPrescription || null,
        medication.lot_number,
        medication.quantity,
        newStock,
        dispensation.reason || 'Tratamiento médico',
        now
      ]
    );

    console.log(
      `✅ Medicamento dispensado: ${medication.name}\n` +
      `   Cantidad: ${dispensation.quantity}\n` +
      `   Stock anterior: ${medication.quantity}\n` +
      `   Stock actual: ${newStock}`
    );

    // Devolver advertencia si el stock quedó bajo
    return {
      success: true,
      newStock,
      warning: validation.warning,
      stockLevel: validation.stockLevel
    };
  } catch (error) {
    console.error('❌ Error dispensando medicamento:', error);
    throw error;
  }
}

/**
 * Obtiene historial de dispensaciones
 */
export async function getDispensationHistory(filters = {}) {
  const db = await initDatabase();
  
  let query = 'SELECT * FROM medication_dispensations WHERE 1=1';
  const params = [];

  if (filters.medicationId) {
    query += ' AND medication_id = ?';
    params.push(filters.medicationId);
  }

  if (filters.patientId) {
    query += ' AND patient_id = ?';
    params.push(filters.patientId);
  }

  if (filters.startDate) {
    query += ' AND date(created_at) >= date(?)';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += ' AND date(created_at) <= date(?)';
    params.push(filters.endDate);
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  return await db.select(query, params);
}

/**
 * Obtiene medicamentos con stock bajo o crítico
 */
export async function getLowStockMedications() {
  const db = await initDatabase();
  return await db.select(
    `SELECT * FROM medication_inventory 
     WHERE status = 'active' AND quantity <= min_stock 
     ORDER BY quantity ASC`
  );
}

/**
 * Obtiene medicamentos próximos a vencer (30 días)
 */
export async function getMedicationsNearExpiration(daysThreshold = 30) {
  const db = await initDatabase();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysThreshold);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  return await db.select(
    `SELECT * FROM medication_inventory 
     WHERE status = 'active' 
     AND expiration_date IS NOT NULL 
     AND expiration_date <= ?
     AND expiration_date >= date('now')
     ORDER BY expiration_date ASC`,
    [futureDateStr]
  );
}

/**
 * Obtiene todas las órdenes de alta de un paciente
 */
export async function getDischargeHistory(patientId) {
  const db = await initDatabase();
  
  try {
    return await db.select(
      `SELECT * FROM discharge_orders 
       WHERE patient_id = ?
       ORDER BY created_at DESC`,
      [patientId]
    );
  } catch (error) {
    console.error('Error obteniendo historial de altas:', error);
    return [];
  }
}

// ============================================
// FUNCIONES DE SEGURIDAD - RESTABLECIMIENTO DE CONTRASEÑA
// ============================================

/**
 * Genera un token aleatorio seguro
 */
function generateSecureToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token + Date.now().toString(36);
}

/**
 * Crea un token de restablecimiento de contraseña
 * Requiere validación de cédula profesional
 */
export async function createPasswordResetToken(licenseNumber, ipAddress = null) {
  const db = await initDatabase();
  
  try {
    // Verificar que la cédula profesional existe
    const users = await db.select(
      `SELECT id, username, email, license_number, name 
       FROM users 
       WHERE license_number = ?`,
      [licenseNumber]
    );
    
    if (!users || users.length === 0) {
      throw new Error('ERR-03: Cédula profesional no encontrada en el sistema');
    }
    
    const user = users[0];
    
    // Verificar que el usuario tiene un email asociado
    if (!user.email) {
      throw new Error(
        'Este usuario no tiene un correo electrónico registrado.\n' +
        'Por favor contacte al administrador del sistema.'
      );
    }
    
    // Invalidar tokens anteriores del mismo usuario (seguridad)
    await db.execute(
      `UPDATE password_reset_tokens 
       SET used = 1 
       WHERE user_id = ? AND used = 0`,
      [user.id]
    );
    
    // Generar nuevo token
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira en 1 hora
    
    // Guardar token
    await db.execute(
      `INSERT INTO password_reset_tokens (
        user_id, username, license_number, email, token, 
        expires_at, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.username,
        user.license_number,
        user.email,
        token,
        expiresAt.toISOString(),
        ipAddress,
        new Date().toISOString()
      ]
    );
    
    console.log(`🔐 Token de recuperación generado para: ${user.username}`);
    
    return {
      success: true,
      token,
      email: user.email,
      username: user.username,
      name: user.name,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    console.error('❌ Error creando token de recuperación:', error);
    throw error;
  }
}

/**
 * Valida un token de restablecimiento
 */
export async function validatePasswordResetToken(token) {
  const db = await initDatabase();
  
  try {
    const tokens = await db.select(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND used = 0`,
      [token]
    );
    
    if (!tokens || tokens.length === 0) {
      throw new Error('Token inválido o ya fue utilizado');
    }
    
    const tokenData = tokens[0];
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    // Verificar expiración
    if (now > expiresAt) {
      throw new Error('El token ha expirado. Por favor solicite uno nuevo.');
    }
    
    return {
      valid: true,
      userId: tokenData.user_id,
      username: tokenData.username,
      email: tokenData.email
    };
  } catch (error) {
    console.error('❌ Error validando token:', error);
    throw error;
  }
}

/**
 * Restablece la contraseña usando un token válido
 */
export async function resetPasswordWithToken(token, newPassword) {
  const db = await initDatabase();
  
  try {
    // Validar token
    const validation = await validatePasswordResetToken(token);
    
    if (!validation.valid) {
      throw new Error('Token inválido');
    }
    
    // Hash de la nueva contraseña (simulado - en producción usar bcrypt)
    const passwordHash = btoa(newPassword); // Usar bcrypt en producción
    
    // Actualizar contraseña
    await db.execute(
      `UPDATE users 
       SET password_hash = ? 
       WHERE id = ?`,
      [passwordHash, validation.userId]
    );
    
    // Marcar token como usado
    await db.execute(
      `UPDATE password_reset_tokens 
       SET used = 1, used_at = ? 
       WHERE token = ?`,
      [new Date().toISOString(), token]
    );
    
    console.log(`✅ Contraseña restablecida para usuario: ${validation.username}`);
    
    return {
      success: true,
      message: 'Contraseña actualizada correctamente'
    };
  } catch (error) {
    console.error('❌ Error restableciendo contraseña:', error);
    throw error;
  }
}

/**
 * Limpia tokens expirados (mantenimiento)
 */
export async function cleanExpiredTokens() {
  const db = await initDatabase();
  
  try {
    const now = new Date().toISOString();
    
    const result = await db.execute(
      `DELETE FROM password_reset_tokens 
       WHERE expires_at < ? OR used = 1`,
      [now]
    );
    
    console.log(`🧹 Tokens de recuperación limpiados`);
    return { success: true };
  } catch (error) {
    console.error('Error limpiando tokens:', error);
    return { success: false };
  }
}

// ========== NUEVA FUNCIÓN DE TOLERANCIA A FALLOS ==========
export async function checkPatientHasTreatment(patientId) {
  const db = await initDatabase();
  try {
    // Buscamos si hay al menos un tratamiento activo
    const treatments = await db.select(
      "SELECT id FROM treatments WHERE patient_id = ? AND status = 'Activo' LIMIT 1", 
      [patientId]
    );
    
    if (treatments.length === 0) {
      return { 
        hasTreatment: false, 
        message: '⚠️ Advertencia: Este paciente no tiene tratamiento activo registrado.' 
      };
    }
    return { hasTreatment: true };
  } catch (e) {
    console.warn("Error verificando tratamientos:", e);
    return { hasTreatment: true }; // En caso de error, asumimos true para no bloquear
  }
}

/**
 * Obtiene todas las órdenes de alta activas
 */
export async function getAllActiveDischargeOrders() {
  const db = await initDatabase();
  
  try {
    return await db.select(
      `SELECT do.*, p.name as patient_name, p.room 
       FROM discharge_orders do
       JOIN patients p ON do.patient_id = p.id
       WHERE do.status = 'active'
       ORDER BY do.created_at DESC`
    );
  } catch (error) {
    console.error('Error obteniendo órdenes de alta:', error);
    return [];
  }
}

// ========== FUNCIONES GETALL FALTANTES ==========

/**
 * Obtiene todos los usuarios
 */
export async function getAllUsers() {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM users ORDER BY name ASC');
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [];
  }
}

/**
 * Obtiene todos los pacientes
 */
export async function getAllPatients() {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM patients ORDER BY id DESC');
  } catch (error) {
    console.error('Error obteniendo pacientes:', error);
    return [];
  }
}

/**
 * Obtiene todas las citas/appointments
 */
export async function getAllAppointments() {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM appointments ORDER BY date DESC');
  } catch (error) {
    console.error('Error obteniendo citas:', error);
    return [];
  }
}

/**
 * Obtiene todas las salas/rooms
 */
export async function getAllRooms() {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM rooms ORDER BY room_number ASC');
  } catch (error) {
    console.error('Error obteniendo salas:', error);
    return [];
  }
}

/**
 * Obtiene los usuarios por rol específico
 */
export async function getUsersByRole(role) {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM users WHERE role = ? ORDER BY name ASC', [role]);
  } catch (error) {
    console.error(`Error obteniendo ${role}s:`, error);
    return [];
  }
}

/**
 * Obtiene todas las prescripciones
 */
export async function getAllPrescriptions() {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM prescriptions ORDER BY prescribed_date DESC');
  } catch (error) {
    console.error('Error obteniendo prescripciones:', error);
    return [];
  }
}

/**
 * Obtiene prescripciones por ID de paciente
 */
export async function getPrescriptionsByPatientId(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(
      'SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescribed_date DESC',
      [patientId]
    );
  } catch (error) {
    console.error('Error obteniendo prescripciones del paciente:', error);
    return [];
  }
}

/**
 * Obtiene prescripciones activas
 */
export async function getActivePrescriptions() {
  const db = await initDatabase();
  try {
    return await db.select(
      'SELECT * FROM prescriptions WHERE status = "Active" ORDER BY prescribed_date DESC'
    );
  } catch (error) {
    console.error('Error obteniendo prescripciones activas:', error);
    return [];
  }
}

/**
 * Obtiene todos los signos vitales
 */
export async function getAllVitalSigns() {
  const db = await initDatabase();
  try {
    return await db.select('SELECT * FROM vital_signs ORDER BY date DESC');
  } catch (error) {
    console.error('Error obteniendo signos vitales:', error);
    return [];
  }
}

/**
 * Obtiene signos vitales por ID de paciente
 */
export async function getVitalSignsByPatientId(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(
      'SELECT * FROM vital_signs WHERE patient_id = ? ORDER BY date DESC',
      [patientId]
    );
  } catch (error) {
    console.error('Error obteniendo signos vitales del paciente:', error);
    return [];
  }
}

/**
 * Obtiene el historial médico de un paciente
 */
export async function getMedicalHistoryByPatientId(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(
      'SELECT * FROM medical_history WHERE patient_id = ? ORDER BY date DESC',
      [patientId]
    );
  } catch (error) {
    console.error('Error obteniendo historial médico:', error);
    return [];
  }
}

/**
 * Obtiene pruebas de laboratorio por ID de paciente
 */
export async function getLabTestsByPatientId(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(
      'SELECT * FROM lab_tests WHERE patient_id = ? ORDER BY date DESC',
      [patientId]
    );
  } catch (error) {
    console.error('Error obteniendo pruebas de laboratorio:', error);
    return [];
  }
}

/**
 * Obtiene todas las notificaciones
 */
export async function getAllNotifications(userId = null) {
  const db = await initDatabase();
  try {
    if (userId) {
      return await db.select(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
    }
    return await db.select('SELECT * FROM notifications ORDER BY created_at DESC');
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
}

/**
 * Obtiene notificaciones no leídas
 */
export async function getUnreadNotifications(userId) {
  const db = await initDatabase();
  try {
    return await db.select(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC',
      [userId]
    );
  } catch (error) {
    console.error('Error obteniendo notificaciones no leídas:', error);
    return [];
  }
}

/**
 * Elimina un usuario
 */
export async function deleteUser(userId) {
  const db = await initDatabase();
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [userId]);
    console.log(`✅ Usuario ${userId} eliminado`);
    return true;
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    throw error;
  }
}

/**
 * Desactiva un usuario
 */
export async function deactivateUser(userId) {
  const db = await initDatabase();
  try {
    await db.execute('UPDATE users SET is_active = 0 WHERE id = ?', [userId]);
    console.log(`✅ Usuario ${userId} desactivado`);
    return true;
  } catch (error) {
    console.error('Error desactivando usuario:', error);
    throw error;
  }
}

// ========== FUNCIONES DE TRASLADOS ==========

/**
 * Agrega un nuevo traslado de paciente
 */
export async function addPatientTransfer(transferData) {
  const db = await initDatabase();
  try {
    await db.execute(
      `INSERT INTO patient_transfers (
        patient_id, from_floor, from_area, from_room, from_bed,
        to_floor, to_area, to_room, to_bed,
        transfer_date, transfer_time, reason, transferred_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transferData.patient_id,
        transferData.from_floor,
        transferData.from_area,
        transferData.from_room,
        transferData.from_bed,
        transferData.to_floor,
        transferData.to_area,
        transferData.to_room,
        transferData.to_bed,
        transferData.transfer_date,
        transferData.transfer_time,
        transferData.reason,
        transferData.transferred_by,
        transferData.notes || ''
      ]
    );
    console.log(`✅ Traslado registrado para paciente ${transferData.patient_id}`);
    return true;
  } catch (error) {
    console.error('Error al agregar traslado:', error);
    throw error;
  }
}

/**
 * Obtiene todos los traslados de un paciente
 */
export async function getTransfersByPatientId(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(
      `SELECT * FROM patient_transfers WHERE patient_id = ? ORDER BY transfer_date DESC`,
      [patientId]
    );
  } catch (error) {
    console.error('Error obteniendo traslados:', error);
    return [];
  }
}

/**
 * Obtiene todos los traslados
 */
export async function getAllTransfers() {
  const db = await initDatabase();
  try {
    return await db.select(
      `SELECT pt.*, p.name as patient_name FROM patient_transfers pt
       JOIN patients p ON pt.patient_id = p.id
       ORDER BY pt.transfer_date DESC`
    );
  } catch (error) {
    console.error('Error obteniendo traslados:', error);
    return [];
  }
}

// ========== FUNCIONES DE HORARIOS/SHIFTS ==========

/**
 * Obtiene los turnos de un usuario (enfermero)
 */
export async function getShiftsByUserId(userId) {
  const db = await initDatabase();
  try {
    return await db.select(
      `SELECT * FROM shifts WHERE user_id = ? ORDER BY date DESC`,
      [userId]
    );
  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    return [];
  }
}

/**
 * Obtiene los turnos de hoy
 */
export async function getTodayShifts() {
  const db = await initDatabase();
  try {
    const today = new Date().toISOString().split('T')[0];
    return await db.select(
      `SELECT s.*, u.name FROM shifts s
       JOIN users u ON s.user_id = u.id
       WHERE s.date = ? ORDER BY s.start_time ASC`,
      [today]
    );
  } catch (error) {
    console.error('Error obteniendo turnos de hoy:', error);
    return [];
  }
}

/**
 * Obtiene todos los turnos
 */
export async function getAllShifts() {
  const db = await initDatabase();
  try {
    return await db.select(
      `SELECT s.*, u.name FROM shifts s
       JOIN users u ON s.user_id = u.id
       ORDER BY s.date DESC, s.start_time ASC`
    );
  } catch (error) {
    console.error('Error obteniendo turnos:', error);
    return [];
  }
}

/**
 * TRATAMIENTOS NO FARMACOLÓGICOS - FUNCIONES CRUD
 * Para registrar curaciones, nebulizaciones, fluidoterapia, etc.
 */

/**
 * Agrega un tratamiento no farmacológico
 * @param {Object} treatmentData - { patient_id, nurse_id, nurse_name, treatment_type, description, time_start, time_end? }
 * @returns {Promise} Resultado de inserción
 */
export async function addNonPharmacologicalTreatment(treatmentData) {
  const db = await initDatabase();
  try {
    const {
      patient_id,
      nurse_id,
      nurse_name,
      treatment_type,
      description,
      time_start,
      time_end = null
    } = treatmentData;

    const now = new Date().toISOString();

    await db.execute(`
      INSERT INTO non_pharmacological_treatments (
        patient_id, nurse_id, nurse_name, treatment_type, 
        description, time_start, time_end, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patient_id,
      nurse_id,
      nurse_name,
      treatment_type,
      description,
      time_start,
      time_end,
      now
    ]);

    console.log(`✅ Tratamiento no farmacológico registrado: ${treatment_type}`);
    return { success: true, message: 'Tratamiento registrado correctamente' };
  } catch (error) {
    console.error('Error registrando tratamiento no farmacológico:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene tratamientos no farmacológicos por paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} Lista de tratamientos
 */
export async function getNonPharmacologicalTreatmentsByPatientId(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT * FROM non_pharmacological_treatments
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `, [patientId]);
  } catch (error) {
    console.error('Error obteniendo tratamientos no farmacológicos:', error);
    return [];
  }
}

/**
 * Obtiene todos los tratamientos no farmacológicos
 * @returns {Promise<Array>} Lista de todos los tratamientos
 */
export async function getAllNonPharmacologicalTreatments() {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT * FROM non_pharmacological_treatments
      ORDER BY created_at DESC
    `);
  } catch (error) {
    console.error('Error obteniendo todos los tratamientos:', error);
    return [];
  }
}

/**
 * Obtiene tratamientos no farmacológicos por tipo
 * @param {string} treatmentType - Tipo de tratamiento (curation, nebulization, etc.)
 * @returns {Promise<Array>} Lista filtrada
 */
export async function getNonPharmacologicalTreatmentsByType(treatmentType) {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT * FROM non_pharmacological_treatments
      WHERE treatment_type = ?
      ORDER BY created_at DESC
    `, [treatmentType]);
  } catch (error) {
    console.error('Error filtrando tratamientos por tipo:', error);
    return [];
  }
}

/**
 * Actualiza un tratamiento no farmacológico
 * @param {number} treatmentId - ID del tratamiento
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise} Resultado de actualización
 */
export async function updateNonPharmacologicalTreatment(treatmentId, updateData) {
  const db = await initDatabase();
  try {
    const { description, time_end, treatment_type } = updateData;
    
    const updates = [];
    const values = [];

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (time_end !== undefined) {
      updates.push('time_end = ?');
      values.push(time_end);
    }
    if (treatment_type !== undefined) {
      updates.push('treatment_type = ?');
      values.push(treatment_type);
    }

    if (updates.length === 0) {
      return { success: true, message: 'Sin cambios' };
    }

    values.push(treatmentId);

    await db.execute(`
      UPDATE non_pharmacological_treatments
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    console.log(`✅ Tratamiento actualizado: ID ${treatmentId}`);
    return { success: true, message: 'Tratamiento actualizado correctamente' };
  } catch (error) {
    console.error('Error actualizando tratamiento:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene tratamientos de un enfermero en una fecha
 * @param {number} nurseId - ID del enfermero
 * @param {string} date - Fecha (YYYY-MM-DD)
 * @returns {Promise<Array>} Tratamientos del día
 */
export async function getNurseNonPharmacologicalTreatmentsByDate(nurseId, date) {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT * FROM non_pharmacological_treatments
      WHERE nurse_id = ? AND DATE(created_at) = ?
      ORDER BY time_start ASC
    `, [nurseId, date]);
  } catch (error) {
    console.error('Error obteniendo tratamientos del enfermero:', error);
    return [];
  }
}

/**
 * FUNCIONES MEJORADAS PARA PACIENTES ASIGNADOS AL ENFERMERO
 */

/**
 * Obtiene pacientes asignados a un enfermero CON DETALLES COMPLETOS
 * @param {number} nurseId - ID del enfermero
 * @returns {Promise<Array>} Pacientes con ubicación y estado
 */
export async function getNurseAssignedPatientsWithDetails(nurseId) {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT 
        p.id,
        p.name,
        p.curp,
        p.age,
        p.blood_type,
        p.gender,
        p.triage_level,
        p.room,
        p.primary_doctor,
        p.diagnosis,
        p.status,
        pa.assignment_date as assigned_at,
        pa.shift_type,
        pa.notes,
        p.floor as room_floor,
        p.area as room_area,
        p.bed as bed_number
      FROM patient_assignments pa
      JOIN patients p ON pa.patient_id = p.id
      WHERE pa.nurse_id = ? AND pa.status = 'Active'
      ORDER BY p.room ASC
    `, [nurseId]);
  } catch (error) {
    console.error('Error obteniendo pacientes asignados con detalles:', error);
    return [];
  }
}

/**
 * FUNCIONES PARA REGISTRO DE MEDICAMENTOS
 */

/**
 * Registra administración de medicamento (solo hora, más simple)
 * @param {Object} adminData - { patient_id, nurse_id, medication_id, prescription_id, administration_time, notes? }
 * @returns {Promise} Resultado
 */
export async function recordMedicationAdministration(adminData) {
  const db = await initDatabase();
  try {
    const {
      patient_id,
      nurse_id,
      medication_id,
      prescription_id,
      administration_time,
      notes = ''
    } = adminData;

    const now = new Date().toISOString();

    // Buscar si existe tabla medication_administration, si no usar otra
    // Por ahora registramos en dispensation
    await db.execute(`
      INSERT INTO pharmacy_dispensation (
        patient_id, medication_id, nurse_id, 
        quantity, dispensed_time, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      patient_id,
      medication_id,
      nurse_id,
      1, // Cantidad por defecto
      administration_time,
      `Administración: ${notes}`,
      'administered'
    ]);

    console.log(`✅ Medicamento administrado al paciente ${patient_id}`);
    return { success: true, message: 'Medicamento registrado como administrado' };
  } catch (error) {
    console.error('Error registrando administración de medicamento:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene historial de medicamentos administrados a un paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} Historial
 */
export async function getMedicationAdministrationHistory(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT * FROM pharmacy_dispensation
      WHERE patient_id = ? AND status = 'administered'
      ORDER BY dispensed_time DESC
    `, [patientId]);
  } catch (error) {
    console.error('Error obteniendo historial de medicamentos:', error);
    return [];
  }
}

/**
 * Obtiene medicamentos pendientes de administración para un paciente
 * @param {number} patientId - ID del paciente
 * @returns {Promise<Array>} Medicamentos pendientes
 */
export async function getPendingMedicationAdministration(patientId) {
  const db = await initDatabase();
  try {
    return await db.select(`
      SELECT p.*, u.name as doctor_name
      FROM prescriptions p
      LEFT JOIN users u ON p.doctor_id = u.id
      WHERE p.patient_id = ? AND p.status = 'active'
      AND (p.next_administration IS NULL OR p.next_administration <= ?)
      ORDER BY p.frequency ASC
    `, [patientId, new Date().toISOString()]);
  } catch (error) {
    console.error('Error obteniendo medicamentos pendientes:', error);
    return [];
  }
}

// ========== VALIDACIONES Y SEGURIDAD (10 Puntos) ==========

/**
 * 1. INTEGRIDAD DEL EXPEDIENTE (NOM-004)
 * Previene eliminación de notas médicas - Solo marca como archivado
 */
export async function preventNoteDelection(noteId) {
  const db = await initDatabase();
  try {
    // No permitir eliminación física, solo marcar como archivado
    const note = await db.select(
      'SELECT * FROM nurse_notes WHERE id = ?',
      [noteId]
    );

    if (!note || note.length === 0) {
      return { allowed: false, reason: 'Nota no encontrada' };
    }

    // Si la nota existe, retornar que NO se puede eliminar
    return {
      allowed: false,
      reason: '❌ PROHIBIDO: No se pueden eliminar notas médicas (NOM-004). Se marcarán como archivadas.',
      noteId: note[0].id,
      archiveOption: true
    };
  } catch (error) {
    console.error('Error verificando integridad:', error);
    return { allowed: false, reason: 'Error en validación' };
  }
}

/**
 * 2. VALIDACIÓN DE SIGNOS VITALES
 * Verifica que valores estén en rangos fisiológicos posibles
 */
export async function validateVitalSignsRange(vitals) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  // Rango: 35-42°C (Temperatura)
  if (vitals.temperature < 35 || vitals.temperature > 42) {
    validation.isValid = false;
    validation.errors.push(`Temperatura ${vitals.temperature}°C está FUERA DE RANGO (35-42°C)`);
  }

  // Rango: 60-200 lpm (Frecuencia Cardíaca)
  if (vitals.heartRate < 40 || vitals.heartRate > 200) {
    validation.isValid = false;
    validation.errors.push(`FC ${vitals.heartRate} lpm está FUERA DE RANGO (40-200)`);
  }

  // Rango: 8-60 rpm (Frecuencia Respiratoria)
  if (vitals.respiratoryRate < 8 || vitals.respiratoryRate > 60) {
    validation.isValid = false;
    validation.errors.push(`FR ${vitals.respiratoryRate} rpm está FUERA DE RANGO (8-60)`);
  }

  // Rango: 40-250 mmHg sistólica (PA)
  const [systolic, diastolic] = vitals.bloodPressure.split('/').map(Number);
  if (systolic < 40 || systolic > 250 || diastolic < 20 || diastolic > 150) {
    validation.isValid = false;
    validation.errors.push(`PA ${vitals.bloodPressure} mmHg está FUERA DE RANGO`);
  }

  return validation;
}

/**
 * 3. PRIVACIDAD DE ASIGNACIÓN
 * Enfermero solo ve pacientes de su turno y piso
 */
export async function validateNursePatientAccess(nurseId, patientId) {
  const db = await initDatabase();
  try {
    // Verificar que el paciente esté asignado al enfermero en su turno
    const assignment = await db.select(`
      SELECT npa.*, p.room, r.floor
      FROM nurse_patient_assignments npa
      JOIN patients p ON npa.patient_id = p.id
      LEFT JOIN rooms r ON p.room = r.room_number
      WHERE npa.nurse_id = ? AND npa.patient_id = ? AND npa.status = 'active'
    `, [nurseId, patientId]);

    if (assignment.length === 0) {
      return {
        allowed: false,
        reason: '❌ ACCESO DENEGADO: Este paciente no está asignado a tu turno o piso'
      };
    }

    return {
      allowed: true,
      assignment: assignment[0]
    };
  } catch (error) {
    console.error('Error validando acceso:', error);
    return { allowed: false, reason: 'Error en validación de acceso' };
  }
}

/**
 * 4. DISPONIBILIDAD DE CAMAS
 * No permitir asignar paciente a cama ocupada
 */
export async function validateBedAvailability(roomNumber) {
  const db = await initDatabase();
  try {
    const room = await db.select(`
      SELECT occupied_beds, bed_count FROM rooms WHERE room_number = ?
    `, [roomNumber]);

    if (!room || room.length === 0) {
      return { available: false, reason: 'Habitación no encontrada' };
    }

    if (room[0].occupied_beds >= room[0].bed_count) {
      return {
        available: false,
        reason: `❌ No hay camas disponibles en la habitación ${roomNumber}`,
        occupancy: `${room[0].occupied_beds}/${room[0].bed_count}`
      };
    }

    return {
      available: true,
      occupancy: `${room[0].occupied_beds}/${room[0].bed_count}`
    };
  } catch (error) {
    console.error('Error validando cama:', error);
    return { available: false, reason: 'Error en validación' };
  }
}

/**
 * 5. ALERTA DE ALERGIAS
 * Advertir si se medica algo a lo que el paciente es alérgico
 */
export async function checkMedicationAllergy(patientId, medicationName) {
  const db = await initDatabase();
  try {
    // Buscar alergias del paciente en medical_history
    const allergies = await db.select(`
      SELECT * FROM medical_history
      WHERE patient_id = ? AND type = 'allergy'
    `, [patientId]);

    const matchingAllergy = allergies.find(a =>
      a.description && a.description.toLowerCase().includes(medicationName.toLowerCase())
    );

    if (matchingAllergy) {
      return {
        hasAllergy: true,
        warning: `⚠️ ALERTA: El paciente es ALÉRGICO a ${matchingAllergy.description}`,
        allergyRecord: matchingAllergy
      };
    }

    return { hasAllergy: false };
  } catch (error) {
    console.error('Error verificando alergias:', error);
    return { hasAllergy: false, warning: 'No se pudieron verificar alergias' };
  }
}

/**
 * 6. UNICIDAD DE PACIENTE
 * Evitar duplicidad usando CURP único
 */
export async function validatePatientUniqueness(curp) {
  const db = await initDatabase();
  try {
    const existing = await db.select(
      'SELECT id, name FROM patients WHERE curp = ?',
      [curp]
    );

    if (existing.length > 0) {
      return {
        unique: false,
        warning: `❌ PACIENTE DUPLICADO: Ya existe registro con CURP ${curp}`,
        existingPatient: existing[0]
      };
    }

    return { unique: true };
  } catch (error) {
    console.error('Error validando unicidad:', error);
    return { unique: false, warning: 'Error en validación' };
  }
}

/**
 * 7. BLOQUEO DE EDICIÓN POR TIEMPO
 * Notas solo editables dentro de las primeras 24 horas
 */
export async function validateNoteEditTime(noteId) {
  const db = await initDatabase();
  try {
    const note = await db.select(
      'SELECT created_at FROM nurse_notes WHERE id = ?',
      [noteId]
    );

    if (!note || note.length === 0) {
      return { canEdit: false, reason: 'Nota no encontrada' };
    }

    const createdTime = new Date(note[0].created_at).getTime();
    const nowTime = new Date().getTime();
    const hoursDiff = (nowTime - createdTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      return {
        canEdit: false,
        reason: '❌ Nota tiene más de 24 horas. No se puede editar (NOM-004)',
        hoursDiff: Math.round(hoursDiff)
      };
    }

    return {
      canEdit: true,
      hoursRemaining: Math.round(24 - hoursDiff)
    };
  } catch (error) {
    console.error('Error validando tiempo de edición:', error);
    return { canEdit: false, reason: 'Error en validación' };
  }
}

/**
 * 8. REQUISITO DE ALTA MÉDICA
 * No cerrar cuenta sin orden del médico
 */
export async function validateDischargeRequirement(patientId) {
  const db = await initDatabase();
  try {
    const dischargeOrder = await db.select(`
      SELECT * FROM discharge_orders
      WHERE patient_id = ? AND status = 'active'
    `, [patientId]);

    if (!dischargeOrder || dischargeOrder.length === 0) {
      return {
        canDischarge: false,
        reason: '❌ Requiere orden de alta del médico responsable',
        requiresPhysicianOrder: true
      };
    }

    return {
      canDischarge: true,
      order: dischargeOrder[0]
    };
  } catch (error) {
    console.error('Error validando alta médica:', error);
    return { canDischarge: false, reason: 'Error en validación' };
  }
}

/**
 * 9. CLASIFICACIÓN DE TRIAJE (OBLIGATORIO)
 * Verifica que color/nivel de urgencia esté asignado
 */
export async function validateTriageRequired(patientData) {
  const validation = {
    valid: true,
    errors: []
  };

  if (!patientData.triage_level) {
    validation.valid = false;
    validation.errors.push('❌ OBLIGATORIO: Debes asignar un nivel de triaje (ROJO/NARANJA/AMARILLO/VERDE)');
  }

  const validTriageLevels = ['red', 'orange', 'yellow', 'green', 'ROJO', 'NARANJA', 'AMARILLO', 'VERDE'];
  if (patientData.triage_level && !validTriageLevels.includes(patientData.triage_level)) {
    validation.valid = false;
    validation.errors.push(`❌ Triaje inválido: ${patientData.triage_level}. Use ROJO/NARANJA/AMARILLO/VERDE`);
  }

  return validation;
}

/**
 * 10. STOCK DE MEDICAMENTOS
 * No permitir dispensar si no hay inventario
 */
export async function validateMedicationStock(medicationId, quantity) {
  const db = await initDatabase();
  try {
    const medication = await db.select(`
      SELECT quantity_available FROM pharmacy_inventory
      WHERE id = ?
    `, [medicationId]);

    if (!medication || medication.length === 0) {
      return {
        hasStock: false,
        reason: 'Medicamento no encontrado en inventario'
      };
    }

    if (medication[0].quantity_available < quantity) {
      return {
        hasStock: false,
        reason: `❌ Stock insuficiente. Disponible: ${medication[0].quantity_available}, Solicitado: ${quantity}`,
        available: medication[0].quantity_available,
        required: quantity
      };
    }

    return {
      hasStock: true,
      available: medication[0].quantity_available
    };
  } catch (error) {
    console.error('Error validando stock:', error);
    return { hasStock: false, reason: 'Error en validación de stock' };
  }
}
