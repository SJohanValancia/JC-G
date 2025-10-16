const API_URL = 'https://jc-g.onrender.com/api';

let usuarioActual = null;
let usuarios = [];
let usuarioSeleccionado = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    cargarDatosUsuario();
    cargarUsuarios();
    
    // Event listener para logout
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
});

// Verificar autenticación y rol
function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    
    if (!token || !usuario) {
        window.location.href = '/index.html';
        return;
    }
    
    try {
        usuarioActual = JSON.parse(usuario);
        
        // Verificar que sea administrador
        if (usuarioActual.rol !== 'administrador') {
            alert('No tienes permisos de administrador');
            window.location.href = '/dashboard.html';
            return;
        }
    } catch (error) {
        console.error('Error al parsear usuario:', error);
        window.location.href = '/index.html';
    }
}

// Cargar datos del usuario en la sidebar
function cargarDatosUsuario() {
    if (usuarioActual) {
        document.getElementById('userName').textContent = usuarioActual.nombreUsuario;
        document.getElementById('empresaNombre').textContent = usuarioActual.empresa.nombre;
    }
}

// Cargar usuarios de la empresa
async function cargarUsuarios() {
    const loadingContainer = document.getElementById('loadingContainer');
    const errorContainer = document.getElementById('errorContainer');
    const usuariosGrid = document.getElementById('usuariosGrid');
    
    loadingContainer.style.display = 'flex';
    errorContainer.style.display = 'none';
    usuariosGrid.style.display = 'none';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/administrador/usuarios`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }
        
        usuarios = await response.json();
        mostrarUsuarios(usuarios);
        
        loadingContainer.style.display = 'none';
        usuariosGrid.style.display = 'grid';
        
    } catch (error) {
        console.error('Error:', error);
        loadingContainer.style.display = 'none';
        errorContainer.style.display = 'flex';
        document.getElementById('errorMessage').textContent = error.message;
    }
}

// Mostrar usuarios en el grid
function mostrarUsuarios(usuarios) {
    const grid = document.getElementById('usuariosGrid');
    
    if (usuarios.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">👥</span>
                <h3>No hay usuarios</h3>
                <p>Aún no hay empleados registrados en tu empresa</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = usuarios.map(usuario => `
        <div class="usuario-card">
            <div class="usuario-header">
                <div class="usuario-avatar">
                    <span>${usuario.nombreUsuario.charAt(0).toUpperCase()}</span>
                </div>
                <div class="usuario-info">
                    <h3>${usuario.nombreUsuario}</h3>
                    <span class="usuario-rol ${usuario.rol}">${usuario.rol}</span>
                </div>
            </div>
            
            <div class="usuario-stats">
                <div class="stat-item">
                    <span class="stat-label">Último aporte:</span>
                    <span class="stat-value">
                        ${usuario.ultimoAporte 
                            ? `$${usuario.ultimoAporte.monto.toLocaleString()}`
                            : 'Sin aportes'
                        }
                    </span>
                </div>
                ${usuario.ultimoAporte ? `
                    <div class="stat-item">
                        <span class="stat-label">Descripción:</span>
                        <span class="stat-value">${usuario.ultimoAporte.descripcion}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Fecha:</span>
                        <span class="stat-value">${formatearFecha(usuario.ultimoAporte.fecha)}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="usuario-actions">
                ${usuario.rol !== 'administrador' ? `
                    <button class="btn-permisos" onclick="abrirModalPermisos('${usuario._id}')">
                        <span>🔐</span> Gestionar Permisos
                    </button>
                ` : `
                    <button class="btn-admin-badge" disabled>
                        <span>👑</span> Administrador
                    </button>
                `}
                <button class="btn-liquidacion" disabled title="Próximamente">
                    <span>💰</span> Liquidación
                </button>
            </div>
        </div>
    `).join('');
}

// Abrir modal de permisos
async function abrirModalPermisos(usuarioId) {
    usuarioSeleccionado = usuarios.find(u => u._id === usuarioId);
    
    if (!usuarioSeleccionado) return;
    
    const modal = document.getElementById('permisosModal');
    document.getElementById('modalUsuarioNombre').textContent = usuarioSeleccionado.nombreUsuario;
    document.getElementById('modalUsuarioRol').textContent = usuarioSeleccionado.rol;
    
    // Cargar permisos actuales
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/administrador/permisos/${usuarioId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar permisos');
        }
        
        const data = await response.json();
        const permisos = data.permisos;
        
        // Establecer checkboxes
        document.querySelectorAll('input[data-permiso]').forEach(checkbox => {
            const permiso = checkbox.dataset.permiso;
            checkbox.checked = permisos[permiso] || false;
        });
        
        modal.style.display = 'flex';
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar permisos del usuario');
    }
}

// Cerrar modal de permisos
function cerrarModalPermisos() {
    document.getElementById('permisosModal').style.display = 'none';
    usuarioSeleccionado = null;
}

// Guardar permisos
async function guardarPermisos() {
    if (!usuarioSeleccionado) return;
    
    // Recopilar permisos del formulario
    const permisos = {};
    document.querySelectorAll('input[data-permiso]').forEach(checkbox => {
        permisos[checkbox.dataset.permiso] = checkbox.checked;
    });
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/administrador/permisos/${usuarioSeleccionado._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permisos })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar permisos');
        }
        
        // Actualizar permisos en el array local
        const usuarioIndex = usuarios.findIndex(u => u._id === usuarioSeleccionado._id);
        if (usuarioIndex !== -1) {
            usuarios[usuarioIndex].permisos = permisos;
        }
        
        mostrarMensajeExito('Permisos actualizados exitosamente');
        cerrarModalPermisos();
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/index.html';
}

// Formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Mostrar mensaje de éxito
function mostrarMensajeExito(mensaje) {
    const div = document.createElement('div');
    div.className = 'mensaje-exito';
    div.textContent = mensaje;
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// Click fuera del modal para cerrar
window.onclick = function(event) {
    const modal = document.getElementById('permisosModal');
    if (event.target === modal) {
        cerrarModalPermisos();
    }
}