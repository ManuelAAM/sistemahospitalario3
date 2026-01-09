import React, { useState, useEffect } from 'react';
import { Edit3, Trash2, Clock, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  getEditStatusStyle, 
  formatCreationTime, 
  getEditLockMessage, 
  EDIT_TIME_CONFIG 
} from '../utils/editTimeValidation';

/**
 * Componente para mostrar una nota con controles de edición basados en tiempo
 */
export function EditableNoteCard({ note, onEdit, onDelete, currentUser }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState(note.note || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editStatus = note.editStatus;
  const statusStyle = getEditStatusStyle(editStatus);
  const isEditable = editStatus?.isEditable;
  const isWarning = isEditable && editStatus?.hoursRemaining <= EDIT_TIME_CONFIG.WARNING_HOURS;

  const handleEditClick = () => {
    if (!isEditable) {
      alert(getEditLockMessage(editStatus));
      return;
    }
    setEditText(note.note || '');
    setShowEditModal(true);
    setError('');
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) {
      setError('La nota no puede estar vacía');
      return;
    }

    setIsSubmitting(true);
    try {
      await onEdit(note.id, { 
        note: editText.trim(),
        date: new Date().toLocaleString('es-MX')
      });
      
      setShowEditModal(false);
      alert('✅ Nota actualizada correctamente');
    } catch (err) {
      setError(err.message || 'Error al actualizar la nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = async () => {
    // ❌ PROHIBIDO: No permitir eliminación de notas (NOM-004)
    alert(
      '❌ PROHIBIDO: No se pueden eliminar notas médicas\n\n' +
      'De acuerdo con NOM-004-SSA3-2012, todas las notas son permanentes ' +
      'e inmutables para garantizar trazabilidad legal.\n\n' +
      '✓ Opción: Puedes ARCHIVAR notas antiguas dentro de 24 horas de su creación.'
    );
    return;
  };

  return (
    <div className={`border rounded-lg p-4 ${statusStyle.className} transition-all hover:shadow-md`}>
      {/* Header con estado de edición */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusStyle.icon}</span>
          <div>
            <p className="font-bold text-gray-800">{note.nurseName || note.nurse_name}</p>
            {note.patient_name && (
              <p className="text-sm font-semibold text-blue-700">
                👤 Paciente: {note.patient_name} 
                {note.patient_room && <span className="text-gray-500"> • Cuarto {note.patient_room}</span>}
              </p>
            )}
            <p className="text-sm text-gray-600">
              {formatCreationTime(note.created_at)}
            </p>
          </div>
        </div>

        {/* Indicador de tiempo */}
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${statusStyle.className}`}>
          {editStatus?.timeLeft || 'Sin fecha'}
        </div>
      </div>

      {/* Contenido de la nota */}
      <div className="mb-3">
        <p className="text-gray-800 leading-relaxed">{note.note}</p>
        {note.note_type && (
          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {note.note_type}
          </span>
        )}
      </div>

      {/* Advertencia de tiempo limitado */}
      {isWarning && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle size={16} />
            <span className="font-bold">Advertencia: Tiempo limitado para editar</span>
          </div>
          <p className="text-amber-700 mt-1">
            Esta nota solo será editable por {editStatus.timeLeft}. 
            Después quedará bloqueada permanentemente.
          </p>
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex justify-end gap-2">
        <button
          onClick={handleEditClick}
          disabled={!isEditable}
          className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-bold transition ${
            isEditable
              ? 'bg-blue-100 hover:bg-blue-200 text-blue-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={isEditable ? 'Editar nota' : getEditLockMessage(editStatus)}
        >
          {isEditable ? <Edit3 size={16} /> : <Lock size={16} />}
          {isEditable ? 'Editar' : 'Bloqueada'}
        </button>

        <button
          onClick={handleDeleteClick}
          disabled={!isEditable}
          className={`flex items-center gap-1 px-3 py-2 rounded text-sm font-bold transition ${
            isEditable
              ? 'bg-red-100 hover:bg-red-200 text-red-800'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          title={isEditable ? 'Eliminar nota' : 'No se puede eliminar después de 24h'}
        >
          {isEditable ? <Trash2 size={16} /> : <Lock size={16} />}
          {isEditable ? 'Eliminar' : 'Bloqueada'}
        </button>
      </div>

      {/* Modal de edición */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold">Editar Nota de Enfermería</h3>
                {note.patient_name && (
                  <p className="text-sm text-blue-700 mt-1">
                    Paciente: <span className="font-semibold">{note.patient_name}</span>
                    {note.patient_room && <span className="text-gray-500"> • Cuarto {note.patient_room}</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 text-amber-600">
                <Clock size={16} />
                <span className="text-sm font-bold">{editStatus.timeLeft}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block font-bold text-gray-700 mb-2">
                Contenido de la Nota
              </label>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={6}
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500"
                placeholder="Escriba el contenido de la nota..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Caracteres: {editText.length}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded mb-4">
              <div className="flex items-center gap-2 text-amber-800 mb-2">
                <AlertTriangle size={16} />
                <span className="font-bold">Importante</span>
              </div>
              <p className="text-sm text-amber-700">
                Las notas solo pueden editarse dentro de las primeras 24 horas. 
                Después de este período quedarán bloqueadas permanentemente 
                para mantener la integridad del registro médico.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError('');
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting || !editText.trim()}
                className={`px-4 py-2 rounded font-bold text-white ${
                  isSubmitting || !editText.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Componente para mostrar lista de notas con estado de edición
 */
export function EditableNotesList({ notes, onEdit, onDelete, currentUser, title = "Notas de Enfermería" }) {
  const [filter, setFilter] = useState('all'); // all, editable, locked

  const filteredNotes = notes.filter(note => {
    if (filter === 'editable') return note.editStatus?.isEditable;
    if (filter === 'locked') return !note.editStatus?.isEditable;
    return true;
  });

  const editableCount = notes.filter(note => note.editStatus?.isEditable).length;
  const lockedCount = notes.filter(note => !note.editStatus?.isEditable).length;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      {/* Header con filtros */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          
          {/* Estadísticas rápidas */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>{editableCount} editables</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>{lockedCount} bloqueadas</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded text-sm font-bold transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Todas ({notes.length})
          </button>
          <button
            onClick={() => setFilter('editable')}
            className={`px-3 py-2 rounded text-sm font-bold transition ${
              filter === 'editable'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            ✏️ Editables ({editableCount})
          </button>
          <button
            onClick={() => setFilter('locked')}
            className={`px-3 py-2 rounded text-sm font-bold transition ${
              filter === 'locked'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            🔒 Bloqueadas ({lockedCount})
          </button>
        </div>
      </div>

      {/* Lista de notas */}
      <div className="p-6">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg font-bold mb-2">No hay notas {filter === 'all' ? '' : filter === 'editable' ? 'editables' : 'bloqueadas'}</p>
            <p className="text-sm">
              {filter === 'editable' && 'Todas las notas han superado el período de edición de 24h'}
              {filter === 'locked' && 'No hay notas bloqueadas por tiempo'}
              {filter === 'all' && 'No se han registrado notas para este paciente'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotes.map(note => (
              <EditableNoteCard
                key={note.id}
                note={note}
                onEdit={onEdit}
                onDelete={onDelete}
                currentUser={currentUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Banner informativo */}
      {notes.length > 0 && (
        <div className="bg-blue-50 border-t border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
            <div className="text-sm">
              <p className="font-bold text-blue-900">Bloqueo de Edición por Tiempo</p>
              <p className="text-blue-800">
                Las notas de enfermería solo pueden editarse durante las primeras 24 horas 
                después de su creación. Esta medida protege la integridad del registro médico 
                y cumple with regulaciones hospitalarias.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditableNotesList;