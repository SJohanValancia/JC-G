// Configuración
const API_URL = 'https://jc-g.onrender.com/api';

// Elementos del DOM
const accessOverlay = document.getElementById('accessOverlay');
const registerContent = document.getElementById('registerContent');
const accessForm = document.getElementById('accessForm');
const registerForm = document.getElementById('registerForm');
const accessError = document.getElementById('accessError');
const registerError = document.getElementById('registerError');

let accesoVerificado = false;

// Verificar acceso con el backend
accessForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const code = document.getElementById('accessCode').value.trim();
    const btn = accessForm.querySelector('.btn-access');
    
    if (!code) {
        accessError.textContent = 'Por favor ingresa el código';
        accessError.style.display = 'block';
        return;
    }
    
    // Deshabilitar botón mientras verifica
    btn.disabled = true;
    btn.textContent = '⏳ Verificando...';
    accessError.style.display = 'none';
    
    try {
        const response = await fetch(`${API_URL}/auth/verificar-acceso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo: code })
        });
        
        const result = await response.json();
        
        if (response.ok && result.valido) {
            // Código correcto, mostrar formulario de registro
            accesoVerificado = true;
            accessOverlay.style.display = 'none';
            registerContent.style.display = 'flex';
            accessError.style.display = 'none';
        } else {
            // Código incorrecto
            throw new Error(result.error || 'Código de acceso incorrecto');
        }
        
    } catch (error) {
        // Mostrar error
        accessError.textContent = error.message;
        accessError.style.display = 'block';
        document.getElementById('accessCode').value = '';
        document.getElementById('accessCode').focus();
        
        // Shake animation
        const card = document.querySelector('.access-card');
        card.style.animation = 'shake 0.5s';
        setTimeout(() => {
            card.style.animation = '';
        }, 500);
        
    } finally {
        btn.disabled = false;
        btn.textContent = 'Verificar Acceso';
    }
});

// Prevenir acceso directo sin verificación
registerForm.addEventListener('submit', (e) => {
    if (!accesoVerificado) {
        e.preventDefault();
        alert('Debes verificar el código de acceso primero');
        window.location.reload();
        return;
    }
    handleRegister(e);
});

// Manejar registro
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        nombreEmpresa: formData.get('nombreEmpresa').trim(),
        nombreUsuario: formData.get('nombreUsuario').trim().toLowerCase(),
        password: formData.get('password')
    };
    
    // Validaciones básicas
    if (!data.nombreEmpresa || !data.nombreUsuario || !data.password) {
        showError(registerError, 'Por favor completa todos los campos');
        return;
    }
    
    if (data.password.length < 6) {
        showError(registerError, 'La contraseña debe tener al menos 6 caracteres');
        return;
    }
    
    if (!/^[a-z0-9_]+$/.test(data.nombreUsuario)) {
        showError(registerError, 'El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos');
        return;
    }
    
    const btn = e.target.querySelector('.btn-primary');
    setLoading(btn, true);
    hideError(registerError);
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error al registrar empresa');
        }
        
        // Guardar sesión
        localStorage.setItem('token', result.token);
        localStorage.setItem('usuario', JSON.stringify(result.usuario));
        
        // Mostrar mensaje de éxito
        showSuccess(`¡Empresa "${data.nombreEmpresa}" creada exitosamente! Redirigiendo...`);
        
        // Redirigir al dashboard
        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 2000);
        
    } catch (error) {
        showError(registerError, error.message);
        setLoading(btn, false);
    }
}

// Funciones auxiliares
function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError(element) {
    element.style.display = 'none';
}

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
    }, 3000);
}

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

// Animaciones CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    
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