// models/notificaciones.js
const pool = require('../config/database');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'fakechicharo18@gmail.com', // Reemplaza con tu correo
    pass: 'mylp wjqn xrpu pxec' // Reemplaza con tu contraseña o token de aplicación
  }
});

const getNotificaciones = async () => {
  const res = await pool.query('SELECT * FROM bodega.Notificaciones');
  return res.rows;
};

const addNotificacion = async (notificacion) => {
  const { productoID, cantidadActual, cantidadMinima, fecha, estado, responsable } = notificacion;
  const res = await pool.query(
    'INSERT INTO bodega.Notificaciones (ProductoID, CantidadActual, CantidadMinima, Fecha, Estado, Responsable) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [productoID, cantidadActual, cantidadMinima, fecha, estado, responsable]
  );
  return res.rows[0];
};

const enviarNotificacion = async (codigo, nombre, cantidad, email) => {
  const mailOptions = {
    from: 'fakechicharo18@gmail.com',
    to: email, // Reemplaza con la dirección de correo del destinatario
    subject: `Alerta de Inventario: ${nombre}`,
    text: `El producto ${nombre} (Código: ${codigo}) ha alcanzado su cantidad mínima. Cantidad actual: ${cantidad}. Por favor, revisa el inventario y realiza los pedidos necesarios.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Notificación enviada para el producto ${nombre}`);
    return mailOptions;
  } catch (error) {
    console.error('Error enviando la notificación por correo:', error);
  }
};


module.exports = {
  getNotificaciones,
  addNotificacion,
  enviarNotificacion,
};
