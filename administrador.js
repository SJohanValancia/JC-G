const API_URL = 'https://jc-g.onrender.com/api';

let usuarioActual = null;
let usuarios = [];
let usuarioSeleccionado = null;
let usuarioDeudaSeleccionado = null; // NUEVO

(function verificarAccesoAdmin() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    if (!usuario || usuario.rol !== 'administrador') {
        alert('⚠️ Acceso denegado. Solo los administradores pueden acceder a esta sección.');
        window.location.href = '/dashboard.html';
        return;
    }
})();

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    cargarDatosUsuario();
    mostrarBotonRegistrarSocio();
    cargarUsuarios();
    
    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);
    
    const btnRegistrarSocio = document.getElementById('btnRegistrarSocio');
    const closeSocioModal = document.getElementById('closeSocioModal');
    const cancelarSocio = document.getElementById('cancelarSocio');
    const socioForm = document.getElementById('socioForm');
    const modalRegistrarSocio = document.getElementById('modalRegistrarSocio');
    
    if (btnRegistrarSocio) {
        btnRegistrarSocio.addEventListener('click', abrirModalRegistrarSocio);
    }
    
    if (closeSocioModal) {
        closeSocioModal.addEventListener('click', cerrarModalRegistrarSocio);
    }
    
    if (cancelarSocio) {
        cancelarSocio.addEventListener('click', cerrarModalRegistrarSocio);
    }
    
    if (socioForm) {
        socioForm.addEventListener('submit', registrarSocio);
    }
    
    if (modalRegistrarSocio) {
        modalRegistrarSocio.addEventListener('click', (e) => {
            if (e.target === modalRegistrarSocio) {
                cerrarModalRegistrarSocio();
            }
        });
    }

    // NUEVO: Event listeners para cálculo de cuota
    document.getElementById('montoDeuda')?.addEventListener('input', calcularValorCuota);
    document.getElementById('numeroCuotas')?.addEventListener('input', calcularValorCuota);
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

function cargarDatosUsuario() {
    if (usuarioActual) {
        document.getElementById('userName').textContent = usuarioActual.nombreUsuario;
        document.getElementById('empresaNombre').textContent = usuarioActual.empresa.nombre;
    }
}

function mostrarBotonRegistrarSocio() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    const btnRegistrarSocio = document.getElementById('btnRegistrarSocio');
    
    if (btnRegistrarSocio && usuario && usuario.rol === 'administrador') {
        btnRegistrarSocio.style.display = 'flex';
    }
}

function abrirModalRegistrarSocio() {
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    if (usuario && usuario.rol === 'administrador') {
        document.getElementById('socioEmpresa').value = usuario.empresa.nombre;
        document.getElementById('socioForm').reset();
        document.getElementById('socioEmpresa').value = usuario.empresa.nombre;
        document.getElementById('socioError').style.display = 'none';
        document.getElementById('modalRegistrarSocio').classList.add('active');
    } else {
        alert('Solo los administradores pueden registrar socios');
    }
}

function cerrarModalRegistrarSocio() {
    document.getElementById('modalRegistrarSocio').classList.remove('active');
}

async function registrarSocio(e) {
    e.preventDefault();
    
    const usuario = JSON.parse(localStorage.getItem('usuario'));
    
    if (usuario.rol !== 'administrador') {
        alert('Solo los administradores pueden registrar socios');
        return;
    }
    
    const nombreUsuario = document.getElementById('socioUsuario').value.trim().toLowerCase();
    const password = document.getElementById('socioPassword').value;
    const cedula = document.getElementById('socioCedula').value.trim() || null;
    const telefono = document.getElementById('socioTelefono').value.trim() || null;
    const nombreEmpresa = document.getElementById('socioEmpresa').value;
    
    if (!nombreUsuario || !password) {
        document.getElementById('socioError').textContent = 'Por favor completa todos los campos obligatorios';
        document.getElementById('socioError').style.display = 'block';
        return;
    }
    
    if (password.length < 6) {
        document.getElementById('socioError').textContent = 'La contraseña debe tener al menos 6 caracteres';
        document.getElementById('socioError').style.display = 'block';
        return;
    }
    
    if (!/^[a-z0-9_]+$/.test(nombreUsuario)) {
        document.getElementById('socioError').textContent = 'El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos';
        document.getElementById('socioError').style.display = 'block';
        return;
    }
    
    const token = localStorage.getItem('token');
    const btn = document.getElementById('guardarSocio');
    const btnText = btn.querySelector('.btn-text');
    
    btn.disabled = true;
    btnText.textContent = '⏳ Registrando...';
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                nombreEmpresa: nombreEmpresa,
                nombreUsuario: nombreUsuario,
                password: password,
                cedula: cedula,
                telefono: telefono
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error al registrar socio');
        }
        
        mostrarMensajeExito(`✓ Socio "${nombreUsuario}" registrado exitosamente en ${nombreEmpresa}`);
        cerrarModalRegistrarSocio();
        cargarUsuarios();
        
    } catch (error) {
        document.getElementById('socioError').textContent = error.message;
        document.getElementById('socioError').style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Registrar Socio';
    }
}

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
                ${usuario.cedula ? `
                    <div class="stat-item">
                        <span class="stat-label">Cédula:</span>
                        <span class="stat-value">${usuario.cedula}</span>
                    </div>
                ` : ''}
                
                ${usuario.telefono ? `
                    <div class="stat-item">
                        <span class="stat-label">Teléfono:</span>
                        <a class="stat-value telefono" href="tel:${usuario.telefono}">
                            ${usuario.telefono}
                        </a>
                    </div>
                ` : ''}

                ${usuario.deuda && usuario.deuda > 0 ? `
                    <!-- Deuda Original -->
                    <div class="stat-item" style="background: #f3f4f6; padding: 8px; border-radius: 6px; margin-top: 8px;">
                        <span class="stat-label" style="color: #6b7280;">📋 Deuda Original:</span>
                        <span class="stat-value" style="color: #6b7280; font-weight: 600;">
                            $${usuario.deuda.toLocaleString()}
                        </span>
                    </div>

                    <!-- Total Aportado -->
                    <div class="stat-item" style="background: #d1fae5; padding: 8px; border-radius: 6px;">
                        <span class="stat-label" style="color: #065f46;">✅ Total Aportado:</span>
                        <span class="stat-value" style="color: #065f46; font-weight: 700;">
                            $${usuario.totalAportado.toLocaleString()} (${usuario.cantidadAportes} ${usuario.cantidadAportes === 1 ? 'aporte' : 'aportes'})
                        </span>
                    </div>

                    <!-- Deuda Restante -->
                    <div class="stat-item" style="background: ${usuario.deudaRestante > 0 ? '#fee2e2' : '#d1fae5'}; padding: 10px; border-radius: 6px; border: 2px solid ${usuario.deudaRestante > 0 ? '#991b1b' : '#065f46'};">
                        <span class="stat-label" style="color: ${usuario.deudaRestante > 0 ? '#991b1b' : '#065f46'}; font-weight: 700;">
                            ${usuario.deudaRestante > 0 ? '💰 Deuda Restante:' : '✅ Deuda Saldada'}
                        </span>
                        <span class="stat-value" style="color: ${usuario.deudaRestante > 0 ? '#991b1b' : '#065f46'}; font-weight: 800; font-size: 18px;">
                            $${usuario.deudaRestante.toLocaleString()}
                        </span>
                    </div>

                    <!-- Cuotas Restantes -->
                    ${usuario.cuotas > 0 ? `
                        <div class="stat-item" style="background: ${usuario.cuotasRestantes > 0 ? '#fef3c7' : '#d1fae5'}; padding: 8px; border-radius: 6px;">
                            <span class="stat-label" style="color: ${usuario.cuotasRestantes > 0 ? '#92400e' : '#065f46'};">
                                📅 Cuotas ${usuario.cuotasRestantes > 0 ? 'Restantes' : 'Completadas'}:
                            </span>
                            <span class="stat-value" style="color: ${usuario.cuotasRestantes > 0 ? '#92400e' : '#065f46'}; font-weight: 700;">
                                ${usuario.cuotasRestantes} de ${usuario.cuotas}
                                ${usuario.cuotasRestantes > 0 && usuario.deuda > 0 ? 
                                    `<span style="font-size: 12px; display: block; margin-top: 4px;">
                                        (≈ $${Math.round(usuario.deudaRestante / usuario.cuotasRestantes).toLocaleString()} por cuota)
                                    </span>` 
                                    : ''
                                }
                            </span>
                        </div>
                    ` : ''}
                ` : `
                    <div class="stat-item" style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin-top: 8px; text-align: center;">
                        <span class="stat-label" style="color: #6b7280;">Sin deuda asignada</span>
                    </div>
                `}
            </div>
            
            <div class="usuario-actions">
                ${usuario.rol !== 'administrador' ? `
                    <button class="btn-permisos" onclick="abrirModalPermisos('${usuario._id}')">
                        <span>🔒</span> Gestionar Permisos
                    </button>
                    <button class="btn-deuda" onclick="abrirModalDeuda('${usuario._id}')" 
                            style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                                   color: white; border: none; padding: 10px 16px; border-radius: 8px; 
                                   cursor: pointer; font-weight: 600; display: flex; align-items: center; 
                                   gap: 6px; transition: all 0.2s ease; margin-top: 8px; width: 100%; 
                                   justify-content: center;">
                        <span>💰</span> Gestionar Deuda
                    </button>
                ` : `
                    <button class="btn-admin-badge" disabled>
                        <span>👑</span> Administrador
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

// NUEVAS FUNCIONES PARA GESTIÓN DE DEUDA
function abrirModalDeuda(usuarioId) {
    usuarioDeudaSeleccionado = usuarios.find(u => u._id === usuarioId);
    
    if (!usuarioDeudaSeleccionado) return;
    
    document.getElementById('modalDeudaUsuarioNombre').textContent = usuarioDeudaSeleccionado.nombreUsuario;
    document.getElementById('montoDeuda').value = usuarioDeudaSeleccionado.deuda || 0;
    document.getElementById('numeroCuotas').value = usuarioDeudaSeleccionado.cuotas || 0;
    
    calcularValorCuota();
    
    document.getElementById('deudaModal').style.display = 'flex';
}

function cerrarModalDeuda() {
    document.getElementById('deudaModal').style.display = 'none';
    usuarioDeudaSeleccionado = null;
}

function calcularValorCuota() {
    const monto = parseFloat(document.getElementById('montoDeuda').value) || 0;
    const cuotas = parseInt(document.getElementById('numeroCuotas').value) || 0;
    
    const valorCuota = cuotas > 0 ? Math.round(monto / cuotas) : 0;
    document.getElementById('valorCuota').textContent = '$' + valorCuota.toLocaleString();
}

async function guardarDeuda() {
    if (!usuarioDeudaSeleccionado) return;
    
    const deuda = parseFloat(document.getElementById('montoDeuda').value) || 0;
    const cuotas = parseInt(document.getElementById('numeroCuotas').value) || 0;
    
    if (deuda < 0 || cuotas < 0) {
        alert('Los valores no pueden ser negativos');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/administrador/deuda/${usuarioDeudaSeleccionado._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ deuda, cuotas })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al guardar deuda');
        }
        
        const usuarioIndex = usuarios.findIndex(u => u._id === usuarioDeudaSeleccionado._id);
        if (usuarioIndex !== -1) {
            usuarios[usuarioIndex].deuda = deuda;
            usuarios[usuarioIndex].cuotas = cuotas;
        }
        
        mostrarMensajeExito('Deuda actualizada exitosamente');
        cerrarModalDeuda();
        cargarUsuarios();
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

async function abrirModalPermisos(usuarioId) {
    usuarioSeleccionado = usuarios.find(u => u._id === usuarioId);
    
    if (!usuarioSeleccionado) return;
    
    const modal = document.getElementById('permisosModal');
    document.getElementById('modalUsuarioNombre').textContent = usuarioSeleccionado.nombreUsuario;
    document.getElementById('modalUsuarioRol').textContent = usuarioSeleccionado.rol;
    
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

function cerrarModalPermisos() {
    document.getElementById('permisosModal').style.display = 'none';
    usuarioSeleccionado = null;
}

async function guardarPermisos() {
    if (!usuarioSeleccionado) return;
    
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
        
        if (!response.ok) {const error = await response.json();
            throw new Error(error.error || 'Error al guardar permisos');
        }
        
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

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/index.html';
}

function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

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

window.onclick = function(event) {
    const modalPermisos = document.getElementById('permisosModal');
    const modalSocio = document.getElementById('modalRegistrarSocio');
    const modalDeuda = document.getElementById('deudaModal');
    
    if (event.target === modalPermisos) {
        cerrarModalPermisos();
    }
    
    if (event.target === modalSocio) {
        cerrarModalRegistrarSocio();
    }
    
    if (event.target === modalDeuda) {
        cerrarModalDeuda();
    }
}