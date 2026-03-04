import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Trash2, Plus } from 'lucide-react';
import { database } from './firebase';
import { ref, set, onValue, remove, update } from 'firebase/database';

const GastosFamilia = () => {
  const [transacciones, setTransacciones] = useState([]);
  const [gastoRecurrente, setGastoRecurrente] = useState([]);
  const [categorias, setCategorias] = useState(['Comida', 'Transporte', 'Servicios', 'Utilidades', 'Salud', 'Entretenimiento', 'Otros']);
  const [usuarios, setUsuarios] = useState(['Yo', 'Pareja']);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Comida',
    tipo: 'gasto',
    usuario: 'Yo'
  });

  const [formRecurrente, setFormRecurrente] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Utilidades',
    tipo: 'gasto',
    frecuencia: 'mensual',
    diaSemana: 0, // 0 = lunes, 6 = domingo
    proximaFecha: new Date().toISOString().split('T')[0]
  });

  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [mostrarAgregarCategoria, setMostrarAgregarCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editandoUsuarios, setEditandoUsuarios] = useState(false);
  const [usuariosTemp, setUsuariosTemp] = useState(usuarios);

  // Cargar datos de Firebase al montar
  useEffect(() => {
    const loadData = async () => {
      try {
        // Cargar transacciones
        const transRef = ref(database, 'gastos-familia/transacciones');
        onValue(transRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setTransacciones(Object.values(data));
          } else {
            setTransacciones([]);
          }
        });

        // Cargar categorías
        const catRef = ref(database, 'gastos-familia/categorias');
        onValue(catRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setCategorias(data);
          }
        });

        // Cargar usuarios
        const usuariosRef = ref(database, 'gastos-familia/usuarios');
        onValue(usuariosRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setUsuarios(data);
          }
        });

        // Cargar gastos recurrentes
        const gastosRef = ref(database, 'gastos-familia/gastosRecurrentes');
        onValue(gastosRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setGastoRecurrente(Object.values(data));
          } else {
            setGastoRecurrente([]);
          }
        });

        setCargando(false);
      } catch (error) {
        console.error('Error cargando datos:', error);
        setCargando(false);
      }
    };

    loadData();
  }, []);

  // Asegurar que la categoría seleccionada exista
  useEffect(() => {
    if (!categorias.includes(form.categoria)) {
      setForm({ ...form, categoria: categorias[0] || 'Otros' });
    }
  }, [categorias]);

  useEffect(() => {
    if (!categorias.includes(formRecurrente.categoria)) {
      setFormRecurrente({ ...formRecurrente, categoria: categorias[0] || 'Otros' });
    }
  }, [categorias]);

  // Funciones para categorías
  const agregarCategoria = async () => {
    if (nuevaCategoria.trim() && !categorias.includes(nuevaCategoria.trim())) {
      const newCategorias = [...categorias, nuevaCategoria.trim()];
      try {
        await set(ref(database, 'gastos-familia/categorias'), newCategorias);
        setNuevaCategoria('');
        setMostrarAgregarCategoria(false);
      } catch (error) {
        console.error('Error al agregar categoría:', error);
      }
    }
  };

  const eliminarCategoria = async (cat) => {
    if (categorias.length > 1) {
      const newCategorias = categorias.filter(c => c !== cat);
      try {
        await set(ref(database, 'gastos-familia/categorias'), newCategorias);
      } catch (error) {
        console.error('Error al eliminar categoría:', error);
      }
    }
  };

  // Funciones para usuarios
  const guardarUsuarios = async () => {
    if (usuariosTemp[0].trim() && usuariosTemp[1].trim()) {
      try {
        await set(ref(database, 'gastos-familia/usuarios'), usuariosTemp);
        setEditandoUsuarios(false);
      } catch (error) {
        console.error('Error al guardar usuarios:', error);
      }
    }
  };

  // Procesar gastos/ingresos recurrentes
  useEffect(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diaSemanaHoy = (hoy.getDay() + 6) % 7; // 0 = lunes, 6 = domingo

    gastoRecurrente.forEach(gasto => {
      let debeAgregar = false;
      let proximaFecha = new Date(gasto.proximaFecha);
      proximaFecha.setHours(0, 0, 0, 0);

      // Verificar si debe agregarse según la frecuencia
      if (gasto.frecuencia === 'dia_semana') {
        // Si la frecuencia es por día de la semana
        if (diaSemanaHoy === gasto.diaSemana && proximaFecha <= hoy) {
          debeAgregar = true;
        }
      } else {
        // Frecuencias antiguas (diario, semanal, etc.)
        if (proximaFecha <= hoy) {
          debeAgregar = true;
        }
      }

      if (debeAgregar) {
        // Agregar transacción
        setTransacciones(prev => [...prev, {
          id: Date.now(),
          descripcion: gasto.descripcion,
          monto: gasto.monto,
          categoria: gasto.categoria,
          tipo: gasto.tipo,
          fecha: new Date().toISOString().split('T')[0],
          usuario: 'Recurrente'
        }]);

        // Actualizar próxima fecha
        setGastoRecurrente(prev => prev.map(g => {
          if (g.id === gasto.id) {
            const newFecha = new Date(proximaFecha);
            
            if (g.frecuencia === 'dia_semana') {
              // Para día de semana, agrega 7 días
              newFecha.setDate(newFecha.getDate() + 7);
            } else if (g.frecuencia === 'diario') {
              newFecha.setDate(newFecha.getDate() + 1);
            } else if (g.frecuencia === 'semanal') {
              newFecha.setDate(newFecha.getDate() + 7);
            } else if (g.frecuencia === 'quincenal') {
              newFecha.setDate(newFecha.getDate() + 15);
            } else if (g.frecuencia === 'mensual') {
              newFecha.setMonth(newFecha.getMonth() + 1);
            }
            
            return { ...g, proximaFecha: newFecha.toISOString().split('T')[0] };
          }
          return g;
        }));
      }
    });
  }, []);

  const agregarTransaccion = async () => {
    if (!form.descripcion || !form.monto) return;

    const newId = Date.now().toString();
    const newTransaccion = {
      id: newId,
      ...form,
      monto: parseFloat(form.monto),
      fecha: new Date().toISOString().split('T')[0]
    };

    try {
      await set(ref(database, `gastos-familia/transacciones/${newId}`), newTransaccion);
      setForm({ descripcion: '', monto: '', categoria: 'Comida', tipo: 'gasto', usuario: 'Yo' });
    } catch (error) {
      console.error('Error al guardar transacción:', error);
    }
  };

  const agregarGastoRecurrente = async () => {
    if (!formRecurrente.descripcion || !formRecurrente.monto) return;

    const newId = Date.now().toString();
    const newGasto = {
      id: newId,
      ...formRecurrente,
      monto: parseFloat(formRecurrente.monto)
    };

    try {
      await set(ref(database, `gastos-familia/gastosRecurrentes/${newId}`), newGasto);
      setFormRecurrente({
        descripcion: '',
        monto: '',
        categoria: 'Utilidades',
        tipo: 'gasto',
        frecuencia: 'mensual',
        diaSemana: 0,
        proximaFecha: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error al guardar gasto recurrente:', error);
    }
  };

  const eliminarTransaccion = async (id) => {
    try {
      await remove(ref(database, `gastos-familia/transacciones/${id}`));
    } catch (error) {
      console.error('Error al eliminar:', error);
    }
  };

  const eliminarGastoRecurrente = async (id) => {
    try {
      await remove(ref(database, `gastos-familia/gastosRecurrentes/${id}`));
    } catch (error) {
      console.error('Error al eliminar gasto recurrente:', error);
    }
  };



  const transaccionesFiltradas = filtroCategoria === 'todas'
    ? transacciones
    : transacciones.filter(t => t.categoria === filtroCategoria);

  // Cálculos
  const gastos = transacciones.filter(t => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0);
  const ingresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
  const balance = ingresos - gastos;

  // Datos para gráficos
  const gastosPorCategoria = categorias.map(cat => ({
    name: cat,
    value: transacciones
      .filter(t => t.tipo === 'gasto' && t.categoria === cat)
      .reduce((sum, t) => sum + t.monto, 0)
  })).filter(d => d.value > 0);

  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - (6 - i));
    return fecha.toISOString().split('T')[0];
  });

  const gastosPorDia = ultimos7Dias.map(fecha => ({
    fecha: fecha.split('-').reverse().join('/'),
    gastos: transacciones
      .filter(t => t.tipo === 'gasto' && t.fecha === fecha)
      .reduce((sum, t) => sum + t.monto, 0)
  }));

  const colores = ['#d4a574', '#8b6f47', '#c9a876', '#a0825d', '#6b5a4a', '#4a3f38', '#d4c5b9'];

  return (
    <div style={{ fontFamily: '"Crimson Text", serif', background: 'linear-gradient(135deg, #f5f0e8 0%, #ede6dc 100%)' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: linear-gradient(135deg, #f5f0e8 0%, #ede6dc 100%);
          font-family: 'Crimson Text', serif;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #8b6f47;
          padding-bottom: 20px;
          animation: slideDown 0.6s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .header h1 {
          font-size: 3.5em;
          color: #2c2417;
          font-weight: 300;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }

        .header p {
          color: #666;
          font-size: 1.1em;
          font-style: italic;
        }

        .balance-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .balance-card {
          background: white;
          padding: 25px;
          border-radius: 3px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-left: 4px solid #d4a574;
          animation: fadeInUp 0.6s ease-out;
          transition: all 0.3s ease;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .balance-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
          transform: translateY(-2px);
        }

        .balance-card.gastos {
          border-left-color: #c47a5e;
        }

        .balance-card.ingresos {
          border-left-color: #7ba576;
        }

        .balance-card h3 {
          color: #666;
          font-size: 0.95em;
          font-weight: 400;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .balance-card .amount {
          font-size: 2.2em;
          font-weight: 300;
          color: #2c2417;
        }

        .content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }

        @media (max-width: 1024px) {
          .content {
            grid-template-columns: 1fr;
          }
        }

        .panel {
          background: white;
          padding: 30px;
          border-radius: 3px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          animation: fadeInUp 0.6s ease-out;
          transition: all 0.3s ease;
        }

        .panel:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }

        .panel h2 {
          font-size: 1.5em;
          color: #2c2417;
          margin-bottom: 20px;
          font-weight: 400;
          padding-bottom: 12px;
          border-bottom: 2px solid #e8dcd0;
        }

        .form-group {
          margin-bottom: 15px;
        }

        .form-group label {
          display: block;
          color: #666;
          margin-bottom: 6px;
          font-size: 0.95em;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px;
          border: 1px solid #d4c5b9;
          border-radius: 2px;
          font-family: 'Crimson Text', serif;
          font-size: 1em;
          background: white;
          color: #2c2417;
          transition: all 0.3s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #8b6f47;
          box-shadow: 0 0 0 3px rgba(139, 111, 71, 0.1);
        }

        .button {
          background: #8b6f47;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 2px;
          cursor: pointer;
          font-family: 'Crimson Text', serif;
          font-size: 1em;
          transition: all 0.3s ease;
          width: 100%;
        }

        .button:hover {
          background: #6b5a42;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .button:active {
          transform: translateY(0);
        }

        .button.secondary {
          background: #d4c5b9;
          color: #2c2417;
        }

        .button.secondary:hover {
          background: #c4b5a9;
        }

        .button.danger {
          background: #c47a5e;
        }

        .button.danger:hover {
          background: #a4635a;
        }

        .button.small {
          padding: 6px 12px;
          width: auto;
          font-size: 0.9em;
        }

        .button-group {
          display: flex;
          gap: 10px;
        }

        .button-group button {
          flex: 1;
        }

        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-bottom: 1px solid #e8dcd0;
          transition: all 0.2s ease;
        }

        .transaction-item:hover {
          background: #f9f6f1;
        }

        .transaction-item:last-child {
          border-bottom: none;
        }

        .transaction-info {
          flex: 1;
        }

        .transaction-desc {
          color: #2c2417;
          font-size: 1em;
          margin-bottom: 4px;
        }

        .transaction-meta {
          font-size: 0.85em;
          color: #999;
        }

        .transaction-amount {
          font-weight: bold;
          margin-right: 15px;
          min-width: 80px;
          text-align: right;
        }

        .transaction-amount.gasto {
          color: #c47a5e;
        }

        .transaction-amount.ingreso {
          color: #7ba576;
        }

        .category-filter {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .filter-button {
          padding: 6px 14px;
          border: 1px solid #d4c5b9;
          background: white;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.3s ease;
          font-family: 'Crimson Text', serif;
        }

        .filter-button.active {
          background: #8b6f47;
          color: white;
          border-color: #8b6f47;
        }

        .filter-button:hover {
          border-color: #8b6f47;
          transform: translateY(-1px);
        }

        .chart-container {
          margin: 20px 0;
          height: 300px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }

        .stat-item {
          background: #f9f6f1;
          padding: 15px;
          border-radius: 2px;
          border-left: 3px solid #d4a574;
        }

        .stat-label {
          font-size: 0.9em;
          color: #666;
          margin-bottom: 5px;
        }

        .stat-value {
          font-size: 1.5em;
          color: #2c2417;
          font-weight: bold;
        }

        .no-data {
          text-align: center;
          color: #999;
          padding: 20px;
        }

        .recurrence-badge {
          display: inline-block;
          background: #e8dcd0;
          color: #666;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          margin-left: 8px;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f9f6f1;
          border-radius: 20px;
          margin: 5px;
          transition: all 0.3s ease;
        }

        .category-item:hover {
          background: #f0e8dc;
        }

        .category-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 15px;
        }

        .usuario-input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }

        .usuario-input-group input {
          flex: 1;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: white;
          padding: 30px;
          border-radius: 3px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        input[type="file"] {
          display: none;
        }
    `}</style>

      <div className="container">
        {cargando ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            fontSize: '1.5em',
            color: '#666'
          }}>
            Cargando datos... 💫
          </div>
        ) : (
          <>
        <div className="header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h1>💰 Gastos Familia</h1>
              <p>Gestión compartida de gastos e ingresos</p>
            </div>
            <button 
              className="button secondary small"
              onClick={() => {
                setEditandoUsuarios(true);
                setUsuariosTemp([...usuarios]);
              }}
              style={{ width: 'auto' }}
            >
              ⚙️ Editar Usuarios
            </button>
          </div>
        </div>

        {/* Modal de editar usuarios */}
        {editandoUsuarios && (
          <div className="modal-overlay" onClick={() => setEditandoUsuarios(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '20px' }}>Editar Nombres de Usuarios</h2>
              <div className="usuario-input-group">
                <input
                  type="text"
                  value={usuariosTemp[0]}
                  onChange={(e) => setUsuariosTemp([e.target.value, usuariosTemp[1]])}
                  placeholder="Nombre usuario 1"
                />
              </div>
              <div className="usuario-input-group">
                <input
                  type="text"
                  value={usuariosTemp[1]}
                  onChange={(e) => setUsuariosTemp([usuariosTemp[0], e.target.value])}
                  placeholder="Nombre usuario 2"
                />
              </div>
              <div className="button-group">
                <button className="button" onClick={guardarUsuarios}>Guardar</button>
                <button className="button secondary" onClick={() => setEditandoUsuarios(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Balance Cards */}
        <div className="balance-section">
          <div className="balance-card">
            <h3>Total Ingresos</h3>
            <div className="amount ingresos">+${ingresos.toFixed(2)}</div>
          </div>
          <div className="balance-card gastos">
            <h3>Total Gastos</h3>
            <div className="amount">${gastos.toFixed(2)}</div>
          </div>
          <div className="balance-card ingresos">
            <h3>Balance</h3>
            <div className="amount" style={{ color: balance >= 0 ? '#7ba576' : '#c47a5e' }}>
              ${balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="content">
          {/* Panel de Categorías */}
          <div className="panel">
            <h2>Gestionar Categorías</h2>
            <div className="category-list">
              {categorias.map(cat => (
                <div key={cat} className="category-item">
                  <span>{cat}</span>
                  {categorias.length > 1 && (
                    <button
                      onClick={() => eliminarCategoria(cat)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#c47a5e',
                        cursor: 'pointer',
                        fontSize: '1em',
                        marginLeft: '8px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!mostrarAgregarCategoria ? (
              <button
                className="button secondary"
                onClick={() => setMostrarAgregarCategoria(true)}
              >
                + Agregar Categoría
              </button>
            ) : (
              <div style={{ marginTop: '15px' }}>
                <input
                  type="text"
                  placeholder="Nombre de nueva categoría"
                  value={nuevaCategoria}
                  onChange={(e) => setNuevaCategoria(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && agregarCategoria()}
                  style={{ marginBottom: '10px' }}
                />
                <div className="button-group">
                  <button className="button" onClick={agregarCategoria}>Agregar</button>
                  <button className="button secondary" onClick={() => {
                    setMostrarAgregarCategoria(false);
                    setNuevaCategoria('');
                  }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {/* Formulario de Transacción */}
          <div className="panel">
            <h2>Nueva Transacción</h2>
            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                placeholder="Ej: Compra de groceries"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>

            <div className="form-group">
              <label>Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quién realiza</label>
              <select value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })}>
                {usuarios.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
                <option value="Compartido">Compartido</option>
              </select>
            </div>

            <button className="button" onClick={agregarTransaccion}>
              <Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Agregar Transacción
            </button>
          </div>
        </div>

        {/* Gráficos */}
        <div className="panel" style={{ marginBottom: '30px' }}>
          <h2>Análisis de Gastos</h2>

          {gastosPorCategoria.length > 0 ? (
            <div>
              <h3 style={{ fontSize: '1.1em', color: '#666', marginBottom: '15px' }}>Por Categoría</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={gastosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {gastosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="no-data">Sin gastos aún</div>
          )}
        </div>

        {/* Últimos 7 días */}
        <div className="panel" style={{ marginBottom: '30px' }}>
          <h2>Tendencia - Últimos 7 Días</h2>
          {gastosPorDia.some(d => d.gastos > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gastosPorDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dcd0" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Bar dataKey="gastos" fill="#d4a574" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">Sin datos</div>
          )}
        </div>

        {/* Gastos Recurrentes */}
        <div className="content">
          <div className="panel">
            <h2>Configurar Gasto/Ingreso Recurrente</h2>
            <div className="form-group">
              <label>Descripción</label>
              <input
                type="text"
                placeholder="Ej: Pago de renta"
                value={formRecurrente.descripcion}
                onChange={(e) => setFormRecurrente({ ...formRecurrente, descripcion: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Monto</label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                value={formRecurrente.monto}
                onChange={(e) => setFormRecurrente({ ...formRecurrente, monto: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Tipo</label>
              <select
                value={formRecurrente.tipo}
                onChange={(e) => setFormRecurrente({ ...formRecurrente, tipo: e.target.value })}
              >
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>

            <div className="form-group">
              <label>Categoría</label>
              <select
                value={formRecurrente.categoria}
                onChange={(e) => setFormRecurrente({ ...formRecurrente, categoria: e.target.value })}
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Frecuencia</label>
              <select
                value={formRecurrente.frecuencia}
                onChange={(e) => setFormRecurrente({ ...formRecurrente, frecuencia: e.target.value })}
              >
                <option value="diario">Diario</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="dia_semana">Día específico de la semana</option>
              </select>
            </div>

            {formRecurrente.frecuencia === 'dia_semana' && (
              <div className="form-group">
                <label>Selecciona el día de la semana</label>
                <select
                  value={formRecurrente.diaSemana}
                  onChange={(e) => setFormRecurrente({ ...formRecurrente, diaSemana: parseInt(e.target.value) })}
                >
                  <option value={0}>Lunes</option>
                  <option value={1}>Martes</option>
                  <option value={2}>Miércoles</option>
                  <option value={3}>Jueves</option>
                  <option value={4}>Viernes</option>
                  <option value={5}>Sábado</option>
                  <option value={6}>Domingo</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Próxima Fecha</label>
              <input
                type="date"
                value={formRecurrente.proximaFecha}
                onChange={(e) => setFormRecurrente({ ...formRecurrente, proximaFecha: e.target.value })}
              />
            </div>

            <button className="button" onClick={agregarGastoRecurrente}>
              <Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Agregar Recurrente
            </button>
          </div>

          <div className="panel">
            <h2>Recurrentes Activos</h2>
            {gastoRecurrente.length > 0 ? (
              <div>
                {gastoRecurrente.map(gasto => {
                  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                  const frecuenciaTexto = gasto.frecuencia === 'dia_semana' 
                    ? `Cada ${diasSemana[gasto.diaSemana]}`
                    : gasto.frecuencia.charAt(0).toUpperCase() + gasto.frecuencia.slice(1);
                  
                  return (
                    <div key={gasto.id} className="transaction-item">
                      <div className="transaction-info">
                        <div className="transaction-desc">
                          {gasto.descripcion}
                          <span className="recurrence-badge">{frecuenciaTexto}</span>
                        </div>
                        <div className="transaction-meta">
                          {gasto.categoria} • {gasto.tipo === 'ingreso' ? '📥 Ingreso' : '📤 Gasto'} • Próx: {gasto.proximaFecha}
                        </div>
                      </div>
                      <div className={`transaction-amount ${gasto.tipo}`} style={{ marginRight: '15px' }}>
                        {gasto.tipo === 'gasto' ? '-' : '+'}${gasto.monto.toFixed(2)}
                      </div>
                      <button
                        className="button danger"
                        onClick={() => eliminarGastoRecurrente(gasto.id)}
                        style={{ width: 'auto', padding: '6px 12px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="no-data">Sin recurrentes configurados</div>
            )}
          </div>
        </div>

        {/* Transacciones */}
        <div className="panel" style={{ marginBottom: '30px' }}>
          <h2>Historial de Transacciones</h2>

          {transacciones.length > 0 && (
            <div className="category-filter">
              <button
                className={`filter-button ${filtroCategoria === 'todas' ? 'active' : ''}`}
                onClick={() => setFiltroCategoria('todas')}
              >
                Todas
              </button>
              {categorias.map(cat => (
                <button
                  key={cat}
                  className={`filter-button ${filtroCategoria === cat ? 'active' : ''}`}
                  onClick={() => setFiltroCategoria(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {transaccionesFiltradas.length > 0 ? (
            <div>
              {[...transaccionesFiltradas].reverse().map(trans => (
                <div key={trans.id} className="transaction-item">
                  <div className="transaction-info">
                    <div className="transaction-desc">{trans.descripcion}</div>
                    <div className="transaction-meta">
                      {trans.categoria} • {trans.usuario} • {trans.fecha}
                    </div>
                  </div>
                  <div className={`transaction-amount ${trans.tipo}`}>
                    {trans.tipo === 'gasto' ? '-' : '+'}${trans.monto.toFixed(2)}
                  </div>
                  <button
                    className="button danger"
                    onClick={() => eliminarTransaccion(trans.id)}
                    style={{ width: 'auto', padding: '6px 12px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">Sin transacciones</div>
          )}
        </div>
      </>
        )}
      </div>
    </div>
  );
};

export default GastosFamilia;