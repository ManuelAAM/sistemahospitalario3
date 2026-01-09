import ErrorBoundary from './components/ErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, User, FileText, Activity, Users, Pill, 
  LogOut, Heart, Stethoscope, AlertCircle, CheckCircle, 
  Menu, X, LayoutDashboard, Syringe, ClipboardList, ChevronRight, 
  Save, Building2, LineChart as ChartIcon, UserCircle, ClipboardCheck, 
  Bell, Keyboard, Lightbulb, UserPlus, AlertTriangle // <--- Agregamos AlertTriangle aquí
} from 'lucide-react';
import { 
  usePatients, useAppointments, useTreatments, useVitalSigns, useNurseNotes, initializeApp 
} from './hooks/useDatabase';
import { getDb } from './services/database';
import LoginForm from './components/LoginForm';
import ReportsAnalytics from './components/ReportsAnalytics';
import UserProfile from './components/UserProfile';
import ErrorReporter from './components/ErrorReporter';
import ErrorDashboard from './components/ErrorDashboard';
import { VitalSignsForm, MedicationForm, NoteForm, CareFormGroup } from './components/CareFormComponents';
import NursingShiftReport from './components/NursingShiftReport';
import GuidedTour from './components/GuidedTour';
import KeyboardShortcuts, { useKeyboardShortcuts } from './components/KeyboardShortcuts';
import Breadcrumbs from './components/Breadcrumbs';
import BedManagementModal from './components/BedManagementModal';
import PatientRegistrationForm from './components/PatientRegistrationForm';
import EditableNotesList from './components/EditableNotesList';
import DischargeOrderModal, { DischargeStatus } from './components/DischargeOrderModal';
import { TriageBadge } from './components/TriageSelector';
import MedicationStockManager from './components/MedicationStockManager';

// --- COMPONENTES UI REUTILIZABLES ---

const StatCard = ({ title, value, icon: Icon, colorName, subtext }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', ring: 'ring-red-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-100' },
  };
  const theme = colors[colorName] || colors.blue;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200 flex items-start justify-between transition-all hover:shadow-md animate-fadeIn">
      <div>
        <p className="text-hospital-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-3xl font-black text-hospital-800 mt-2">{value}</h3>
        {subtext && <p className="text-xs text-hospital-500 mt-1 font-medium flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${theme.bg} ${theme.ring} ring-2`}></span> {subtext}
        </p>}
      </div>
      <div className={`p-4 rounded-xl ${theme.bg} ${theme.text}`}>
        <Icon size={24} strokeWidth={2} />
      </div>
    </div>
  );
};

// --- DASHBOARD PRINCIPAL DE ENFERMERÍA ---

const NurseDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [currentShift, setCurrentShift] = useState('Matutino'); // Turno actual
  const [bedModalOpen, setBedModalOpen] = useState(false);
  const [bedModalPatient, setBedModalPatient] = useState(null);
  const [patientRegModalOpen, setPatientRegModalOpen] = useState(false);
  const [dischargeModalOpen, setDischargeModalOpen] = useState(false);
  const [dischargePatient, setDischargePatient] = useState(null);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  
  // Hooks de Base de Datos con filtrado por enfermero
  const { patients, updatePatient, loading: patientsLoading } = usePatients({
    nurseId: user.id,
    role: user.role,
    shift: currentShift
  });
  const { appointments } = useAppointments();
  const { treatments, addTreatment: addTreatmentDB } = useTreatments();
  const { vitalSigns, addVitalSigns: addVitalSignsDB } = useVitalSigns();
  const { nurseNotes, addNurseNote: addNurseNoteDB, editNurseNote, deleteNurseNote } = useNurseNotes();

  // Estados locales para formularios de la Zona de Cuidados
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [newCondition, setNewCondition] = useState('');

  // Atajos de teclado para mejorar usabilidad
  useKeyboardShortcuts({
    'ctrl+1': () => setActiveTab('overview'),
    'ctrl+2': () => setActiveTab('patients'),
    'ctrl+3': () => setActiveTab('care'),
    'ctrl+4': () => setActiveTab('notes'),
    'ctrl+h': () => setActiveTab('history'),
    'ctrl+shift+r': () => setActiveTab('shiftReport'),
    'ctrl+/': () => setShowKeyboardHelp(true),
    'f1': () => setShowTour(true),
  });

  // --- LÓGICA DE REGISTRO (ECU-06, ECU-09, ECU-05) ---

  const handleVitalSubmit = useCallback(async (vitals) => {
    if (!selectedPatientId) {
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('ERR_02', 'Debe seleccionar un paciente primero'));
      return;
    }
    
    const now = new Date();
    try {
      console.log('📊 Guardando signos vitales...', vitals);
      await addVitalSignsDB({
        patient_id: parseInt(selectedPatientId),
        date: now.toLocaleString('es-MX'),
        temperature: vitals.temperature,
        blood_pressure: vitals.bloodPressure,
        heart_rate: vitals.heartRate,
        respiratory_rate: vitals.respiratoryRate,
        registered_by: user.name
      });
      console.log('✅ Signos vitales guardados correctamente');
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('MSG_04', `Temp: ${vitals.temperature}°C | PA: ${vitals.bloodPressure} | FC: ${vitals.heartRate} | FR: ${vitals.respiratoryRate}`));
    } catch (error) { 
      console.error('❌ Error al guardar signos vitales:', error); 
      alert("❌ Error al registrar signos vitales: " + (error.message || error)); 
    }
  }, [selectedPatientId, addVitalSignsDB, user.name]);

  const handleMedicationSubmit = useCallback(async (med) => {
    if (!selectedPatientId) {
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('ERR_02', 'Debe seleccionar un paciente primero'));
      return;
    }
    
    const now = new Date();
    try {
      console.log('💊 Guardando medicamento...', med);
      await addTreatmentDB({
        patientId: parseInt(selectedPatientId),
        medication: med.medication,
        dose: med.dose,
        frequency: med.frequency,
        notes: '',
        startDate: now.toLocaleDateString('es-MX'),
        appliedBy: user.name,
        lastApplication: now.toLocaleString('es-MX'),
      });
      console.log('✅ Medicamento guardado correctamente');
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('MSG_05', `${med.medication} - Dosis: ${med.dose} - Frecuencia: ${med.frequency}`));
    } catch (error) { 
      console.error('❌ Error al guardar medicamento:', error);
      alert("❌ Error al registrar medicamento: " + (error.message || error)); 
    }
  }, [selectedPatientId, addTreatmentDB, user.name]);

  const handleNoteSubmit = useCallback(async (noteValue) => {
    if (!selectedPatientId) {
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('ERR_02', 'Debe seleccionar un paciente primero'));
      return;
    }
    
    if (!noteValue || noteValue.trim().length === 0) {
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('ERR_02', 'Debe escribir una nota antes de guardar'));
      return;
    }
    
    try {
      console.log('📝 Guardando nota...', noteValue);
      await addNurseNoteDB({
        patientId: parseInt(selectedPatientId),
        date: new Date().toLocaleString('es-MX'),
        note: noteValue,
        nurseName: user.name
      });
      console.log('✅ Nota guardada correctamente');
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('MSG_07', 'Nota SOAP registrada en expediente clínico'));
    } catch (error) { 
      console.error('❌ Error al guardar nota:', error);
      alert("❌ Error al guardar nota: " + (error.message || error)); 
    }
  }, [selectedPatientId, addNurseNoteDB, user.name]);

  const handleNonPharmaSubmit = useCallback(async (treatment) => {
    if (!selectedPatientId) {
      const { formatMessage } = await import('./utils/systemMessages.js');
      alert(formatMessage('ERR_02', 'Debe seleccionar un paciente primero'));
      return;
    }
    
    const now = new Date();
    try {
      console.log('💧 Guardando tratamiento no farmacológico...', treatment);
      const db = getDb();
      await db.execute(`
        INSERT INTO non_pharmacological_treatments (
          patient_id, treatment_type, description, application_date, application_time,
          performed_by, materials_used, observations, outcome, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        parseInt(selectedPatientId),
        treatment.treatmentType,
        treatment.description,
        now.toLocaleDateString('es-MX'),
        now.toLocaleTimeString('es-MX'),
        user.name,
        treatment.materials || '',
        treatment.duration ? `Duración: ${treatment.duration}` : '',
        'Completado',
        'active'
      ]);
      console.log('✅ Tratamiento guardado correctamente');
      alert(`✅ Tratamiento registrado: ${treatment.treatmentType}\n${treatment.description}`);
    } catch (error) { 
      console.error('❌ Error al guardar tratamiento:', error);
      alert("❌ Error al registrar tratamiento: " + (error.message || error)); 
    }
  }, [selectedPatientId, user.name]);

  const handleConditionUpdate = useCallback(async () => {
    if (!selectedPatientId) return;
    const selectEl = document.querySelector('select[class*="flex-1 p-2.5"]');
    const conditionValue = selectEl?.value;
    if (!conditionValue) return;
    const patient = patients.find(p => p.id == selectedPatientId);
    if (!patient) return;
    try {
      await updatePatient(patient.id, { ...patient, condition: conditionValue });
      alert(`✅ Estado clínico actualizado a: ${conditionValue}`);
    } catch (error) { console.error(error); alert("Error al actualizar estado."); }
  }, [selectedPatientId, patients, updatePatient]);

  // --- GESTIÓN DE HABITACIONES ---
  
  const openBedModal = (patient) => {
    setBedModalPatient(patient);
    setBedModalOpen(true);
  };

  const handleRoomAssignment = async (roomNumber) => {
    try {
      const { assignPatientToRoom, releaseRoomBed } = await import('./services/database.js');
      
      // Si el paciente ya tiene habitación, liberar la anterior
      if (bedModalPatient.room) {
        await releaseRoomBed(bedModalPatient.room);
      }
      
      // Asignar a nueva habitación
      await assignPatientToRoom(bedModalPatient.id, roomNumber);
      
      // Actualizar el estado local
      await updatePatient(bedModalPatient.id, { 
        ...bedModalPatient, 
        room: roomNumber 
      });
      
      setBedModalOpen(false);
      setBedModalPatient(null);
    } catch (error) {
      console.error('Error asignando habitación:', error);
      throw error; // El modal mostrará el error
    }
  };

  // --- GESTIÓN DE ALTA MÉDICA ---
  
  const openDischargeModal = (patient) => {
    setDischargePatient(patient);
    setDischargeModalOpen(true);
  };

  const handlePatientDischarge = async (patientId) => {
    try {
      const { dischargePatient } = await import('./services/database.js');
      
      if (!confirm('¿Confirma que desea dar de alta a este paciente?\n\nEsta acción completará el proceso de alta hospitalaria.')) {
        return;
      }
      
      await dischargePatient(patientId);
      
      alert('✅ Alta médica completada exitosamente');
      
      // Recargar la lista de pacientes
      window.location.reload();
    } catch (error) {
      console.error('Error dando de alta al paciente:', error);
      alert(error.message || 'Error al dar de alta al paciente');
    }
  };

  // --- VISTAS DEL DASHBOARD ---

  const OverviewView = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Privacidad - Solo para enfermeros */}
      {user.role === 'nurse' && (
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Users size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-blue-800 mb-1">
                🔒 Vista Filtrada por Asignación
              </p>
              <p className="text-xs text-blue-700">
                Solo visualizas los <strong>{patients.length} paciente(s)</strong> asignados a tu turno <strong>{currentShift}</strong>.
                Los demás pacientes del hospital están protegidos por privacidad de asignación.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Pacientes Asignados" value={patients.length} icon={Users} colorName="blue" subtext={`Turno ${currentShift}`} />
        <StatCard title="Críticos" value={patients.filter(p => p.condition === 'Crítico').length} icon={AlertCircle} colorName="red" subtext="Atención Inmediata" />
        <StatCard title="Medicamentos" value={treatments.length} icon={Pill} colorName="emerald" subtext="Activos hoy" />
        <StatCard title="Citas" value={appointments.length} icon={Calendar} colorName="purple" subtext="Programadas" />
      </div>

      {/* Actividad Reciente */}
      <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-hospital-100 flex items-center justify-between bg-hospital-50">
          <h3 className="font-bold text-hospital-800 flex items-center gap-2">
            <Clock size={20} className="text-clinical-primary" />
            Bitácora Reciente del Turno
          </h3>
        </div>
        
        {/* Banner de Protección NOM-004 */}
        <div className="mx-6 mt-6 mb-4 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">
                🔒 Protección NOM-004-SSA3-2012
              </p>
              <p className="text-xs text-amber-700">
                Todos los registros del expediente clínico son <strong>permanentes e inalterables</strong>. 
                Las notas NO pueden eliminarse para garantizar trazabilidad legal y cumplimiento normativo.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6 pt-0">
          {nurseNotes.length > 0 ? (
            <div className="space-y-4">
              {nurseNotes.slice(0, 5).map((note, idx) => {
                 const pt = patients.find(p => p.id === note.patient_id || p.id === note.patientId);
                 return (
                  <div key={idx} className="flex items-start gap-4 pb-4 border-b border-hospital-100 last:border-0">
                    <div className="bg-blue-50 p-2 rounded-lg text-clinical-primary mt-1">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-hospital-800">
                        {note.note_type || 'Nota'} - {pt ? pt.name : 'Paciente Desconocido'}
                      </p>
                      <p className="text-sm text-hospital-600 italic">"{note.note}"</p>
                      <p className="text-xs text-hospital-400 mt-1 font-medium">{note.date} por {note.nurseName}</p>
                    </div>
                  </div>
                 )
              })}
            </div>
          ) : <p className="text-hospital-400 italic text-center py-4">No hay actividad reciente registrada.</p>}
        </div>
      </div>
    </div>
  );

  const PatientsListView = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 overflow-hidden animate-fadeIn">
      <div className="px-6 py-5 border-b border-hospital-100 bg-hospital-50 flex justify-between items-center">
        <h3 className="font-bold text-hospital-800 flex items-center gap-2">
            <Users size={20} className="text-clinical-primary" />
            Directorio de Pacientes Asignados (ECU-03)
        </h3>
        <button
          onClick={() => setPatientRegModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-sm"
        >
          <UserPlus size={18} />
          Nuevo Paciente
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-hospital-50 text-hospital-500 text-xs uppercase font-bold tracking-wider border-b border-hospital-100">
            <tr>
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Triaje</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4">Diagnóstico</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hospital-100">
            {patients.map((patient) => (
              <tr key={patient.id} className="hover:bg-blue-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-hospital-900">{patient.name}</div>
                  <div className="text-xs text-hospital-500">{patient.age} años | {patient.bloodType}</div>
                </td>
                <td className="px-6 py-4">
                  <TriageBadge 
                    level={patient.triage_level || 'VERDE'} 
                    showText={false}
                    size="md"
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-hospital-700 font-medium">
                    <Building2 size={16} className="text-hospital-400"/> {patient.room}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-hospital-600">
                  {patient.diagnosis || 'En valoración'}
                  {patient.allergies && <div className="text-xs text-red-500 font-bold mt-1">⚠️ {patient.allergies}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                    ${patient.condition === 'Crítico' ? 'bg-red-50 text-red-700 border-red-100' : 
                      patient.condition === 'Estable' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {patient.condition}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => openBedModal(patient)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-purple-600 text-white text-sm font-bold rounded-lg hover:bg-purple-700 transition shadow-sm"
                      title="Asignar/Cambiar Habitación"
                    >
                      <Building2 size={16} />
                    </button>
                    <button 
                      onClick={() => openDischargeModal(patient)}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition shadow-sm"
                      title="Orden de Alta Médica"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => { setSelectedPatientId(patient.id); setActiveTab('care'); }}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-clinical-primary text-white text-sm font-bold rounded-xl hover:bg-clinical-dark transition shadow-sm hover:shadow-md"
                    >
                      Atender <ChevronRight size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CareView = () => {
    const selectedPatient = patients.find(p => p.id == selectedPatientId);
    
    return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fadeIn items-start">
      {/* COLUMNA IZQUIERDA: Contexto del Paciente */}
      <div className="xl:col-span-1 space-y-6 xl:sticky xl:top-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-hospital-200">
          <label className="block text-xs font-bold text-hospital-500 uppercase mb-2 ml-1">Seleccionar Paciente</label>
          <div className="relative">
            <select 
              className="w-full p-3 pl-10 bg-hospital-50 border border-hospital-200 rounded-xl outline-none focus:ring-2 focus:ring-clinical-primary font-medium text-hospital-700 transition"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              <option value="">-- Buscar paciente --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.name} - {p.room}</option>
              ))}
            </select>
            <User className="absolute left-3 top-3.5 text-hospital-400" size={20} />
          </div>

          {selectedPatient ? (
            <div className="mt-6 animate-scaleIn">
              <div className="p-5 bg-clinical-primary/5 rounded-2xl border border-clinical-primary/20 mb-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-clinical-primary text-white flex items-center justify-center font-bold text-xl shadow-lg">
                        {selectedPatient.name.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-bold text-hospital-900 text-lg leading-tight">{selectedPatient.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-hospital-600 mt-1">
                           <span className="bg-white px-2 py-0.5 rounded border border-hospital-200">ID: {selectedPatient.id}</span>
                           <span>{selectedPatient.age} años</span>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className={`p-3 rounded-xl border ${selectedPatient.allergies ? 'bg-red-50 border-red-200' : 'bg-white border-hospital-100'}`}>
                     <span className="text-xs font-bold uppercase block mb-1 text-hospital-500">Alergias</span>
                     <span className={`font-bold ${selectedPatient.allergies ? 'text-red-600' : 'text-emerald-600'}`}>
                        {selectedPatient.allergies || 'Ninguna'}
                     </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-hospital-100">
                    <span className="text-xs font-bold uppercase block mb-1 text-hospital-500">Sangre</span>
                    <span className="font-bold text-hospital-800">{selectedPatient.bloodType}</span>
                  </div>
                </div>
              </div>

              {/* Actualizar Estado */}
              <div className="p-4 bg-white border-2 border-hospital-100 rounded-2xl">
                <label className="block text-xs font-bold text-hospital-500 uppercase mb-2">Condición Clínica</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2.5 bg-hospital-50 border border-hospital-200 rounded-xl text-sm font-bold text-hospital-700 outline-none"
                    value={newCondition || selectedPatient.condition}
                    onChange={(e) => setNewCondition(e.target.value)}
                  >
                    <option value="Estable">🟢 Estable</option>
                    <option value="Crítico">🔴 Crítico</option>
                    <option value="Recuperación">🔵 Recuperación</option>
                    <option value="Observación">🟡 Observación</option>
                  </select>
                  <button onClick={handleConditionUpdate} className="bg-hospital-900 text-white p-2.5 rounded-xl hover:bg-black transition shadow-sm">
                    <Save size={20} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 p-8 border-2 border-dashed border-hospital-200 rounded-2xl text-center bg-hospital-50/50">
                <Stethoscope size={40} className="text-hospital-300 mx-auto mb-3" />
                <p className="text-hospital-500 font-medium text-sm">Seleccione un paciente para habilitar los formularios de registro.</p>
            </div>
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA: Formularios de Acción */}
      {selectedPatient && (
        <div className="xl:col-span-2">
          <CareFormGroup 
            selectedPatient={selectedPatient}
            onVitalSubmit={handleVitalSubmit}
            onMedicationSubmit={handleMedicationSubmit}
            onNoteSubmit={handleNoteSubmit}
            onNonPharmaSubmit={handleNonPharmaSubmit}
          />
        </div>
      )}
    </div>
  );};

  // --- ESTRUCTURA PRINCIPAL (SIDEBAR + MAIN) ---
  return (
    <div className="flex h-screen bg-hospital-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-24'} bg-hospital-900 text-white transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center gap-4 border-b border-hospital-800 mb-2">
          <div className="bg-clinical-primary p-2.5 rounded-xl shadow-lg shadow-clinical-primary/30">
            <Activity size={26} className="text-white" />
          </div>
          {sidebarOpen && (
            <div className="animate-fadeIn">
              <h1 className="font-black text-xl leading-none tracking-tight">San Rafael</h1>
              <span className="text-xs text-hospital-400 font-medium tracking-wide">Gestión Clínica</span>
            </div>
          )}
        </div>
        
        {/* Toggle Sidebar */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="absolute -right-3 top-24 bg-white text-hospital-900 p-1 rounded-full shadow-md border border-hospital-200 hover:scale-110 transition z-30 hidden md:block">
           <ChevronRight size={14} className={sidebarOpen ? 'rotate-180' : ''}/>
        </button>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {/* Sección Clínica */}
          {sidebarOpen && <p className="px-2 text-xs font-bold text-hospital-500 uppercase tracking-wider mb-2 mt-2">Módulos Clínicos</p>}
          {[
            { id: 'overview', label: 'Resumen del Turno', icon: LayoutDashboard },
            { id: 'patients', label: 'Pacientes Asignados', icon: Users },
            { id: 'care', label: 'Zona de Cuidados', icon: Stethoscope },
            { id: 'notes', label: 'Notas Editables', icon: FileText },
            { id: 'inventory', label: 'Inventario de Medicamentos', icon: Pill, onClick: () => setInventoryModalOpen(true) },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-clinical-primary text-white shadow-lg shadow-clinical-primary/20 translate-x-1' 
                  : 'text-hospital-400 hover:bg-hospital-800 hover:text-white'
              }`}
            >
              <item.icon size={20} strokeWidth={2} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Sección Administrativa */}
          <div className="my-4 border-t border-hospital-800"></div>
          {sidebarOpen && <p className="px-2 text-xs font-bold text-hospital-500 uppercase tracking-wider mb-2">Expediente y Personal</p>}
          
          {[
            { id: 'history', label: 'Historiales y Gráficas', icon: ChartIcon },
            { id: 'shiftReport', label: 'Hoja de Enfermería', icon: ClipboardCheck },
            { id: 'profile', label: 'Mi Jornada Laboral', icon: UserCircle },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-clinical-primary text-white shadow-lg shadow-clinical-primary/20 translate-x-1' 
                  : 'text-hospital-400 hover:bg-hospital-800 hover:text-white'
              }`}
            >
              <item.icon size={20} strokeWidth={2} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}

          {/* Sección Sistema (Solo Administradores) */}
          {user.role === 'admin' && (
            <>
              <div className="my-4 border-t border-hospital-800"></div>
              {sidebarOpen && <p className="px-2 text-xs font-bold text-hospital-500 uppercase tracking-wider mb-2">Sistema</p>}
              
              <button
                onClick={() => setInventoryModalOpen(true)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm text-hospital-400 hover:bg-hospital-800 hover:text-white`}
              >
                <Pill size={20} strokeWidth={2} />
                {sidebarOpen && <span>Inventario de Medicamentos</span>}
              </button>
              
              <button
                onClick={() => setActiveTab('errors')}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${
                  activeTab === 'errors' 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 translate-x-1' 
                    : 'text-hospital-400 hover:bg-hospital-800 hover:text-white'
                }`}
              >
                <AlertCircle size={20} strokeWidth={2} />
                {sidebarOpen && <span>Centro de Errores</span>}
              </button>
            </>
          )}
        </nav>

        {/* Footer Usuario */}
        <div className="p-4 border-t border-hospital-800 bg-hospital-900/50">
          <div className={`flex items-center gap-3 mb-4 ${!sidebarOpen && 'justify-center'}`}>
             <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-clinical-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
               {user.name.charAt(0)}
             </div>
             {sidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-bold text-white truncate">{user.name}</p>
                 <p className="text-xs text-hospital-400 truncate">Cédula: {user.cedula}</p>
               </div>
             )}
          </div>
          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-400 bg-red-900/10 hover:bg-red-900/30 hover:text-red-300 transition-colors font-bold text-sm border border-red-900/20 ${!sidebarOpen && 'px-0'}`}>
            <LogOut size={18} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative flex flex-col bg-hospital-50">
        <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-hospital-200 z-10 px-8 py-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h2 className="text-2xl font-black text-hospital-800 tracking-tight">
                {activeTab === 'overview' && 'Tablero de Control'}
                {activeTab === 'patients' && 'Lista de Pacientes'}
                {activeTab === 'care' && 'Gestión de Cuidados'}
                {activeTab === 'notes' && 'Notas de Enfermería'}
                {activeTab === 'history' && 'Análisis Clínico'}
                {activeTab === 'shiftReport' && 'Hoja de Enfermería'}
                {activeTab === 'profile' && 'Perfil Profesional'}
                {activeTab === 'errors' && 'Centro de Errores'}
              </h2>
              <p className="text-hospital-500 text-sm font-medium flex items-center gap-2 mt-1">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sistema en línea • {new Date().toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-hospital-50 hover:bg-hospital-100 text-hospital-600 rounded-xl text-xs font-bold transition border border-hospital-200"
                title="Ver atajos de teclado (Ctrl+/)"
              >
                <Keyboard size={16} />
                Atajos
              </button>
              <button
                onClick={() => setShowTour(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-bold transition border border-blue-200"
                title="Iniciar tour guiado (F1)"
              >
                <Lightbulb size={16} />
                Ayuda
              </button>
              
              {/* Selector de Turno Actual - Solo para enfermeros */}
              {user.role === 'nurse' && (
                <div className="flex items-center gap-2 bg-hospital-50 px-3 py-2 rounded-xl border border-hospital-200">
                  <Clock size={16} className="text-hospital-500" />
                  <select
                    value={currentShift}
                    onChange={(e) => setCurrentShift(e.target.value)}
                    className="bg-transparent text-xs font-bold text-hospital-700 outline-none cursor-pointer"
                    title="Filtrar pacientes por turno"
                  >
                    <option value="Matutino">Turno Matutino</option>
                    <option value="Vespertino">Turno Vespertino</option>
                    <option value="Nocturno">Turno Nocturno</option>
                  </select>
                </div>
              )}
              
              <div className="hidden md:block bg-hospital-50 px-4 py-2 rounded-xl border border-hospital-200 text-xs font-bold text-hospital-600 uppercase tracking-wide">
                  Turno: {user.shift?.start || '00:00'} - {user.shift?.end || '00:00'}
              </div>
            </div>
          </div>
          
          {/* Breadcrumbs para navegación contextual */}
          <Breadcrumbs items={[
            { label: 'Inicio', onClick: () => setActiveTab('overview') },
            { 
              label: activeTab === 'overview' ? 'Tablero' : 
                     activeTab === 'patients' ? 'Pacientes' : 
                     activeTab === 'care' ? 'Cuidados' :
                     activeTab === 'notes' ? 'Notas' :
                     activeTab === 'history' ? 'Historiales' :
                     activeTab === 'shiftReport' ? 'Hoja de Enfermería' :
                     activeTab === 'profile' ? 'Perfil' : 
                     'Sistema'
            }
          ]} />
        </header>

        <div className="p-6 md:p-8 flex-1">
          {patientsLoading ? (
            <div className="flex h-full items-center justify-center flex-col gap-4 opacity-60">
              <div className="w-12 h-12 border-4 border-clinical-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-hospital-600 animate-pulse">Sincronizando base de datos...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewView />}
              {activeTab === 'patients' && <PatientsListView />}
              {activeTab === 'care' && <CareView />}
              {activeTab === 'notes' && (
                <EditableNotesList
                  notes={nurseNotes}
                  onEdit={editNurseNote}
                  onDelete={deleteNurseNote}
                  currentUser={user}
                  title="Gestión de Notas de Enfermería"
                />
              )}
              
              {/* NUEVOS MÓDULOS IMPORTADOS */}
              {activeTab === 'history' && (
                <ReportsAnalytics 
                  patients={patients} 
                  vitalSigns={vitalSigns} 
                  treatments={treatments} 
                  nurseNotes={nurseNotes} 
                />
              )}
              {activeTab === 'shiftReport' && (
                <NursingShiftReport user={user} patients={patients} />
              )}
              {activeTab === 'profile' && <UserProfile user={user} />}
              {activeTab === 'errors' && user.role === 'admin' && (
                <ErrorDashboard userName={user.name} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Reportador de Errores (Para todos los usuarios) */}
      <ErrorReporter userId={user.id} userName={user.name} />
      
      {/* Componentes de Usabilidad */}
      <GuidedTour 
        userRole={user.role}
        onComplete={() => {
          localStorage.setItem(`tour_completed_${user.role}`, 'true');
          setShowTour(false);
        }}
      />
      
      <KeyboardShortcuts
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={[
          { keys: ['Ctrl', '1'], description: 'Ir a Tablero de Control' },
          { keys: ['Ctrl', '2'], description: 'Ir a Lista de Pacientes' },
          { keys: ['Ctrl', '3'], description: 'Ir a Gestión de Cuidados' },
          { keys: ['Ctrl', '4'], description: 'Ir a Notas Editables' },
          { keys: ['Ctrl', 'H'], description: 'Ir a Historiales' },
          { keys: ['Ctrl', 'Shift', 'R'], description: 'Abrir Hoja de Enfermería' },
          { keys: ['Ctrl', '/'], description: 'Ver esta ayuda' },
          { keys: ['F1'], description: 'Iniciar tour guiado' },
          { keys: ['Esc'], description: 'Cerrar diálogos' },
        ]}
      />

      {/* Modal de Gestión de Habitaciones */}
      <BedManagementModal
        isOpen={bedModalOpen}
        onClose={() => {
          setBedModalOpen(false);
          setBedModalPatient(null);
        }}
        onAssignRoom={handleRoomAssignment}
        patientName={bedModalPatient?.name || ''}
        currentRoom={bedModalPatient?.room || null}
      />

      {/* Modal de Registro de Pacientes */}
      <PatientRegistrationForm
        isOpen={patientRegModalOpen}
        onClose={() => setPatientRegModalOpen(false)}
        onPatientAdded={() => {
          setPatientRegModalOpen(false);
          // Recargar lista de pacientes
          window.location.reload();
        }}
      />

      {/* Modal de Orden de Alta Médica */}
      <DischargeOrderModal
        isOpen={dischargeModalOpen}
        onClose={() => {
          setDischargeModalOpen(false);
          setDischargePatient(null);
        }}
        patient={dischargePatient}
        currentUser={user}
        onOrderCreated={() => {
          setDischargeModalOpen(false);
          setDischargePatient(null);
          // Recargar para mostrar la orden actualizada
          window.location.reload();
        }}
      />

      {/* Modal de Inventario de Medicamentos */}
      <MedicationStockManager
        isOpen={inventoryModalOpen}
        onClose={() => setInventoryModalOpen(false)}
      />
    </div>
  );
};

// --- PUNTO DE ENTRADA (APP) ---

// Componente de Notificación Flotante
const ToastContainer = ({ notifications, remove }) => (
  <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
    {notifications.map(n => (
      <div key={n.id} className={`pointer-events-auto min-w-[300px] p-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slideIn border ${
        n.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
        n.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
        'bg-white border-gray-200 text-gray-800'
      }`}>
        {n.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle size={20}/>}
        <div className="flex-1 text-sm font-medium">{n.message}</div>
        <button onClick={() => remove(n.id)}><X size={16}/></button>
      </div>
    ))}
  </div>
);

const HospitalManagementSystem = () => {
  // 1. Estados
  const [notifications, setNotifications] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [appInitialized, setAppInitialized] = useState(false);

  // 2. Función de Notificaciones
  const notify = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  // 3. Función de Login (AQUÍ ES DONDE VA LA VALIDACIÓN)
  const handleLogin = (user) => {
    // Validación de seguridad movida AL LUGAR CORRECTO
    if (user.role === 'patient') {
      notify('⛔ Acceso denegado: Los pacientes no tienen permiso para acceder a este módulo.', 'error');
      return; // Detiene el login
    }
    
    // Si pasa la validación, guardamos el usuario
    setCurrentUser(user);
    notify(`Bienvenido, ${user.name}`, 'success');
  };

  // 4. Inicialización
  useEffect(() => {
    const init = async () => {
      try {
        await initializeApp();
        setTimeout(() => setAppInitialized(true), 1000);
      } catch (err) {
        console.error("Error iniciando app:", err);
        notify("Error de conexión con la base de datos", "error");
      }
    };
    init();
  }, []);

  // 5. Pantalla de Carga
  if (!appInitialized) return (
    <div className="h-screen flex items-center justify-center bg-hospital-50 flex-col gap-6">
       <Activity size={60} className="text-clinical-primary animate-bounce"/>
       <div className="text-center">
         <h2 className="text-2xl font-black text-hospital-800">Hospital San Rafael</h2>
         <p className="text-hospital-500 font-medium mt-2">Cargando Sistema Integral...</p>
       </div>
    </div>
  );

  // 6. Renderizado Principal
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-hospital-50">
        <ToastContainer 
          notifications={notifications} 
          remove={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} 
        />

        {!currentUser ? (
          <LoginForm onLoginSuccess={handleLogin} notify={notify} /> 
        ) : (
          <NurseDashboard 
            user={currentUser} 
            onLogout={() => {
              setCurrentUser(null);
              notify('Sesión cerrada correctamente', 'info');
            }} 
            notify={notify} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default HospitalManagementSystem;
