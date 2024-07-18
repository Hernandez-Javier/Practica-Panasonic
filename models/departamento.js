// models/departamentos.js
const pool = require('../config/database');

const getDepartamento = async () => {
  const res = await pool.query('SELECT * FROM bodega.Departamentos ORDER BY id DESC;');
  return res.rows;
};

const addDepartamento = async (departamento, usuarioID, responsable) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    const { nombre, descripcion } = departamento;
    const res = await pool.query(
    'INSERT INTO bodega.Departamentos (Nombre, Descripcion) VALUES ($1, $2) RETURNING *',
    [nombre, descripcion]);

    //registro de bitacora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Agregar departamento", JSON.stringify({ nombre})]
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

const deleteDepartamento = async (nombre, usuarioID, responsable) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Verificar si existe
    const queryResult = await pool.query('SELECT * FROM bodega.Departamentos WHERE nombre = $1', [nombre]);
    if (queryResult.rows.length === 0) {
      throw new Error('Departamento no encontrado');
    }

    // Eliminar
    const deleteResult = await pool.query('DELETE FROM bodega.Departamentos WHERE nombre = $1 RETURNING *', [nombre]);

    // Registrar la actividad en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, FechaHora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, deleteResult.rows[0].id, "Eliminación de departamento", `Departamento ${nombre} eliminado`]
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

const modifyDepartamento = async (id, newData, usuarioID, responsable) => {
  const { nombre, descripcion } = newData;

  try {
    // Verificar si el departamento existe
    const result = await pool.query('SELECT * FROM bodega.Departamentos WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return { error: 'El departamento no existe' };
    }

    // Actualizar los datos del departamento
    const res = await pool.query(
      'UPDATE bodega.Departamentos SET Nombre = $1, Descripcion = $2 WHERE id = $3 RETURNING *',
      [nombre, descripcion, id]
    );

    // Registro en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, res.rows[0].id, "Modificar departamento", JSON.stringify({ id })]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error modificando el departamento', error);
    throw error;
  }
};

module.exports = {
  getDepartamento,
  addDepartamento,
  deleteDepartamento,
  modifyDepartamento
};
