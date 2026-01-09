import React, { useMemo } from 'react';
import { X, Calendar, Clock, Coffee, FileText, Activity, Users, ClipboardCheck } from 'lucide-react';

export default function NurseScheduleModal({ isOpen, onClose, user }) {
  if (!isOpen) return null;

  // Generamos un horario dinámico basado en el turno del usuario
  const scheduleData = useMemo(() => {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Determinamos horas base según el turno (o por defecto matutino)
    let startHour = 6;
    if (user?.shift?.start) {
      startHour = parseInt(user.shift.start.split(':')[0]);
    }

    const activities = [
      { type: 'Recorrido', label: 'Ronda de Signos Vitales', icon: Activity, color: 'bg-blue-100 text-blue-700' },
      { type: 'Medicacion', label: 'Administración de Medicamentos', icon: Users, color: 'bg-emerald-100 text-emerald-700' },
      { type: 'Documentacion', label: 'Notas de Enfermería', icon: FileText, color: 'bg-amber-100 text-amber-700' },
      { type: 'Descanso', label: 'Colación / Descanso', icon: Coffee, color: 'bg-gray-100 text-gray-600' },
      { type: 'Reporte', label: 'Entrega de Guardia', icon: ClipboardCheck, color: 'bg-purple-100 text-purple-700' },
      { type: 'Curaciones', label: 'Curaciones y Procedimientos', icon: Activity, color: 'bg-red-100 text-red-700' }
    ];

    // Generar 8 bloques de horas
    const hours = Array.from({ length: 8 }, (_, i) => {
      const h = startHour + i;
      return `${h.toString().padStart(2, '0')}:00 - ${(h + 1).toString().padStart(2, '0')}:00`;
    });

    return { days, hours, activities };
  }, [user]);

  // Función para obtener una actividad aleatoria pero consistente (pseudo-random basado en índices)
  const getActivityForSlot = (dayIndex, hourIndex) => {
    // Lógica simple para dar coherencia:
    // Primera hora siempre signos vitales
    if (hourIndex === 0) return scheduleData.activities[0];
    // A mitad del turno, descanso
    if (hourIndex === 4) return scheduleData.activities[3];
    // Última hora, entrega de guardia
    if (hourIndex === 7) return scheduleData.activities[4];
    
    // El resto aleatorio hash simple
    const hash = (dayIndex * 7 + hourIndex * 3) % 4; // Solo variamos entre las actividades clínicas
    const map = [1, 2, 5, 0]; // Índices de actividades
    return scheduleData.activities[map[hash]];
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col border border-hospital-200">
        
        {/* Header */}
        <div className="bg-hospital-900 text-white p-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Calendar size={28} className="text-clinical-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Cronograma de Actividades</h2>
              <p className="text-hospital-300 text-sm font-medium flex items-center gap-2">
                <Clock size={14} /> 
                Turno Asignado: {user?.shift?.start || '00:00'} - {user?.shift?.end || '00:00'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabla Scrollable */}
        <div className="overflow-auto flex-1 p-6 bg-hospital-50">
          <div className="min-w-[1000px]">
            <div className="grid grid-cols-8 gap-4 mb-4">
              <div className="font-bold text-hospital-400 uppercase text-xs tracking-wider flex items-end justify-center pb-2">
                Horario
              </div>
              {scheduleData.days.map(day => (
                <div key={day} className="font-black text-hospital-800 text-center uppercase tracking-wider text-sm bg-white py-3 rounded-xl shadow-sm border border-hospital-100">
                  {day}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {scheduleData.hours.map((hour, hIndex) => (
                <div key={hIndex} className="grid grid-cols-8 gap-4">
                  {/* Columna Hora */}
                  <div className="flex items-center justify-center text-xs font-bold text-hospital-500 bg-hospital-100/50 rounded-xl">
                    {hour}
                  </div>

                  {/* Columnas Días */}
                  {scheduleData.days.map((day, dIndex) => {
                    const activity = getActivityForSlot(dIndex, hIndex);
                    const ActIcon = activity.icon;
                    return (
                      <div key={`${day}-${hour}`} className={`p-3 rounded-xl border border-transparent hover:border-hospital-200 hover:shadow-md transition-all cursor-default group ${activity.color}`}>
                        <div className="flex flex-col items-center text-center gap-1.5">
                          <ActIcon size={18} strokeWidth={2.5} className="opacity-70 group-hover:opacity-100 transition-opacity"/>
                          <span className="text-[10px] font-bold leading-tight line-clamp-2">
                            {activity.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Leyenda */}
        <div className="p-4 bg-white border-t border-hospital-100 text-xs text-hospital-500 flex justify-between items-center shrink-0">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 rounded-full"></div> Clínico</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-100 rounded-full"></div> Administrativo</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 rounded-full"></div> Descanso</span>
          </div>
          <span>Generado automáticamente para: {user?.name}</span>
        </div>
      </div>
    </div>
  );
}