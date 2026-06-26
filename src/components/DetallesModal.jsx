import React from 'react';

function DetallesModal({ pedido, onClose }) {
  if (!pedido) return null;
  const formatearFecha = (fechaDB) => {
    if (!fechaDB) return 'Sin fecha';
    const [anio, mes, dia] = fechaDB.split('-');
    return `${dia}/${mes}/${anio}`;
  };
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-10 z-50 overflow-y-auto pb-10 px-4">
      <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl p-8 relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center"
        >
          ×
        </button>
        
        <div className="flex justify-between items-center border-b pb-4 mb-6 pr-8">
          <h2 className="text-2xl font-bold text-gray-800">Detalles del Pedido</h2>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
            {pedido.estado}
          </span>
        </div>

        {/* Datos del Cliente */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-xs text-gray-500 font-semibold">CLIENTE</p>
            <p className="font-bold text-gray-800">{pedido.cliente}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">CELULAR</p>
            <p className="font-bold text-gray-800">{pedido.celular || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">FECHA PEDIDO</p>
            <p className="font-bold text-gray-800">{formatearFecha(pedido.fecha_pedido)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">FECHA ENTREGA</p>
            <p className="font-bold text-gray-800">{formatearFecha(pedido.fecha_entrega)}</p>
          </div>
        </div>

        {/* Medidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Superior */}
          <div>
            <h3 className="text-blue-600 font-semibold border-b border-blue-200 pb-2 mb-3">Superior (Torso)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">Espalda:</span> {pedido.espalda || '-'}</p>
              <p><span className="text-gray-500">Manga:</span> {pedido.manga || '-'}</p>
              <p><span className="text-gray-500">Abdomen:</span> {pedido.abdomen || '-'}</p>
              <p><span className="text-gray-500">Busto:</span> {pedido.busto || '-'}</p>
            </div>
            <div className="mt-3 bg-white border rounded p-2 text-sm grid grid-cols-3 gap-1">
              <p><span className="text-gray-400 font-bold">1A:</span> {pedido.l_espalda_1a || '-'}</p>
              <p><span className="text-gray-400 font-bold">SG:</span> {pedido.l_espalda_sg || '-'}</p>
              <p><span className="text-gray-400 font-bold">KP:</span> {pedido.l_espalda_kp || '-'}</p>
              <p><span className="text-gray-400 font-bold">#4:</span> {pedido.l_espalda_4 || '-'}</p>
              <p><span className="text-gray-400 font-bold">3B:</span> {pedido.l_espalda_3b || '-'}</p>
              <p><span className="text-gray-400 font-bold">Gr:</span> {pedido.l_espalda_gr || '-'}</p>
            </div>
          </div>

          {/* Inferior */}
          <div>
            <h3 className="text-blue-600 font-semibold border-b border-blue-200 pb-2 mb-3">Inferior (Piernas)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><span className="text-gray-500">Cintura:</span> {pedido.cintura || '-'}</p>
              <p><span className="text-gray-500">L. Pantalón:</span> {pedido.l_pantalon || '-'}</p>
              <p><span className="text-gray-500">E. Pierna:</span> {pedido.e_pierna || '-'}</p>
              <p><span className="text-gray-500">Cadera:</span> {pedido.cadera || '-'}</p>
              <p><span className="text-gray-500">Muslo:</span> {pedido.muslo || '-'}</p>
              <p><span className="text-gray-500">Botapié:</span> {pedido.botapie || '-'}</p>
              <p><span className="text-gray-500">Rodilla:</span> {pedido.rodilla || '-'}</p>
            </div>
          </div>
        </div>

        {/* Detalles Prenda / Chips */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Detalles del Pedido / Prenda</h3>
          <div className="flex flex-wrap gap-2">
            {pedido.detalles && pedido.detalles.length > 0 ? (
              pedido.detalles.map((detalle, index) => (
                <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                  {detalle}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400 italic">Sin detalles específicos</span>
            )}
          </div>
        </div>

        {/* Observaciones */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Observaciones</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-800 min-h-[60px]">
            {pedido.observaciones || <span className="text-gray-400 italic">Ninguna observación registrada.</span>}
          </div>
        </div>

        {/* Botón Cerrar */}
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium transition-colors"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
}

export default DetallesModal;