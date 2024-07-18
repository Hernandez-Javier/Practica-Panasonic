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
    console.error('Error agregando la ubicacion', error);
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

//editar ubicacion
const modifyUbicacion = async (ubicacionID, newData, usuarioID, responsable) => {
  const { nombre, descripcion } = newData;
  try {
    // Verificar si la ubicación existe
    const result = await pool.query('SELECT * FROM bodega.Ubicaciones WHERE id = $1', [ubicacionID]);
    if (result.rows.length === 0) {
      return { error: 'La ubicación no existe' };
    }

    // Actualizar los datos de la ubicación
    const res = await pool.query(
      'UPDATE bodega.Ubicaciones SET Nombre = $1, Descripcion = $2 WHERE id = $3 RETURNING *',
      [nombre, descripcion, ubicacionID]
    );

    // Entrada en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Modificar ubicación", JSON.stringify({ ubicacionID, nombre, descripcion })]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error modificando la ubicación', error);
    throw error;
  }
};

module.exports = {
  getUbicacion,
  addUbicacion,
  deleteUbicacion,
  modifyUbicacion
};