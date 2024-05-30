const pool = require('../config/database');
const bcrypt = require('bcrypt');

//Acceder
const login = async (email, password) => {
  const res = await pool.query('SELECT * FROM bodega.Usuarios WHERE email = $1', [email]);
  const usuario = res.rows[0];
  if (!usuario) {
    return null; // Usuario no encontrado
  }
  const validPassword = await bcrypt.compare(password, usuario.contraseña);
  if (!validPassword) {
    return null; // Contraseña incorrecta
  }
  return usuario; // Login exitoso
};

//Obtener todos los usuarios
const getUsuario = async () => {
  try {
    const res = await pool.query('SELECT * FROM bodega.Usuarios');
    return res.rows;
  } catch (err) {
    console.error('Error fetching users', err);
    throw err;
  }
};

//Agregar un nuevo usuario
const addUsuario = async (usuario) => {
  const { apodo, identificacion, nombre, email, rol, contraseña } = usuario;
  try {
    // Verificar si el usuario ya existe
    const result = await pool.query('SELECT * FROM bodega.Usuarios WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return { error: 'El corrreo o identificación ya existen' };
    }
    // Encriptar la contraseña antes de guardarla
    const hashedPassword = await bcrypt.hash(contraseña, 10);
    const res = await pool.query(
      'INSERT INTO bodega.Usuarios (apodo, identificacion, nombre, email, rol, contraseña) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [apodo, identificacion, nombre, email, rol, hashedPassword]
    );
    return res.rows[0];
  } catch (err) {
    console.error('Error registrando el usuario', err);
    throw err;
  }
};

module.exports = {
  getUsuario,
  addUsuario,
  login,
};
