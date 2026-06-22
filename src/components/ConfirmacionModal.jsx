import React from 'react';

function ConfirmacionModal({ isOpen, onClose, onConfirm, titulo, mensaje, colorBoton }) {
  if (!isOpen) return null;

  const colorClases = colorBoton === 'rojo' 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'bg-green-600 hover:bg-green-700';

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 px-4">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">{titulo}</h2>
        <p className="text-gray-600 mb-6">{mensaje}</p>
        <div className="flex justify-center gap-4">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-6 py-2 text-white rounded-lg font-medium shadow-md transition-colors ${colorClases}`}
          >
            Sí, confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmacionModal;