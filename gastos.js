const API_URL = 'https://jc-g.onrender.com/api';

let usuarioActual = null;
let gastos = [];
let gastoEditando = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    cargarDatosUsuario();
    cargarGastos();
    cargarEstadisticas();
    inicializarEventos();
});

// Verificar autenticación
function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    
    if (!token || !usuario) {
        window.location.href = '/index.html';
        return;
    }
    
    try {
        usuarioActual = JSON.parse(usuario);
        
        // Mostrar link de administración si es admin
        if (usuarioActual.rol === 'administrador') {
            document.getElementById('adminLink').style.display = 'flex';
            document.getElementById('userRole').textContent = 'Administrador';
        }
    } catch (error) {
        console.error('Error al parsear usuario:', error);
        window.location.href = '/index.html';
    }
}

// Cargar datos del usuario
function cargarDatosUsuario() {
    if (usuarioActual) {
        document.getElementById('userName').textContent = usuarioActual.nombreUsuario;
        document.getElementById('empresaNombre').textContent = usuarioActual.empresa.nombre;
    }
}

// Inicializar eventos
function inicializarEventos() {
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    document.getElementById('btnGenerar').addEventListener('click', generarCamposGastos);
    document.getElementById('btnCancelar').addEventListener('click', limpiarFormulario);
    document.getElementById('btnGuardar').addEventListener('click', guardarGastos);
    document.getElementById('filtroCategoria').addEventListener('change', filtrarGastos);
}

// Generar campos de gastos
function generarCamposGastos() {
    const cantidad = parseInt(document.getElementById('cantidadGastos').value);
    
    if (!cantidad || cantidad < 1 || cantidad > 10) {
        mostrarMensaje('Por favor ingresa una cantidad válida (1-10)', 'error');
        return;
    }
    
    const container = document.getElementById('gastosInputsContainer');
    container.innerHTML = '';
    
    for (let i = 0; i < cantidad; i++) {
        const gastoGroup = crearCampoGasto(i + 1);
        container.appendChild(gastoGroup);
    }
    
    document.getElementById('formActions').style.display = 'flex';
    
    // Scroll suave al primer input
    setTimeout(() => {
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Crear campo de gasto individual
function crearCampoGasto(numero) {
    const div = document.createElement('div');
    div.className = 'gasto-input-group';
    div.style.animationDelay = `${numero * 0.05}s`;
    
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    div.innerHTML = `
        <div class="gasto-header-input">
            <h4>💸 Gasto #${numero}</h4>
            ${numero > 1 ? `<button class="btn-remove-gasto" onclick="eliminarCampoGasto(this)">✕ Eliminar</button>` : ''}
        </div>
        <div class="gasto-fields">
            <div class="form-group">
                <label>Descripción *</label>
                <input type="text" class="input-field" name="descripcion" required placeholder="Ej: Compra de alimento">
            </div>
            <div class="form-group">
                <label>Monto ($) *</label>
                <input type="number" class="input-field" name="monto" min="0" step="0.01" required placeholder="0.00">
            </div>
            <div class="form-group">
                <label>Categoría *</label>
                <select class="input-field" name="categoria" required>
                    <option value="alimentacion">🌾 Alimentación</option>
                    <option value="veterinario">💉 Veterinario</option>
                    <option value="mantenimiento">🔧 Mantenimiento</option>
                    <option value="transporte">🚛 Transporte</option>
                    <option value="otros">📦 Otros</option>
                </select>
            </div>
            <div class="form-group">
                <label>Fecha *</label>
                <input type="date" class="input-field" name="fecha" value="${fechaHoy}" required>
            </div>
        </div>
    `;
    
    return div;
}

// Eliminar campo de gasto
function eliminarCampoGasto(button) {
    const gastoGroup = button.closest('.gasto-input-group');
    gastoGroup.style.animation = 'slideOut 0.3s ease';
    
    setTimeout(() => {
        gastoGroup.remove();
        
        // Renumerar gastos
        const gastosGroups = document.querySelectorAll('.gasto-input-group');
        gastosGroups.forEach((group, index) => {
            const header = group.querySelector('.gasto-header-input h4');
            header.textContent = `💸 Gasto #${index + 1}`;
        });
        
        // Si no quedan gastos, ocultar botones
        if (gastosGroups.length === 0) {
            document.getElementById('formActions').style.display = 'none';
        }
    }, 300);
}

// Guardar gastos
async function guardarGastos() {
    const gastosGroups = document.querySelectorAll('.gasto-input-group');
    
    if (gastosGroups.length === 0) {
        mostrarMensaje('No hay gastos para guardar', 'error');
        return;
    }
    
    const gastosData = [];
    let hayErrores = false;
    
    gastosGroups.forEach((group, index) => {
        const descripcion = group.querySelector('[name="descripcion"]').value.trim();
        const monto = parseFloat(group.querySelector('[name="monto"]').value);
        const categoria = group.querySelector('[name="categoria"]').value;
        const fecha = group.querySelector('[name="fecha"]').value;
        
        if (!descripcion || !monto || monto <= 0 || !categoria || !fecha) {
            mostrarMensaje(`El gasto #${index + 1} tiene campos incompletos o inválidos`, 'error');
            hayErrores = true;
            return;
        }
        
        gastosData.push({
            descripcion,
            monto,
            categoria,
            fecha
        });
    });
    
    if (hayErrores || gastosData.length === 0) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const btnGuardar = document.getElementById('btnGuardar');
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span>⏳</span> Guardando...';
        
        const response = await fetch(`${API_URL}/gastos/multiple`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ gastos: gastosData })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar gastos');
        }
        
        const data = await response.json();
        mostrarMensaje(data.mensaje || 'Gastos guardados exitosamente', 'success');
        
        limpiarFormulario();
        cargarGastos();
        cargarEstadisticas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error.message, 'error');
    } finally {
        const btnGuardar = document.getElementById('btnGuardar');
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<span>💾</span> Guardar Gastos';
    }
}

// Limpiar formulario
function limpiarFormulario() {
    document.getElementById('cantidadGastos').value = '1';
    document.getElementById('gastosInputsContainer').innerHTML = '';
    document.getElementById('formActions').style.display = 'none';
}

// Cargar gastos
async function cargarGastos() {
    const loadingContainer = document.getElementById('loadingContainer');
    const errorContainer = document.getElementById('errorContainer');
    const gastosLista = document.getElementById('gastosLista');
    
    loadingContainer.style.display = 'flex';
    errorContainer.style.display = 'none';
    gastosLista.style.display = 'none';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gastos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar gastos');
        }
        
        gastos = await response.json();
        mostrarGastos(gastos);
        
        loadingContainer.style.display = 'none';
        gastosLista.style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'flex';
        document.getElementById('errorMessage').textContent = error.message;
    }
}

// Mostrar gastos
function mostrarGastos(gastosArray) {
    const lista = document.getElementById('gastosLista');
    
    if (gastosArray.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">💸</span>
                <h3>No hay gastos registrados</h3>
                <p>Comienza registrando los gastos de tu empresa ganadera</p>
            </div>
        `;
        return;
    }
    
    lista.innerHTML = gastosArray.map((gasto, index) => {
        const esPropio = gasto.usuarioRegistro._id === usuarioActual.id;
        const esAdmin = usuarioActual.rol === 'administrador';
        const puedeEditar = esAdmin || esPropio;
        const puedeEliminar = esAdmin || esPropio;
        
        return `
            <div class="gasto-card" style="animation-delay: ${index * 0.05}s">
                <div class="gasto-info">
                    <div class="gasto-categoria-icon categoria-${gasto.categoria}">
                        ${obtenerIconoCategoria(gasto.categoria)}
                    </div>
                    <div class="gasto-detalles">
                        <h3 class="gasto-descripcion">${gasto.descripcion}</h3>
                        <div class="gasto-meta">
                            <span class="gasto-meta-item">
                                <span>📅</span> ${formatearFecha(gasto.fecha)}
                            </span>
                            <span class="gasto-meta-item">
                                <span>👤</span> ${gasto.usuarioRegistro.nombreUsuario}
                            </span>
                            <span class="gasto-meta-item">
                                <span>📂</span> ${formatearCategoria(gasto.categoria)}
                            </span>
                        </div>
                    </div>
                    <div class="gasto-monto">
                        $${gasto.monto.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
                <div class="gasto-actions">
                    <button class="btn-edit" onclick="abrirModalEdicion('${gasto._id}')" 
                            ${!puedeEditar ? 'disabled' : ''} 
                            title="${!puedeEditar ? 'No puedes editar este gasto' : 'Editar gasto'}">
                        ✏️
                    </button>
                    <button class="btn-delete" onclick="eliminarGasto('${gasto._id}')" 
                            ${!puedeEliminar ? 'disabled' : ''} 
                            title="${!puedeEliminar ? 'No puedes eliminar este gasto' : 'Eliminar gasto'}">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Obtener icono de categoría
function obtenerIconoCategoria(categoria) {
    const iconos = {
        'alimentacion': '🌾',
        'veterinario': '💉',
        'mantenimiento': '🔧',
        'transporte': '🚛',
        'otros': '📦'
    };
    return iconos[categoria] || '📦';
}

// Formatear categoría
function formatearCategoria(categoria) {
    const categorias = {
        'alimentacion': 'Alimentación',
        'veterinario': 'Veterinario',
        'mantenimiento': 'Mantenimiento',
        'transporte': 'Transporte',
        'otros': 'Otros'
    };
    return categorias[categoria] || 'Otros';
}

// Filtrar gastos
function filtrarGastos() {
    const categoriaFiltro = document.getElementById('filtroCategoria').value;
    
    if (!categoriaFiltro) {
        mostrarGastos(gastos);
        return;
    }
    
    const gastosFiltrados = gastos.filter(gasto => gasto.categoria === categoriaFiltro);
    mostrarGastos(gastosFiltrados);
}

// Abrir modal de edición
function abrirModalEdicion(gastoId) {
    const gasto = gastos.find(g => g._id === gastoId);
    
    if (!gasto) return;
    
    // Verificar permisos
    const esPropio = gasto.usuarioRegistro._id === usuarioActual.id;
    const esAdmin = usuarioActual.rol === 'administrador';
    
    if (!esAdmin && !esPropio) {
        mostrarMensaje('No tienes permiso para editar este gasto', 'error');
        return;
    }
    
    gastoEditando = gasto;
    
    document.getElementById('editDescripcion').value = gasto.descripcion;
    document.getElementById('editMonto').value = gasto.monto;
    document.getElementById('editCategoria').value = gasto.categoria;
    document.getElementById('editFecha').value = gasto.fecha.split('T')[0];
    
    document.getElementById('editModal').style.display = 'flex';
}

// Cerrar modal de edición
function cerrarModalEdicion() {
    document.getElementById('editModal').style.display = 'none';
    gastoEditando = null;
}

// Guardar edición
async function guardarEdicion() {
    if (!gastoEditando) return;
    
    const descripcion = document.getElementById('editDescripcion').value.trim();
    const monto = parseFloat(document.getElementById('editMonto').value);
    const categoria = document.getElementById('editCategoria').value;
    const fecha = document.getElementById('editFecha').value;
    
    if (!descripcion || !monto || monto <= 0 || !categoria || !fecha) {
        mostrarMensaje('Por favor completa todos los campos correctamente', 'error');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gastos/${gastoEditando._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                descripcion,
                monto,
                categoria,
                fecha
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar gasto');
        }
        
        mostrarMensaje('Gasto actualizado exitosamente', 'success');
        cerrarModalEdicion();
        cargarGastos();
        cargarEstadisticas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error.message, 'error');
    }
}

// Eliminar gasto
async function eliminarGasto(gastoId) {
    const gasto = gastos.find(g => g._id === gastoId);
    
    if (!gasto) return;
    
    // Verificar permisos
    const esPropio = gasto.usuarioRegistro._id === usuarioActual.id;
    const esAdmin = usuarioActual.rol === 'administrador';
    
    if (!esAdmin && !esPropio) {
        mostrarMensaje('No tienes permiso para eliminar este gasto', 'error');
        return;
    }
    
    if (!confirm(`¿Estás seguro de eliminar el gasto "${gasto.descripcion}"?`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gastos/${gastoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar gasto');
        }
        
        mostrarMensaje('Gasto eliminado exitosamente', 'success');
        cargarGastos();
        cargarEstadisticas();
        
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje(error.message, 'error');
    }
}

// Cargar estadísticas
async function cargarEstadisticas() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/gastos/estadisticas/resumen`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        
        const stats = await response.json();
        
        document.getElementById('totalGastado').textContent = 
            `$${stats.total.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;document.getElementById('totalGastos').textContent = stats.cantidad;
        
        const promedio = stats.cantidad > 0 ? stats.total / stats.cantidad : 0;
        document.getElementById('promedioGasto').textContent = 
            `$${promedio.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        document.getElementById('statsContainer').style.display = 'grid';
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

// Mostrar mensaje
function mostrarMensaje(mensaje, tipo = 'success') {
    const div = document.createElement('div');
    div.className = `mensaje-${tipo}`;
    
    const icon = tipo === 'success' ? '✅' : '❌';
    const bgColor = tipo === 'success' ? '#10b981' : '#dc2626';
    
    div.innerHTML = `<span>${icon}</span> ${mensaje}`;
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.4s ease, slideOutRight 0.4s ease 2.6s;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        font-size: 14px;
        max-width: 400px;
    `;
    
    document.body.appendChild(div);
    
    setTimeout(() => div.remove(), 3000);
}

// Cerrar sesión
function cerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/index.html';
    }
}

// Click fuera del modal para cerrar
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        cerrarModalEdicion();
    }
}

// Agregar estilos de animación al documento
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
    
    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(-30px);
        }
    }
`;
document.head.appendChild(style);