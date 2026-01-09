import React, { useState, useCallback, useEffect } from 'react';
import { ClipboardCheck, Users, AlertTriangle, CheckSquare, Clock, Save, FileText, Activity } from 'lucide-react';
import { getDb } from '../services/database';

/**
 * HOJA DIGITAL DE ACTIVIDADES DE ENFERMERÍA
 * Formato completo para registrar todo el turno de trabajo
 * Cumple con NOM-004 (no eliminable, auditable)
 */
export default function NursingShiftReport({ user, patients }) {
  const [currentReport, setCurrentReport] = useState({
    shiftType: getCurrentShift(),
    patientsAssigned: [],
    generalObservations: '',
    incidents: '',
    supervisorName: ''
  });

  const [savedReports, setSavedReports] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Cargar reportes previos al montar
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const db = getDb();
      if (!db) {
        console.error('Database not initialized');
        return;
      }
      const result = await db.select(`
        SELECT * FROM nursing_shift_reports 
        WHERE nurse_id = ? 
        ORDER BY created_at DESC 
        LIMIT 10
      `, [user.id]);
      setSavedReports(result || []);
    } catch (error) {
      console.error('Error loading shift reports:', error);
    }
  };

  const handlePatientToggle = useCallback((patientId) => {
    setCurrentReport(prev => {
      const assigned = prev.patientsAssigned.includes(patientId)
        ? prev.patientsAssigned.filter(id => id !== patientId)
        : [...prev.patientsAssigned, patientId];
      return { ...prev, patientsAssigned: assigned };
    });
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setCurrentReport(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSaveReport = useCallback(async () => {
    if (currentReport.patientsAssigned.length === 0) {
      alert("⚠️ Debes asignar al menos un paciente al reporte de turno.");
      return;
    }

    const now = new Date();
    
    try {
      const db = getDb();
      if (!db) {
        alert("❌ Error: Base de datos no disponible.");
        return;
      }

      await db.execute(`
        INSERT INTO nursing_shift_reports (
          shift_date, shift_type, nurse_id, nurse_name, start_time, 
          patients_assigned, general_observations, incidents, 
          supervisor_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        now.toLocaleDateString('es-MX'),
        currentReport.shiftType,
        user.id,
        user.name,
        now.toLocaleString('es-MX'),
        JSON.stringify(currentReport.patientsAssigned),
        currentReport.generalObservations,
        currentReport.incidents,
        currentReport.supervisorName,
        'Completado'
      ]);

      alert("✅ Hoja de enfermería guardada correctamente.\n\n📋 Este registro es permanente y auditable (NOM-004).");
      
      // Limpiar formulario
      setCurrentReport({
        shiftType: getCurrentShift(),
        patientsAssigned: [],
        generalObservations: '',
        incidents: '',
        supervisorName: ''
      });

      // Recargar historial
      await loadReports();
    } catch (error) {
      console.error('Error saving shift report:', error);
      alert("❌ Error al guardar la hoja de enfermería: " + error.message);
    }
  }, [currentReport, user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-clinical-primary to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <ClipboardCheck size={32} />
              Hoja Digital de Actividades de Enfermería
            </h2>
            <p className="text-purple-100 mt-2">
              Formato completo para registrar tu turno • <strong>{user.name}</strong>
            </p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-bold transition flex items-center gap-2"
          >
            <FileText size={18} />
            {showHistory ? 'Ocultar Historial' : 'Ver Historial'}
          </button>
        </div>
      </div>

      {showHistory ? (
        <HistoryView reports={savedReports} patients={patients} onClose={() => setShowHistory(false)} />
      ) : (
        <ReportForm
          report={currentReport}
          patients={patients}
          onPatientToggle={handlePatientToggle}
          onFieldChange={handleFieldChange}
          onSave={handleSaveReport}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENTES ---

function getCurrentShift() {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 15) return 'Mañana';
  if (hour >= 15 && hour < 23) return 'Tarde';
  return 'Noche';
}

/**
 * Formulario de Reporte de Turno
 */
function ReportForm({ report, patients, onPatientToggle, onFieldChange, onSave }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Columna 1: Información del Turno */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg text-white">
              <Clock size={20} />
            </div>
            <h3 className="font-bold text-hospital-800">Información del Turno</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-hospital-500 mb-1 block">Turno Actual</label>
              <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-700">
                {(() => {
                  const hour = new Date().getHours();
                  if (hour >= 7 && hour < 15) return '☀️ Mañana (07:00 - 15:00)';
                  if (hour >= 15 && hour < 23) return '🌤️ Tarde (15:00 - 23:00)';
                  return '🌙 Noche (23:00 - 07:00)';
                })()}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-hospital-500 mb-1 block">Supervisor/a del Turno</label>
              <input
                type="text"
                placeholder="Nombre del/la supervisor/a"
                className="w-full p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-blue-500 transition"
                value={report.supervisorName}
                onChange={(e) => onFieldChange('supervisorName', e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-hospital-500 mb-1 block">Fecha y Hora</label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl font-bold text-blue-700 text-sm">
                📅 {new Date().toLocaleString('es-MX', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Pacientes Asignados */}
        <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-green-500 p-2 rounded-lg text-white">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-hospital-800">Pacientes a mi Cargo</h3>
          </div>

          <p className="text-xs text-hospital-500 mb-3">
            Selecciona los pacientes que atendiste durante este turno:
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {patients.map(patient => (
              <label
                key={patient.id}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                  report.patientsAssigned.includes(patient.id)
                    ? 'bg-green-50 border-green-500'
                    : 'bg-hospital-50 border-hospital-200 hover:border-green-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={report.patientsAssigned.includes(patient.id)}
                  onChange={() => onPatientToggle(patient.id)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-bold text-hospital-800 text-sm">{patient.name}</p>
                  <p className="text-xs text-hospital-500">
                    {patient.location || 'Sin ubicación'} • {patient.condition || 'N/A'}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm font-bold text-green-700">
              ✅ {report.patientsAssigned.length} paciente(s) seleccionado(s)
            </p>
          </div>
        </div>
      </div>

      {/* Columna 2: Observaciones y Eventos */}
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <h3 className="font-bold text-hospital-800">Observaciones Generales</h3>
          </div>

          <textarea
            rows="6"
            placeholder="Describe el estado general del área, cumplimiento de protocolos, limpieza, funcionamiento de equipos, etc."
            className="w-full p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-purple-500 transition resize-none"
            value={report.generalObservations}
            onChange={(e) => onFieldChange('generalObservations', e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-500 p-2 rounded-lg text-white">
              <AlertTriangle size={20} />
            </div>
            <h3 className="font-bold text-hospital-800">Incidentes o Eventos Críticos</h3>
          </div>

          <textarea
            rows="6"
            placeholder="Registra cualquier evento adverso, caída, reacción medicamentosa, código azul, etc. Deja en blanco si no hubo incidentes."
            className="w-full p-3 bg-hospital-50 border border-hospital-200 rounded-xl font-medium outline-none focus:border-orange-500 transition resize-none"
            value={report.incidents}
            onChange={(e) => onFieldChange('incidents', e.target.value)}
          />

          <p className="text-xs text-orange-600 mt-2 font-medium">
            ⚠️ Los incidentes reportados aquí quedan registrados de forma permanente (NOM-004)
          </p>
        </div>

        {/* Botón Guardar */}
        <button
          onClick={onSave}
          className="w-full py-4 bg-gradient-to-r from-clinical-primary to-purple-600 text-white rounded-xl font-bold hover:from-clinical-dark hover:to-purple-700 transition shadow-lg flex items-center justify-center gap-3 text-lg"
        >
          <Save size={24} />
          💾 Guardar Hoja de Enfermería
        </button>

        <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl p-4">
          <p className="text-xs text-blue-700 font-medium text-center">
            🔒 <strong>NOM-004:</strong> Este registro es permanente, auditable y no puede eliminarse una vez guardado.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Vista de Historial de Reportes
 */
function HistoryView({ reports, patients, onClose }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-hospital-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-hospital-800">📋 Historial de Hojas de Enfermería</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-hospital-100 hover:bg-hospital-200 text-hospital-700 rounded-xl font-bold transition"
        >
          Cerrar
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-hospital-400">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">No hay reportes de turno registrados aún.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => {
            const assignedPatients = JSON.parse(report.patients_assigned || '[]');
            const patientNames = assignedPatients
              .map(id => patients.find(p => p.id === id)?.name || `ID: ${id}`)
              .join(', ');

            return (
              <div
                key={report.id}
                className="border-2 border-hospital-200 rounded-xl p-5 hover:border-clinical-primary transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg text-hospital-800">
                        {report.shift_type} - {report.shift_date}
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        {report.status}
                      </span>
                    </div>
                    <p className="text-sm text-hospital-500">
                      👤 {report.nurse_name} • 🕐 {report.start_time}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-bold text-hospital-700 mb-1">👥 Pacientes Atendidos:</p>
                    <p className="text-hospital-600">{patientNames || 'Ninguno'}</p>
                  </div>
                  {report.supervisor_name && (
                    <div>
                      <p className="font-bold text-hospital-700 mb-1">👨‍⚕️ Supervisor:</p>
                      <p className="text-hospital-600">{report.supervisor_name}</p>
                    </div>
                  )}
                </div>

                {report.general_observations && (
                  <div className="mt-3">
                    <p className="font-bold text-hospital-700 text-sm mb-1">📝 Observaciones:</p>
                    <p className="text-hospital-600 text-sm bg-hospital-50 p-3 rounded-lg">
                      {report.general_observations}
                    </p>
                  </div>
                )}

                {report.incidents && (
                  <div className="mt-3">
                    <p className="font-bold text-orange-700 text-sm mb-1 flex items-center gap-1">
                      <AlertTriangle size={14} /> Incidentes:
                    </p>
                    <p className="text-orange-600 text-sm bg-orange-50 p-3 rounded-lg border border-orange-200">
                      {report.incidents}
                    </p>
                  </div>
                )}

                {report.pending_tasks && (
                  <div className="mt-3">
                    <p className="font-bold text-amber-700 text-sm mb-1">⏳ Pendientes:</p>
                    <p className="text-amber-600 text-sm bg-amber-50 p-3 rounded-lg">
                      {report.pending_tasks}
                    </p>
                  </div>
                )}

                {report.handover_notes && (
                  <div className="mt-3">
                    <p className="font-bold text-teal-700 text-sm mb-1">🔄 Notas de Relevo:</p>
                    <p className="text-teal-600 text-sm bg-teal-50 p-3 rounded-lg">
                      {report.handover_notes}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
