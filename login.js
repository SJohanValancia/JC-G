// Configuración de la API
const API_URL = 'https://jc-g.onrender.com/api';

// Elementos del DOM
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si ya hay sesión
    checkSession();
    
    // Event listener para formulario
    loginForm.addEventListener('submit', handleLogin);
});

// Verificar si hay sesión activa
function checkSession() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    
    if (token && usuario) {
        try {
            const user = JSON.parse(usuario);
            
            // Verificar que tenga la estructura correcta (con empresa)
            if (user.empresa && user.empresa.nombre) {
                console.log('Usuario logueado:', user);
                console.log('Empresa:', user.empresa.nombre);
                window.location.href = '/dashboard.html';
            } else {
                // Limpiar datos viejos si no tiene la estructura correcta
                console.log('Datos de sesión inválidos, limpiando...');
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
            }
        } catch (error) {
            // Si hay error al parsear, limpiar localStorage
            console.log('Error al leer datos de sesión, limpiando...');
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
        }
    }
}

// Manejar login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        nombreUsuario: formData.get('nombreUsuario').trim().toLowerCase(),
        password: formData.get('password')
    };
    
    // Validaciones básicas
    if (!data.nombreUsuario || !data.password) {
        showError(loginError, 'Por favor completa todos los campos');
        return;
    }
    
    const btn = e.target.querySelector('.btn-primary');
    setLoading(btn, true);
    hideError(loginError);
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error al iniciar sesión');
        }
        
        // Guardar sesión
        localStorage.setItem('token', result.token);
        localStorage.setItem('usuario', JSON.stringify(result.usuario));
        
        // Mostrar mensaje de éxito
        showSuccess(`¡Bienvenido ${result.usuario.nombreUsuario}! Redirigiendo...`);
        
        // Redirigir al dashboard
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 1500);
        
    } catch (error) {
        showError(loginError, error.message);
        setLoading(btn, false);
    }
}

// Mostrar error
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Ocultar error
function hideError(element) {
    element.style.display = 'none';
}

// Mostrar mensaje de éxito
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `✓ ${message}`;
    successDiv.style.cssText = `
        position: fixed;
        top: 30px;
        left: 50%;
        transform: translateX(-50%);
        padding: 18px 32px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        font-weight: 700;
        font-size: 15px;
        animation: slideDown 0.4s ease;
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideUp 0.4s ease';
        setTimeout(() => successDiv.remove(), 400);
    }, 2500);
}

// Establecer estado de carga del botón
function setLoading(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        button.disabled = true;
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

// Agregar animaciones CSS al documento
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);