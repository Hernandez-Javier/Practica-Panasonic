// models/salidasInventario.js
const pool = require('../config/database');

//Obtener las salidas de inventario
const getSalidasInventario = async () => {
  const res = await pool.query('SELECT * FROM bodega.SalidasInventario');
  return res.rows;
};

//Agregar una nueva salida a inventario
const addSalidaInventario = async (salida, usuarioID, nombre) => {
  const { codigoProducto, cantidad, destino, solicitante, responsable } = salida;

  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Consultar la cantidad actual y el precio total del producto
    const queryResult = await pool.query('SELECT * FROM bodega.Productos WHERE codigo = $1', [codigoProducto]);
    if (queryResult.rows.length === 0) {
      return { error: 'Producto no encontrado' };
    }

    const cantidadActual = queryResult.rows[0].cantidad;
    const precioCol = queryResult.rows[0].preciounidadcol;
    const precioUSD = queryResult.rows[0].preciounidadusd;

    // Calcular la nueva cantidad y los nuevos precios totales
    const nuevaCantidad = cantidadActual - cantidad;
    const nuevoPrecioTotalCol = nuevaCantidad * precioCol;
    const nuevoPrecioTotalUSD = nuevaCantidad * precioUSD;

    //verifica que la cantidad actual sea mayor a la cantidad por reducir
    if (cantidadActual < cantidad) {
      return { error: 'La cantidad en inventario es muy baja' };
    }

    // Actualizar la cantidad y los precios totales del producto
    const updateResult = await pool.query(
      'UPDATE bodega.Productos SET cantidad = $1, precioTotalCol = $2, precioTotalUSD = $3 WHERE codigo = $4 RETURNING *', 
      [nuevaCantidad, nuevoPrecioTotalCol, nuevoPrecioTotalUSD, codigoProducto]
    );

    //Insertar la salida en la DB
    const res = await pool.query(
      'INSERT INTO bodega.SalidasInventario (CodigoProducto, Cantidad, Fecha, Destino, Solicitante, Responsable) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5) RETURNING *',
      [codigoProducto, cantidad, destino, solicitante, nombre]
    );

    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, fechahora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, nombre, res.rows[0].id, "Salida de inventario", JSON.stringify({ codigoProducto, cantidad, destino, solicitante })]
    );

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
