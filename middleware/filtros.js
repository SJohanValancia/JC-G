// middleware/filtros.js
exports.filtroVisibilidad = (req) => {
  if (req.usuario.rol === 'administrador') return {};

  // Si no tiene ver_otros => solo sus propios docs
  if (req.permisos?.ver_otros === false) {   // ← opcional chaining
    return { usuarioRegistro: req.usuario._id }; // Ganado
  }
  return {}; // puede ver todos los de su empresa
};