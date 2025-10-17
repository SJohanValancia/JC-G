const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');

// Registro
router.post('/register', async (req, res) => {
  try {
    const { nombreEmpresa, nombreUsuario, password, cedula, telefono } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExiste = await Usuario.findOne({ nombreUsuario });
    
    if (usuarioExiste) {
      return res.status(400).json({ 
        error: 'El nombre de usuario ya está registrado' 
      });
    }

    // Buscar o crear empresa
    let empresa = await Empresa.findOne({ nombre: nombreEmpresa });
    
    let esNuevaEmpresa = false;
    if (!empresa) {
      empresa = await Empresa.create({ nombre: nombreEmpresa });
      esNuevaEmpresa = true;
    }

    // Crear usuario - si es nueva empresa, hacer administrador
    const usuario = await Usuario.create({
      nombreUsuario,
      password,
      empresa: empresa._id,
      rol: esNuevaEmpresa ? 'administrador' : 'empleado',
      cedula: cedula || null,
      telefono: telefono || null
    });

    // Generar token
    const token = jwt.sign(
      { id: usuario._id, empresa: empresa._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      token,
      usuario: {
        id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol,
        cedula: usuario.cedula,
        telefono: usuario.telefono,
        empresa: {
          id: empresa._id,
          nombre: empresa.nombre
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { nombreUsuario, password } = req.body;

    // Buscar usuario
    const usuario = await Usuario.findOne({ nombreUsuario }).populate('empresa');
    
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar password
    const passwordValido = await usuario.compararPassword(password);
    
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign(
      { id: usuario._id, empresa: usuario.empresa._id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      usuario: {
        id: usuario._id,
        nombreUsuario: usuario.nombreUsuario,
        rol: usuario.rol,
        cedula: usuario.cedula,
        telefono: usuario.telefono,
        empresa: {
          id: usuario.empresa._id,
          nombre: usuario.empresa.nombre
        }
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// Verificar código de acceso para registro
router.post('/verificar-acceso', async (req, res) => {
  try {
    const { codigo } = req.body;
    
    // Obtener clave de la variable de entorno
    const claveCorrecta = process.env.CLAVE_REGISTRO;
    
    if (codigo === claveCorrecta) {
      return res.json({ 
        valido: true, 
        mensaje: 'Acceso concedido' 
      });
    } else {
      return res.status(401).json({ 
        valido: false, 
        error: 'Código de acceso incorrecto' 
      });
    }
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al verificar código' });
  }
});

module.exports = router;