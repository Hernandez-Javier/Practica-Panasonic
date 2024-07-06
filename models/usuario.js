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
    const res = await pool.query('SELECT * FROM bodega.Usuarios ORDER BY id DESC');
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
    // Verificar si el correo o la identificación ya existen
    const emailResult = await pool.query('SELECT * FROM bodega.Usuarios WHERE email = $1', [email]);
    if (emailResult.rows.length > 0) {
      throw new Error('El correo ya existe');
    }

    const idResult = await pool.query('SELECT * FROM bodega.Usuarios WHERE identificacion = $1', [identificacion]);
    if (idResult.rows.length > 0) {
      throw new Error('La identificación ya existe');
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

//Eliminar usuario
const deleteUsuario = async (id, usuarioID, responsable) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Verificar si existe
    const queryResult = await pool.query('SELECT * FROM bodega.Usuarios WHERE id = $1', [id]);
    if (queryResult.rows.length === 0) {
      throw new Error('Usuario no encontrado');
    }

    // Eliminar
    const deleteResult = await pool.query('DELETE FROM bodega.Usuarios WHERE id = $1 RETURNING *', [id]);

    // Registrar la actividad en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, FechaHora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, deleteResult.rows[0].id, "Eliminación de usuario", ` Usuario ${id} eliminado`]
    );

    // Confirmar la transacción
    await pool.query('COMMIT');
    return deleteResult.rows[0];
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error eliminando el objeto', error);
    throw error;
  }
};

//Modificar usuario
const modifyUsuario = async (identificacion, newData, usuarioID, responsable) => {
  const { apodo, nombre, email, rol, contraseña } = newData;
  try {
    // Verificar si el usuario existe
    const result = await pool.query('SELECT * FROM bodega.Usuarios WHERE identificacion = $1', [identificacion]);
    if (result.rows.length === 0) {
      return { error: 'El usuario no existe' };
    }

    // Si se proporciona una nueva contraseña, encriptarla
    let hashedPassword = result.rows[0].contraseña;
    if (contraseña) {
      hashedPassword = await bcrypt.hash(contraseña, 10);
    }

    // Actualizar los datos del usuario
    const res = await pool.query(
      'UPDATE bodega.Usuarios SET Apodo = $1, Nombre = $2, Email = $3, Rol = $4, Contraseña = $5 WHERE Identificacion = $6 RETURNING *',
      [apodo, nombre, email, rol, hashedPassword, identificacion]
    );

    // Entrada en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Modificar usuario", JSON.stringify(identificacion)]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error modificando el usuario', error);
    throw error;
  }
};

module.exports = {
  getUsuario,
  addUsuario,
  login,
  deleteUsuario,
  modifyUsuario
};
