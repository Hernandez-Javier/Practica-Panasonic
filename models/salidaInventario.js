const pool = require('../config/database');
const { enviarNotificacion } = require('../models/notificacion');

//Obtener las salidas de inventario
const getSalidasInventario = async () => {
  const res = await pool.query('SELECT s.id, codigoproducto, cantidad, fecha, d.nombre as destino, solicitante, responsable FROM bodega.salidasinventario s join bodega.departamentos d on s.destino=d.id ORDER BY s.ID DESC');
  return res.rows;
};

//Agregar una nueva salida a inventario (se recibirá el nombre del departamento y se hará la conversión a su id)
const addSalidaInventario = async (salida, usuarioID, nombre, email) => {
  const { codigoProducto, cantidad, destino, solicitante } = salida; // Asegúrate de que `responsable` esté definido si lo usas.

  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Consultar la cantidad actual y el precio total del producto
    const queryResult = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigoProducto]);
    if (queryResult.rows.length === 0) {
      throw new Error('Producto no encontrado');
    }

    const cantidadActual = queryResult.rows[0].cantidad;
    const precioCol = queryResult.rows[0].preciounidadcol;
    const precioUSD = queryResult.rows[0].preciounidadusd;

    // Calcular la nueva cantidad y los nuevos precios totales
    const nuevaCantidad = cantidadActual - cantidad;
    const nuevoPrecioTotalCol = nuevaCantidad * precioCol;
    const nuevoPrecioTotalUSD = nuevaCantidad * precioUSD;

    // Verifica que la cantidad actual sea mayor a la cantidad por reducir
    if (cantidadActual < cantidad) {
      throw new Error('La cantidad en inventario es muy baja');
    }

    // Obtener el ID del departamento basado en el nombre
    const deptQueryResult = await pool.query('SELECT id FROM bodega.Departamentos WHERE nombre = $1', [destino]);
    if (deptQueryResult.rows.length === 0) {
      throw new Error('Departamento no encontrado');
    }
    const destinoId = deptQueryResult.rows[0].id;

    // Actualizar la cantidad y los precios totales del producto
    const updateResult = await pool.query(
      'UPDATE bodega.Productos SET cantidad = $1, precioTotalCol = $2, precioTotalUSD = $3 WHERE codigo = $4 RETURNING *',
      [nuevaCantidad, nuevoPrecioTotalCol, nuevoPrecioTotalUSD, codigoProducto]
    );

    // Insertar la salida en la DB usando el ID del departamento
    const res = await pool.query(
      'INSERT INTO bodega.SalidasInventario (CodigoProducto, Cantidad, Fecha, Destino, Solicitante, Responsable) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) RETURNING *',
      [codigoProducto, cantidad, destinoId, solicitante, nombre]
    );

    // Agrega bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, nombre, res.rows[0].id, "Salida de inventario", JSON.stringify({ codigoProducto, cantidad, destino: destinoId, solicitante })]
    );

    // Revisa si debe enviar notificación
    if (queryResult.rows[0].cantidadminima >= nuevaCantidad) {
      await enviarNotificacion(codigoProducto, queryResult.rows[0].nombre, nuevaCantidad, email);
      await pool.query(
        'INSERT INTO bodega.Notificaciones (CodigoProducto, CantidadActual, CantidadMinima, Fecha, Estado, Responsable) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5) RETURNING *',
        [codigoProducto, nuevaCantidad, queryResult.rows[0].cantidadminima, "Cantidad minima", nombre]
      );
    }

    // Confirmar la transacción
    await pool.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    // Revertir la transacción en caso de error
    await pool.query('ROLLBACK');
    console.error('Error disminuyendo la cantidad del producto', error);
    throw error;
  }
};

module.exports = {
  getSalidasInventario,
  addSalidaInventario,
};
