const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const Empresa = require('../models/Empresa');

// Registro
router.post('/register', async (req, res) => {
  try {
    const { nombreEmpresa, nombreUsuario, password } = req.body;

    // Verificar si el usuario ya existe
    const usuarioExiste = await Usuario.findOne({ nombreUsuario });
    
    if (usuarioExiste) {
      return res.status(400).json({ 
        error: 'El nombre de usuario ya está registrado' 
      });
    }

    // Buscar o crear empresa
    let empresa = await Empresa.findOne({ nombre: nombreEmpresa });
    
    if (!empresa) {
      empresa = await Empresa.create({ nombre: nombreEmpresa });
    }

    // Crear usuario
    const usuario = await Usuario.create({
      nombreUsuario,
      password,
      empresa: empresa._id
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
        rol: usuario.rol, // Agregado
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

// Registro - también actualizar
router.post('/register', async (req, res) => {
  try {
    const { nombreEmpresa, nombreUsuario, password } = req.body;

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
      rol: esNuevaEmpresa ? 'administrador' : 'empleado'
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
        rol: usuario.rol, // Agregado
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

module.exports = router;