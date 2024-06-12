// models/ubicaciones.js
const pool = require('../config/database');

const getUbicacion = async () => {
  const res = await pool.query('SELECT * FROM bodega.ubicaciones ORDER BY id DESC;');
  return res.rows;
};

const addUbicacion = async (ubicacion, usuarioID, responsable) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    const { nombre, descripcion } = ubicacion;
    const res = await pool.query(
      'INSERT INTO bodega.Ubicaciones (Nombre, Descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion]);

    //registro de bitacora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Agregar ubicacion", JSON.stringify({ nombre})]
    );

    // Confirmar la transacción
    await pool.query('COMMIT');
    return res.rows[0];

  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error aumentando la cantidad del producto', error);
    throw error;
  }
};

//eliminar ubicacion
const deleteUbicacion = async (nombre, usuarioID, responsable) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Verificar si existe
    const queryResult = await pool.query('SELECT * FROM bodega.Ubicaciones WHERE nombre = $1', [nombre]);
    if (queryResult.rows.length === 0) {
      throw new Error('Ubicacion no encontrada');
    }

    // Eliminar
    const deleteResult = await pool.query('DELETE FROM bodega.Ubicaciones WHERE nombre = $1 RETURNING *', [nombre]);

    // Registrar la actividad en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, FechaHora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, deleteResult.rows[0].id, "Eliminación de ubicacion", `Ubicación ${nombre} eliminado`]
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

module.exports = {
  getUbicacion,
  addUbicacion,
  deleteUbicacion
};