import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import DetallesModal from './components/DetallesModal'; // Añade esta línea
import ConfirmacionModal from './components/ConfirmacionModal'; // Añade esta línea

function App() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  // --- ESTADOS DE LA INTERFAZ ---
  const [menuAbierto, setMenuAbierto] = useState(false);

  // --- ESTADOS DE LA TABLA Y BUSCADOR ---
  const [pedidos, setPedidos] = useState([]);
  const [campoGuardado, setCampoGuardado] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos los estados');
  const [vistaActiva, setVistaActiva] = useState('panel'); // Puede ser 'panel' o 'historial'
  const [ordenFecha, setOrdenFecha] = useState('recientes'); // 'asc' = más próximas primero, 'desc' = más lejanas

  // --- ESTADOS DEL MODAL Y CLONADOR ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [chipsActivos, setChipsActivos] = useState([]);
  const [panokaActivo, setPanokaActivo] = useState(null);
  const [pedidoViendoDetalles, setPedidoViendoDetalles] = useState(null);
  const [modalConfirmacion, setModalConfirmacion] = useState({
    isOpen: false,
    pedido: null,
    accion: '' // Guardará 'Entregar' o 'Cancelar'
  });

  // --- ESTADOS DE PAGINACIÓN DEL HISTORIAL ---
  const [pedidosHistorial, setPedidosHistorial] = useState([]);
  const [paginaHistorial, setPaginaHistorial] = useState(0);
  const [hayMasHistorial, setHayMasHistorial] = useState(true);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const ITEMS_POR_PAGINA = 10;

  // Nuevos estados para el Buscador de Historial
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [sugerencias, setSugerencias] = useState([]);

  const hoy = new Date().toISOString().split('T')[0];

  const estadoInicialForm = {
    cliente: '', celular: '', fecha_pedido: hoy, fecha_entrega: '', estado: 'En Proceso',
    anticipo: 0, saldo: 0, observaciones: '', espalda: '', manga: '', abdomen: '', busto: '',
    l_espalda_1a: '', l_espalda_sg: '', l_espalda_kp: '', l_espalda_4: '', l_espalda_3b: '', l_espalda_gr: '',
    cintura: '', l_pantalon: '', e_pierna: '', cadera: '', muslo: '', botapie: '', rodilla: ''
  };
  const [form, setForm] = useState(estadoInicialForm);

  // --- CONTROL DE SESIÓN ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingAuth(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert("Error al iniciar sesión: Correo o contraseña incorrectos.");
    setLoadingAuth(false);
  };

  const handleLogout = async () => await supabase.auth.signOut();

  // --- LÓGICA DE BASE DE DATOS ---
  useEffect(() => {
    if (session) {
      fetchPedidosActivos();
      fetchHistorialPaginado(0, true);
    }
  }, [session]);

  // Trae SOLO los pedidos activos para el Panel Principal
  const fetchPedidosActivos = async () => {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .not('estado', 'in', '("Entregado","Cancelado")') // Excluye los terminados
      .order('id', { ascending: false });

    if (error) console.error("Error trayendo activos:", error);
    else setPedidos(data);
  };

  // Trae los pedidos cerrados por bloques (Paginación)
  const fetchHistorialPaginado = async (paginaActual, resetear = false) => {
    setCargandoHistorial(true);
    const desde = paginaActual * ITEMS_POR_PAGINA;
    const hasta = desde + ITEMS_POR_PAGINA - 1;

    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .in('estado', ['Entregado', 'Cancelado'])
      .order('id', { ascending: false })
      .range(desde, hasta);

    if (!error && data) {
      if (resetear) {
        setPedidosHistorial(data);
      } else {
        // Añade los nuevos 10 a los que ya estaban en pantalla
        setPedidosHistorial(prev => [...prev, ...data]);
      }
      // Si trajo menos de 10, significa que ya no hay más en la base de datos
      setHayMasHistorial(data.length === ITEMS_POR_PAGINA);
    }
    setCargandoHistorial(false);
  };


  // Corrección para que tome el name dinámico
  const handleChangeCorrecto = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  // --- FUNCIONES DEL CLONADOR DE HISTORIAL ---
  const handleBuscarHistorial = async (e) => {
    const texto = e.target.value;
    setBusquedaHistorial(texto);

    if (texto.trim().length > 1) {
      // Buscamos directamente en la nueva tabla 'clientes' en Supabase
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .ilike('nombre', `%${texto}%`)
        .limit(5);

      if (!error && data) {
        setSugerencias(data);
      }
    } else {
      setSugerencias([]);
    }
  };

  const seleccionarCliente = async (clienteSeleccionado) => {
    // 1. Rellenamos el Nombre y Celular al instante desde la tabla 'clientes'
    setForm(prev => ({
      ...prev,
      cliente: clienteSeleccionado.nombre,
      celular: clienteSeleccionado.celular || ''
    }));

    // Limpiamos el buscador visualmente
    setSugerencias([]);
    setBusquedaHistorial('');

    // 2. Buscamos en 'pedidos' las últimas medidas de este cliente
    const { data: ultimoPedido, error } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente', clienteSeleccionado.nombre)
      .order('created_at', { ascending: false }) // Trae el más reciente primero
      .limit(1)
      .single();

    // Si encontramos un pedido anterior, inyectamos sus medidas
    if (ultimoPedido) {
      setForm(prev => ({
        ...prev,
        espalda: ultimoPedido.espalda || '',
        manga: ultimoPedido.manga || '',
        abdomen: ultimoPedido.abdomen || '',
        busto: ultimoPedido.busto || '',
        l_espalda_1a: ultimoPedido.l_espalda_1a || '',
        l_espalda_sg: ultimoPedido.l_espalda_sg || '',
        l_espalda_kp: ultimoPedido.l_espalda_kp || '',
        l_espalda_4: ultimoPedido.l_espalda_4 || '',
        l_espalda_3b: ultimoPedido.l_espalda_3b || '',
        l_espalda_gr: ultimoPedido.l_espalda_gr || '',
        cintura: ultimoPedido.cintura || '',
        l_pantalon: ultimoPedido.l_pantalon || '',
        e_pierna: ultimoPedido.e_pierna || '',
        cadera: ultimoPedido.cadera || '',
        muslo: ultimoPedido.muslo || '',
        botapie: ultimoPedido.botapie || '',
        rodilla: ultimoPedido.rodilla || ''
      }));

      // Restauramos también los detalles/chips si los tenía
      if (ultimoPedido.detalles && Array.isArray(ultimoPedido.detalles)) {
        const normales = ultimoPedido.detalles.filter(d => !d.startsWith('Panoka'));
        const panoka = ultimoPedido.detalles.find(d => d.startsWith('Panoka'));
        setChipsActivos(normales);
        if (panoka) {
          const match = panoka.match(/\((.*?)\)/);
          if (match) setPanokaActivo(match[1]);
        } else {
          setPanokaActivo(null);
        }
      }
    }
  };

  const guardarNuevoPedido = async (e) => {
    e.preventDefault();
    if (!form.cliente.trim()) { alert("El nombre del cliente es obligatorio"); return; }

    // === CREACIÓN SILENCIOSA DE CLIENTE ===
    const { data: clienteExistente } = await supabase
      .from('clientes')
      .select('id')
      .eq('nombre', form.cliente)
      .single();

    if (!clienteExistente) {
      await supabase.from('clientes').insert([{ nombre: form.cliente, celular: form.celular }]);
    } else if (form.celular) {
      await supabase.from('clientes').update({ celular: form.celular }).eq('nombre', form.cliente);
    }
    // ======================================

    let detallesFinales = [...chipsActivos];
    if (panokaActivo) detallesFinales.push(`Panoka (${panokaActivo})`);

    const nuevoPedido = { ...form, detalles: detallesFinales };

    // --- NUEVO: Sanitización de fechas ---
    // Si el sastre dejó la fecha en blanco, la convertimos en 'null' para que Supabase no colapse.
    if (nuevoPedido.fecha_entrega === '') nuevoPedido.fecha_entrega = null;
    if (nuevoPedido.fecha_pedido === '') nuevoPedido.fecha_pedido = null;
    // --------------------------------------

    const { error } = await supabase.from('pedidos').insert([nuevoPedido]);

    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setIsModalOpen(false);
      setForm(estadoInicialForm);
      setChipsActivos([]);
      setPanokaActivo(null);
      setBusquedaHistorial('');
      setSugerencias([]);
      fetchPedidosActivos();
      setVistaActiva('panel');
    }
  };

  const cerrarModalNuevoPedido = () => {
    setIsModalOpen(false);
    setForm(estadoInicialForm); // Resetea todos los campos de texto
    setChipsActivos([]);        // Limpia los botones de detalles
    setPanokaActivo(null);      // Limpia el botón de Panoka
    setBusquedaHistorial('');   // Limpia el buscador
    setSugerencias([]);         // Limpia la lista desplegable
  };

  const handleInlineUpdate = async (id, campo, nuevoValor) => {
    // 1. Magia visual instantánea: Si se entrega o cancela, lo sacamos de la pantalla
    if (campo === 'estado' && (nuevoValor === 'Entregado' || nuevoValor === 'Cancelado')) {
      setPedidos(pedidos.filter(p => p.id !== id));
    } else {
      // Si es otro cambio (ej. anticipo o cambiar a 'En Proceso'), solo lo actualizamos
      setPedidos(pedidos.map(p => p.id === id ? { ...p, [campo]: nuevoValor } : p));
    }

    setCampoGuardado(`${id}-${campo}`);

    // 2. Se actualiza en la nube de fondo silenciosamente
    const { error } = await supabase.from('pedidos').update({ [campo]: nuevoValor }).eq('id', id);
    if (!error) setTimeout(() => setCampoGuardado(null), 2000);
  };

  const ejecutarAccionFinal = async () => {
    const nuevoEstado = modalConfirmacion.accion === 'Entregar' ? 'Entregado' : 'Cancelado';

    // 1. Cierra el modal AL INSTANTE para eliminar la sensación de lag
    setModalConfirmacion({ isOpen: false, pedido: null, accion: '' });

    // 2. Ejecuta la actualización de fondo (no esperamos la respuesta para la interfaz)
    handleInlineUpdate(modalConfirmacion.pedido.id, 'estado', nuevoEstado);
  };

  // --- FUNCIONES DE INTERFAZ ---
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'En Proceso': return 'bg-blue-100 text-blue-800';
      case 'Pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'Listo para Entrega': return 'bg-green-100 text-green-800';
      case 'Cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const formatearFecha = (fechaDB) => {
    if (!fechaDB) return '';
    // La base de datos entrega "2026-06-25", lo cortamos y lo volteamos
    const [anio, mes, dia] = fechaDB.split('-');
    return `${dia}/${mes}/${anio}`;
  };
  const toggleChip = (chip) => {
    if (chipsActivos.includes(chip)) setChipsActivos(chipsActivos.filter(c => c !== chip));
    else setChipsActivos([...chipsActivos, chip]);
  };

  const handlePanoka = (tipo) => {
    if (panokaActivo === tipo) setPanokaActivo(null);
    else setPanokaActivo(tipo);
  };

  // El Panel Principal ya solo tiene activos, solo aplicamos el buscador y el select
  const pedidosFiltrados = pedidos
    .filter(pedido => {
      const coincideBusqueda = pedido.cliente.toLowerCase().includes(busqueda.toLowerCase()) || (pedido.celular && pedido.celular.includes(busqueda));
      const coincideEstado = filtroEstado === 'Todos los estados' || pedido.estado === filtroEstado;
      return coincideBusqueda && coincideEstado;
    })
    .sort((a, b) => {
      // 1. Modo por defecto: Los recién creados van arriba (Ordenados por ID mayor)
      if (ordenFecha === 'recientes') {
        return b.id - a.id;
      }

      // 2. Modos de Fecha: Próximas o Lejanas
      if (!a.fecha_entrega) return 1;
      if (!b.fecha_entrega) return -1;

      const fechaA = new Date(a.fecha_entrega);
      const fechaB = new Date(b.fecha_entrega);

      return ordenFecha === 'asc' ? fechaA - fechaB : fechaB - fechaA;
    });

  // El Historial ya solo tiene entregados/cancelados, solo aplicamos el buscador
  const pedidosHistorialFiltrados = pedidosHistorial.filter(pedido => {
    const coincideBusqueda = pedido.cliente.toLowerCase().includes(busqueda.toLowerCase()) || (pedido.celular && pedido.celular.includes(busqueda));
    return coincideBusqueda;
  });

  const chipsNormales = ['1A', 'Aula#2', '1C', '3B Tercera', '#4 Abrigo', 'SG', 'Parka', 'KP'];
  const mappingEspalda = [
    { label: '1A', field: 'l_espalda_1a' }, { label: 'SG', field: 'l_espalda_sg' },
    { label: 'KP', field: 'l_espalda_kp' }, { label: '#4', field: 'l_espalda_4' },
    { label: '3B', field: 'l_espalda_3b' }, { label: 'Gr', field: 'l_espalda_gr' }
  ];

  // ==========================================
  // RENDER 1: PANTALLA DE LOGIN
  // ==========================================
  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a] font-sans px-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Sastrería Géminis</h1>
            <p className="text-gray-500 mt-2">Inicia sesión para gestionar los pedidos</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
            </div>
            <button type="submit" disabled={loadingAuth} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400">
              {loadingAuth ? 'Verificando...' : 'Entrar al Sistema'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: PANEL PRINCIPAL
  // ==========================================
  return (
    <div className="flex h-screen bg-gray-100 font-sans relative overflow-hidden">

      {menuAbierto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" onClick={() => setMenuAbierto(false)}></div>
      )}

      <aside className={`fixed md:relative w-64 bg-[#1e293b] text-white flex flex-col z-30 h-full transition-transform transform ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div>
          <div className="p-6 text-2xl font-bold border-b border-gray-700 text-center flex justify-between items-center">
            Sastrería Géminis
            <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setMenuAbierto(false)}>✕</button>
          </div>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => {
                setVistaActiva('panel');
                setMenuAbierto(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium shadow-md transition-colors ${vistaActiva === 'panel' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              Panel Principal
            </button>
            <button
              onClick={() => {
                setVistaActiva('historial');
                setPaginaHistorial(0);              // <-- Reiniciamos la página a 0
                fetchHistorialPaginado(0, true);    // <-- Forzamos una recarga limpia de solo 10
                setMenuAbierto(false);
              }}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium shadow-md transition-colors ${vistaActiva === 'historial' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
            >
              Historial de Pedidos
            </button>
            <button
              onClick={() => { setIsModalOpen(true); setMenuAbierto(false); }}
              className="w-full text-left px-4 py-3 hover:bg-gray-800 text-gray-300 rounded-lg font-medium transition-colors"
            >
              + Nuevo Pedido
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-700 mt-auto">
          <p className="text-xs text-gray-400 mb-2 px-2 truncate">{session.user.email}</p>
          <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-red-600 hover:text-white text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-8 border-b shrink-0">
          <button className="md:hidden mr-4 text-gray-600 hover:text-gray-900" onClick={() => setMenuAbierto(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-800">
            {vistaActiva === 'panel' ? 'Panel de Control' : 'Historial de Pedidos'}
          </h1>
        </header>

        <div className="p-4 md:p-8 flex-1 overflow-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="w-full max-w-2xl flex flex-col sm:flex-row gap-4">
              <input type="text" placeholder="🔍 Buscar por nombre o celular..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
              {vistaActiva === 'panel' && (
                <div className="flex w-full sm:w-auto gap-2">
                  <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                    <option value="Todos los estados">Todos los estados</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Listo para Entrega">Listo para Entrega</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setOrdenFecha(prev => prev === 'recientes' ? 'asc' : prev === 'asc' ? 'desc' : 'recientes')}
                    className={`px-4 py-2 rounded-lg flex-shrink-0 flex items-center gap-2 transition-colors shadow-sm font-medium border ${ordenFecha === 'recientes' ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                    title="Cambiar orden de la tabla"
                  >
                    {ordenFecha === 'recientes' ? '🆕 Recientes' : ordenFecha === 'asc' ? '📅 ↓ Próximas' : '📅 ↑ Lejanas'}
                  </button>
                </div>
              )}
            </div>
            <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors">+ Nuevo Pedido</button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 border-b font-semibold">Cliente</th>
                  <th className="p-4 border-b font-semibold">Celular</th>
                  {vistaActiva === 'panel' && <th className="p-4 border-b font-semibold text-center">Entrega</th>}
                  <th className="p-4 border-b font-semibold text-center">Estado</th>
                  {vistaActiva === 'panel' ? (
                    <>
                      <th className="p-4 border-b font-semibold text-center text-sm text-gray-500">ANTICIPO</th>
                      <th className="p-4 border-b font-semibold text-center text-sm text-gray-500">SALDO</th>
                    </>
                  ) : (
                    <th className="p-4 border-b font-semibold text-center text-sm text-gray-500">COSTO TOTAL</th>
                  )}
                  {vistaActiva === 'panel' && <th className="p-4 border-b font-semibold text-center">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vistaActiva === 'panel' ? (
                  /* --- RENDER DEL PANEL PRINCIPAL --- */
                  pedidosFiltrados.length > 0 ? (
                    pedidosFiltrados.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-800 flex items-center justify-between">
                          {pedido.cliente}
                          <button onClick={() => setPedidoViendoDetalles(pedido)} className="ml-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors" title="Ver Detalles">👁️</button>
                        </td>
                        <td className="p-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>{pedido.celular}</span>
                            {pedido.celular && (
                              <a
                                href={`https://wa.me/591${pedido.celular.trim()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-100 text-green-600 hover:bg-green-500 hover:text-white p-1 rounded-md transition-colors"
                                title="Enviar WhatsApp"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.552 4.162 1.6 5.969L.053 24l6.195-1.516c1.742.946 3.702 1.446 5.783 1.446 6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.969c-1.815 0-3.588-.477-5.154-1.384l-.369-.215-3.83.938.954-3.738-.231-.385a10.024 10.024 0 0 1-1.554-5.261c0-5.569 4.538-10.108 10.108-10.108 5.569 0 10.108 4.538 10.108 10.108s-4.538 10.108-10.108 10.108zm5.538-7.554c-.308-.154-1.815-.9-2.092-1.015-.277-.108-.477-.154-.692.154-.215.308-.8 1.015-.969 1.231-.169.215-.354.246-.662.092-2.123-.984-3.415-2.815-3.83-3.523-.108-.184.062-.308.2-.446.123-.123.277-.308.415-.462.138-.154.185-.277.277-.462.092-.185.046-.354-.031-.5-.077-.154-.692-1.662-.954-2.277-.246-.6-.508-.523-.692-.538-.169-.015-.369-.015-.569-.015s-.523.077-.8.385c-.277.308-1.077 1.046-1.077 2.554s1.108 2.969 1.262 3.169c.154.2 2.154 3.446 5.323 4.723 1.631.662 2.308.708 3.169.585.554-.077 1.815-.738 2.077-1.462.262-.723.262-1.338.185-1.462-.077-.123-.277-.2-.585-.354z" /></svg>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-medium text-gray-700">
                          {pedido.fecha_entrega ? formatearFecha(pedido.fecha_entrega) : <span className="text-gray-400 text-xs italic">Sin fecha</span>}
                        </td>
                        <td className="p-4 text-center">
                          <select value={pedido.estado} onChange={(e) => handleInlineUpdate(pedido.id, 'estado', e.target.value)} className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer outline-none appearance-none text-center ${getEstadoColor(pedido.estado)}`}>
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Proceso">En Proceso</option>
                            <option value="Listo para Entrega">Listo para Entrega</option>
                          </select>
                        </td>
                        <td className="p-4 text-center font-semibold text-gray-800 relative">
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" value={pedido.anticipo} onChange={(e) => setPedidos(pedidos.map(p => p.id === pedido.id ? { ...p, anticipo: e.target.value } : p))} onBlur={(e) => handleInlineUpdate(pedido.id, 'anticipo', e.target.value)} className="w-16 text-center bg-transparent hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded outline-none transition-all" />
                            <span className="text-sm">Bs</span>
                            {campoGuardado === `${pedido.id}-anticipo` && <span className="text-green-500 absolute right-2 font-bold z-10">✓</span>}
                          </div>
                        </td>
                        <td className="p-4 text-center font-semibold text-gray-800 relative">
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" value={pedido.saldo} onChange={(e) => setPedidos(pedidos.map(p => p.id === pedido.id ? { ...p, saldo: e.target.value } : p))} onBlur={(e) => handleInlineUpdate(pedido.id, 'saldo', e.target.value)} className="w-16 text-center bg-transparent hover:bg-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-400 rounded outline-none transition-all" />
                            <span className="text-sm">Bs</span>
                            {campoGuardado === `${pedido.id}-saldo` && <span className="text-green-500 absolute right-2 font-bold z-10">✓</span>}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => setModalConfirmacion({ isOpen: true, pedido: pedido, accion: 'Entregar' })} className="bg-green-100 text-green-700 hover:bg-green-600 hover:text-white px-2 py-1 rounded shadow-sm text-xs font-bold transition-colors" title="Entregar Pedido">✓</button>
                            <button onClick={() => setModalConfirmacion({ isOpen: true, pedido: pedido, accion: 'Cancelar' })} className="bg-red-100 text-red-700 hover:bg-red-600 hover:text-white px-2 py-1 rounded shadow-sm text-xs font-bold transition-colors" title="Cancelar Pedido">✕</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" className="p-8 text-center text-gray-400 italic">No hay pedidos registrados en el panel principal.</td></tr>
                  )
                ) : (
                  /* --- RENDER DEL HISTORIAL (Solo Lectura) --- */
                  pedidosHistorialFiltrados.length > 0 ? (
                    pedidosHistorialFiltrados.map((pedido) => (
                      <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 font-medium text-gray-800 flex items-center justify-between">
                          {pedido.cliente}
                          <button onClick={() => setPedidoViendoDetalles(pedido)} className="ml-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-md transition-colors" title="Ver Detalles">👁️</button>
                        </td>
                        <td className="p-4 text-gray-600">
                          <div className="flex items-center gap-2">
                            <span>{pedido.celular}</span>
                            {pedido.celular && (
                              <a
                                href={`https://wa.me/591${pedido.celular.trim()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-100 text-green-600 hover:bg-green-500 hover:text-white p-1 rounded-md transition-colors"
                                title="Enviar WhatsApp"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 0C5.385 0 0 5.385 0 12.031c0 2.124.552 4.162 1.6 5.969L.053 24l6.195-1.516c1.742.946 3.702 1.446 5.783 1.446 6.646 0 12.031-5.385 12.031-12.031S18.677 0 12.031 0zm0 21.969c-1.815 0-3.588-.477-5.154-1.384l-.369-.215-3.83.938.954-3.738-.231-.385a10.024 10.024 0 0 1-1.554-5.261c0-5.569 4.538-10.108 10.108-10.108 5.569 0 10.108 4.538 10.108 10.108s-4.538 10.108-10.108 10.108zm5.538-7.554c-.308-.154-1.815-.9-2.092-1.015-.277-.108-.477-.154-.692.154-.215.308-.8 1.015-.969 1.231-.169.215-.354.246-.662.092-2.123-.984-3.415-2.815-3.83-3.523-.108-.184.062-.308.2-.446.123-.123.277-.308.415-.462.138-.154.185-.277.277-.462.092-.185.046-.354-.031-.5-.077-.154-.692-1.662-.954-2.277-.246-.6-.508-.523-.692-.538-.169-.015-.369-.015-.569-.015s-.523.077-.8.385c-.277.308-1.077 1.046-1.077 2.554s1.108 2.969 1.262 3.169c.154.2 2.154 3.446 5.323 4.723 1.631.662 2.308.708 3.169.585.554-.077 1.815-.738 2.077-1.462.262-.723.262-1.338.185-1.462-.077-.123-.277-.2-.585-.354z" /></svg>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEstadoColor(pedido.estado)}`}>
                            {pedido.estado}
                          </span>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-800">
                          {Number(pedido.anticipo) + Number(pedido.saldo)} Bs
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400 italic">El historial está vacío. Aún no hay pedidos entregados o cancelados.</td></tr>
                  )
                )}
              </tbody>
            </table>
            {vistaActiva === 'historial' && hayMasHistorial && busqueda === '' && (
              <div className="flex justify-center mt-6 mb-4">
                <button
                  onClick={() => {
                    const siguientePagina = paginaHistorial + 1;
                    setPaginaHistorial(siguientePagina);
                    fetchHistorialPaginado(siguientePagina);
                  }}
                  disabled={cargandoHistorial}
                  className="bg-white border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {cargandoHistorial ? 'Cargando registros...' : 'Cargar más pedidos anteriores'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- MODAL CON FORMULARIO Y BUSCADOR --- */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex justify-center items-start pt-4 md:pt-10 z-50 overflow-y-auto pb-10 px-4">
          <form onSubmit={guardarNuevoPedido} className="bg-white w-full max-w-4xl rounded-xl shadow-2xl p-6 md:p-8 relative">
            <button type="button" onClick={cerrarModalNuevoPedido} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">×</button>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 border-b pb-4 pr-8">Registrar Nuevo Pedido</h2>

            {/* BUSCADOR DE HISTORIAL (CLONADOR) */}
            <div className="mb-8 relative z-40 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="block text-sm font-semibold text-blue-800 mb-2">¿Es un cliente antiguo? Carga sus medidas:</label>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <input
                  type="text"
                  placeholder="Ej. Escribe el nombre del cliente..."
                  value={busquedaHistorial}
                  onChange={handleBuscarHistorial}
                  className="w-full px-4 py-2 bg-white border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Lista de sugerencias */}
              {sugerencias.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                  {sugerencias.map(s => (
                    <div
                      key={s.id}
                      onClick={() => seleccionarCliente(s)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                    >
                      <div className="font-bold text-gray-800">{s.nombre}</div>
                      <div className="text-xs text-gray-500">
                        {s.celular ? `Cel: ${s.celular}` : 'Sin celular registrado'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fila 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Cliente</label><input type="text" name="cliente" value={form.cliente} onChange={handleChangeCorrecto} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Celular</label><input type="text" name="celular" value={form.celular} onChange={handleChangeCorrecto} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Pedido</label><input type="date" name="fecha_pedido" value={form.fecha_pedido} onChange={handleChangeCorrecto} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Entrega</label><input type="date" name="fecha_entrega" value={form.fecha_entrega} onChange={handleChangeCorrecto} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" /></div>
            </div>

            {/* Fila 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div>
                <h3 className="text-blue-600 font-semibold border-b border-blue-200 pb-2 mb-4">Medidas Superior (Torso)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {['espalda', 'manga', 'abdomen', 'busto'].map(field => (
                    <div key={field}><label className="block text-xs text-gray-500 mb-1 capitalize">{field}</label><input type="text" name={field} value={form[field]} onChange={handleChangeCorrecto} className="w-full border rounded p-1 outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  ))}
                  <div className="col-span-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-700 mb-2">L. Espalda (Opcionales)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {mappingEspalda.map(item => (
                        <div key={item.label} className="flex bg-white border rounded overflow-hidden shadow-sm"><span className="bg-gray-200 text-gray-600 px-1 md:px-2 py-1 text-xs font-bold flex items-center justify-center w-8">{item.label}</span><input type="text" name={item.field} value={form[item.field]} onChange={handleChangeCorrecto} className="w-full px-2 py-1 text-sm outline-none" /></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-blue-600 font-semibold border-b border-blue-200 pb-2 mb-4">Medidas Inferior (Piernas)</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[{ label: 'Cintura', field: 'cintura' }, { label: 'L. Pantalón', field: 'l_pantalon' }, { label: 'E. Pierna', field: 'e_pierna' }, { label: 'Cadera', field: 'cadera' }, { label: 'Muslo', field: 'muslo' }, { label: 'Botapié', field: 'botapie' }, { label: 'Rodilla', field: 'rodilla' }].map(item => (
                    <div key={item.field}><label className="block text-xs text-gray-500 mb-1">{item.label}</label><input type="text" name={item.field} value={form[item.field]} onChange={handleChangeCorrecto} className="w-full border rounded p-1 outline-none focus:ring-1 focus:ring-blue-500" /></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fila 3 y 4 */}
            <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-blue-600 mb-3">Detalle del Pedido / Prenda</h3>
              <div className="flex flex-wrap gap-2">
                {chipsNormales.map(chip => (<button type="button" key={chip} onClick={() => toggleChip(chip)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${chipsActivos.includes(chip) ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>{chip}</button>))}
                <div className="w-full h-1"></div>
                <button type="button" onClick={() => handlePanoka('1 pieza')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${panokaActivo === '1 pieza' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'}`}>Panoka (1 Pieza)</button>
                <button type="button" onClick={() => handlePanoka('2 piezas')} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${panokaActivo === '2 piezas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'}`}>Panoka (2 Piezas)</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Anticipo (Bs)</label><input type="number" name="anticipo" value={form.anticipo} onChange={handleChangeCorrecto} className="w-full px-3 py-2 border rounded focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Saldo (Bs)</label><input type="number" name="saldo" value={form.saldo} onChange={handleChangeCorrecto} className="w-full px-3 py-2 border rounded focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Estado</label><select name="estado" value={form.estado} onChange={handleChangeCorrecto} className="w-full px-3 py-2 border rounded focus:outline-none bg-white"><option value="Pendiente">Pendiente</option><option value="En Proceso">En Proceso</option><option value="Listo para Entrega">Listo para Entrega</option><option value="Cancelado">Cancelado</option></select></div>
            </div>

            <div className="mb-6"><label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (OBS)</label><textarea name="observaciones" value={form.observaciones} onChange={handleChangeCorrecto} rows="3" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea></div>

            <div className="flex flex-col-reverse md:flex-row justify-end gap-4 border-t pt-4">
              <button type="button" onClick={cerrarModalNuevoPedido} className="w-full md:w-auto px-6 py-3 md:py-2 border rounded-lg text-gray-700 hover:bg-gray-100 font-medium transition-colors">Cancelar</button>
              <button type="submit" className="w-full md:w-auto px-6 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium shadow-md transition-colors">Guardar Pedido</button>
            </div>
          </form>
        </div>
      )}
      {/* === INYECTA EL MODAL DE DETALLES AQUÍ === */}
      {pedidoViendoDetalles && (
        <DetallesModal
          pedido={pedidoViendoDetalles}
          onClose={() => setPedidoViendoDetalles(null)}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ACCIONES */}
      <ConfirmacionModal
        isOpen={modalConfirmacion.isOpen}
        onClose={() => setModalConfirmacion({ isOpen: false, pedido: null, accion: '' })}
        onConfirm={ejecutarAccionFinal}
        titulo={modalConfirmacion.accion === 'Entregar' ? 'Confirmar Entrega' : 'Cancelar Pedido'}
        mensaje={modalConfirmacion.accion === 'Entregar'
          ? `¿Estás seguro de marcar el pedido de ${modalConfirmacion.pedido?.cliente} como ENTREGADO?`
          : `¿Estás seguro de CANCELAR el pedido de ${modalConfirmacion.pedido?.cliente}?`}
        colorBoton={modalConfirmacion.accion === 'Entregar' ? 'verde' : 'rojo'}
      />
      {/* ======================================== */}
    </div>
  );
}

export default App;