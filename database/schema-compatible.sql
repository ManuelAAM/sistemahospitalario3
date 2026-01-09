-- ============================================================
-- HOSPITAL MANAGEMENT SYSTEM - COMPATIBLE SCHEMA
-- Para herramientas de diagramas online (dbdiagram.io, QuickDBD, etc.)
-- Sintaxis estándar SQL sin extensiones específicas de SQLite
-- ============================================================

-- CORE TABLES

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  profile_photo TEXT,
  bio TEXT,
  department TEXT,
  specialization TEXT,
  license_number TEXT,
  is_active INTEGER DEFAULT 1,
  last_login TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT,
  room TEXT NOT NULL,
  floor TEXT DEFAULT '1',
  area TEXT DEFAULT 'General',
  bed TEXT DEFAULT 'A',
  condition TEXT NOT NULL,
  triage_level INTEGER DEFAULT 3,
  admission_date TEXT NOT NULL,
  blood_type TEXT NOT NULL,
  allergies TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  address TEXT,
  city TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  primary_doctor TEXT,
  discharge_date TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  doctor TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE treatments (
  id INTEGER PRIMARY KEY,
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
);

CREATE TABLE vital_signs (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  temperature TEXT NOT NULL,
  blood_pressure TEXT NOT NULL,
  heart_rate TEXT NOT NULL,
  respiratory_rate TEXT NOT NULL,
  registered_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE nurse_notes (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'evolutiva',
  nurse_name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE medical_history (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  treatment TEXT NOT NULL,
  notes TEXT,
  doctor TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE non_pharmacological_treatments (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  treatment_type TEXT NOT NULL,
  description TEXT NOT NULL,
  application_date TEXT NOT NULL,
  application_time TEXT,
  duration TEXT,
  performed_by TEXT NOT NULL,
  materials_used TEXT,
  observations TEXT,
  outcome TEXT,
  next_application TEXT,
  status TEXT DEFAULT 'Completado',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE nursing_shift_reports (
  id INTEGER PRIMARY KEY,
  shift_date TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  nurse_id INTEGER NOT NULL,
  nurse_name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  patients_assigned TEXT NOT NULL,
  general_observations TEXT,
  incidents TEXT,
  pending_tasks TEXT,
  handover_notes TEXT,
  supervisor_name TEXT,
  status TEXT DEFAULT 'En Curso',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (nurse_id) REFERENCES users(id)
);

CREATE TABLE lab_tests (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  test TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  results TEXT,
  ordered_by TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE imaging_tests (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  test_type TEXT NOT NULL,
  body_part TEXT NOT NULL,
  ordered_by INTEGER NOT NULL,
  ordered_date TEXT NOT NULL,
  scheduled_date TEXT,
  performed_date TEXT,
  radiologist_id INTEGER,
  priority TEXT DEFAULT 'Routine',
  status TEXT DEFAULT 'Ordered',
  findings TEXT,
  impression TEXT,
  images_path TEXT,
  report_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (ordered_by) REFERENCES users(id)
);

CREATE TABLE prescriptions (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration TEXT NOT NULL,
  instructions TEXT,
  prescribed_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (doctor_id) REFERENCES users(id)
);

CREATE TABLE pharmacy_inventory (
  id INTEGER PRIMARY KEY,
  medication_name TEXT NOT NULL,
  generic_name TEXT,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit TEXT NOT NULL,
  reorder_level INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  supplier TEXT,
  batch_number TEXT,
  manufacture_date TEXT,
  expiry_date TEXT NOT NULL,
  storage_location TEXT,
  status TEXT DEFAULT 'Available',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_cases (
  id INTEGER PRIMARY KEY,
  patient_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  arrival_time TEXT NOT NULL,
  triage_level INTEGER NOT NULL,
  chief_complaint TEXT NOT NULL,
  vital_signs TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'Waiting',
  emergency_contact TEXT,
  ambulance_arrival INTEGER DEFAULT 0,
  outcome TEXT,
  discharge_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE surgeries (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  procedure_name TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  operating_room TEXT NOT NULL,
  surgeon_id INTEGER NOT NULL,
  anesthesiologist_id INTEGER,
  nurses TEXT,
  status TEXT DEFAULT 'Scheduled',
  pre_op_notes TEXT,
  post_op_notes TEXT,
  complications TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (surgeon_id) REFERENCES users(id)
);

CREATE TABLE rooms (
  id INTEGER PRIMARY KEY,
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
);

CREATE TABLE patient_transfers (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  from_floor TEXT,
  from_area TEXT,
  from_room TEXT,
  from_bed TEXT,
  to_floor TEXT NOT NULL,
  to_area TEXT NOT NULL,
  to_room TEXT NOT NULL,
  to_bed TEXT NOT NULL,
  transfer_date TEXT NOT NULL,
  transfer_time TEXT NOT NULL,
  reason TEXT,
  transferred_by TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE invoices (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal REAL NOT NULL,
  tax REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  total REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  payment_method TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE invoice_items (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL,
  item_type TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE shifts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  shift_type TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_read INTEGER DEFAULT 0,
  link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE vaccinations (
  id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL,
  vaccine_name TEXT NOT NULL,
  dose_number INTEGER NOT NULL,
  date_administered TEXT NOT NULL,
  next_due_date TEXT,
  administered_by INTEGER NOT NULL,
  batch_number TEXT,
  site TEXT,
  reaction_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(id),
  FOREIGN KEY (administered_by) REFERENCES users(id)
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
