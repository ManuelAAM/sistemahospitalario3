import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, AlertTriangle, Search, Filter, TrendingDown, 
  Calendar, X, RefreshCw, Activity,
  AlertCircle, CheckCircle, Clock, Pill
} from 'lucide-react';
import {
  getStockLevel,
  getStockLevelInfo,
  formatStockInfo,
  getInventoryStatistics,
  searchMedication,
  getMedicationsNearExpiration
} from '../utils/medicationStockValidation';

/**
 * Componente de Gestión de Inventario de Medicamentos
 * Permite visualizar, agregar y actualizar stock de medicamentos
 */
export default function MedicationStockManager({ isOpen, onClose }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState(null);

  // Cargar inventario
  useEffect(() => {
    if (isOpen) {
      loadInventory();
    }
  }, [isOpen]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const { getMedicationInventory } = await import('../services/database.js');
      const data = await getMedicationInventory();
      setInventory(data);
      setStats(getInventoryStatistics(data));
    } catch (error) {
      console.error('Error cargando inventario:', error);
      alert('Error al cargar inventario de medicamentos');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar medicamentos
  const filteredInventory = React.useMemo(() => {
    let filtered = inventory;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = searchMedication(filtered, searchTerm);
    }

    // Filtrar por nivel de stock
    if (filterLevel !== 'ALL') {
      filtered = filtered.filter(item => getStockLevel(item.quantity) === filterLevel);
    }

    return filtered;
  }, [inventory, searchTerm, filterLevel]);



  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                <Package size={32} className="text-blue-600" />
                Inventario de Medicamentos
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Gestión de stock y control de dispensación
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Estadísticas - Solo informativas, sin alertas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-6">
              <StatCard
                label="Total Medicamentos"
                value={stats.total}
                icon={Package}
                color="blue"
              />
            </div>
          )}
        </div>

        {/* Controles */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-3">
            {/* Búsqueda */}
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, ingrediente activo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <button
              onClick={loadInventory}
              className="px-4 py-2.5 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Tabla de inventario */}
        <div className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="text-center">
                <Activity size={48} className="text-blue-600 mx-auto animate-pulse mb-3" />
                <p className="text-gray-600 font-bold">Cargando inventario...</p>
              </div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-20">
              <Package size={64} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-bold text-lg">No se encontraron medicamentos</p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Agrega el primer medicamento al inventario'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Medicamento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">
                      Presentación
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Nivel
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Lote
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">
                      Vencimiento
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInventory.map((item) => {
                    const level = getStockLevel(item.quantity);
                    const levelInfo = getStockLevelInfo(level);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-bold text-gray-800">{item.name}</p>
                            {item.active_ingredient && (
                              <p className="text-xs text-gray-500">{item.active_ingredient}</p>
                            )}
                            {item.is_controlled === 1 && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                ⚠️ CONTROLADO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {item.presentation || 'N/A'}
                          {item.concentration && (
                            <div className="text-xs text-gray-500">{item.concentration}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-lg text-gray-800">
                            {item.quantity}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">{item.unit}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold border-2 ${
                              level === 'CRITICAL'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : level === 'LOW'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : level === 'NORMAL'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {levelInfo.emoji} {levelInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-600">
                          {item.lot_number || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {item.expiration_date ? (
                            <ExpirationBadge date={item.expiration_date} />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer con resumen */}
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          <p>
            Mostrando <strong>{filteredInventory.length}</strong> de <strong>{inventory.length}</strong> medicamentos
            {filterLevel !== 'ALL' && ` • Filtro: ${getStockLevelInfo(filterLevel).label}`}
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente auxiliar para mostrar estadística
function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    green: 'bg-green-50 text-green-600 border-green-200',
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={18} />
        <p className="text-xs font-bold uppercase opacity-75">{label}</p>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

// Componente para mostrar fecha de expiración
function ExpirationBadge({ date }) {
  const today = new Date();
  const expDate = new Date(date);
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
        <AlertCircle size={12} />
        VENCIDO
      </span>
    );
  }

  if (diffDays <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded">
        <Clock size={12} />
        {diffDays}d
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
      <CheckCircle size={12} />
      {new Date(date).toLocaleDateString()}
    </span>
  );
}

// Modal para agregar nuevo medicamento
function AddMedicationModal({ onClose, onAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    active_ingredient: '',
    presentation: '',
    concentration: '',
    category: 'ESTANDAR',
    is_controlled: false,
    quantity: 0,
    unit: 'unidades',
    min_stock: 10,
    max_stock: 100,
    unit_price: 0,
    supplier: '',
    lot_number: '',
    expiration_date: '',
    location: 'Farmacia Principal',
    storage_conditions: 'Temperatura ambiente'
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      const { formatMessage } = await import('../utils/systemMessages.js');
      alert(formatMessage('ERR_02', 'El nombre del medicamento es obligatorio'));
      return;
    }

    setSubmitting(true);

    try {
      const { addMedicationToInventory } = await import('../services/database.js');
      await addMedicationToInventory(formData);
      alert('✅ Medicamento agregado al inventario exitosamente');
      onAdded();
    } catch (error) {
      console.error('Error agregando medicamento:', error);
      alert('Error al agregar medicamento: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 px-6 py-4 border-b border-gray-200 bg-white z-10">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-2">
              <Pill size={28} className="text-blue-600" />
              Agregar Nuevo Medicamento
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nombre del Medicamento *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ingrediente Activo
              </label>
              <input
                type="text"
                value={formData.active_ingredient}
                onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Presentación
              </label>
              <input
                type="text"
                value={formData.presentation}
                onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
                placeholder="Tabletas, Ampolletas, etc."
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Concentración
              </label>
              <input
                type="text"
                value={formData.concentration}
                onChange={(e) => setFormData({ ...formData, concentration: e.target.value })}
                placeholder="500mg, 10ml, etc."
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              >
                <option value="ESTANDAR">📦 Estándar</option>
                <option value="CONTROLADO">⚠️ Controlado</option>
                <option value="ANTIBIOTICO">💊 Antibiótico</option>
                <option value="ALTO_RIESGO">🚨 Alto Riesgo</option>
                <option value="REFRIGERADO">❄️ Refrigerado</option>
              </select>
            </div>
          </div>

          {/* Stock y precios */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Cantidad Inicial
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Stock Mínimo
              </label>
              <input
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Stock Máximo
              </label>
              <input
                type="number"
                value={formData.max_stock}
                onChange={(e) => setFormData({ ...formData, max_stock: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Precio Unitario
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
                min="0"
              />
            </div>
          </div>

          {/* Lote y vencimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Número de Lote
              </label>
              <input
                type="text"
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Proveedor
              </label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Ubicación
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Medicamento controlado */}
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <input
              type="checkbox"
              id="controlled"
              checked={formData.is_controlled}
              onChange={(e) => setFormData({ ...formData, is_controlled: e.target.checked })}
              className="w-5 h-5"
            />
            <label htmlFor="controlled" className="text-sm font-bold text-yellow-800">
              ⚠️ Este es un medicamento controlado (requiere seguimiento especial)
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Agregar Medicamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
