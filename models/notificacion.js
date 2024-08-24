//const crypto = require('crypto');
const pool = require('../config/database');
const nodemailer = require('nodemailer');
require('dotenv').config();

const email_pass = process.env.email_pass;

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'fakechicharo18@gmail.com', // correo a usar
    pass: email_pass // contraseña del correo o token
  }
});

const getNotificaciones = async () => {
  const res = await pool.query('SELECT * FROM bodega.emailNotificaciones ORDER BY id dESC');
  return res.rows;
};

const addNotificacion = async (data) => {
  const { email } = data;

  try {
    // Verificar si el correo ya existe
    const emailResult = await pool.query('SELECT * FROM bodega.emailNotificaciones WHERE email = $1', [email]);
    if (emailResult.rows.length > 0) {
      throw new Error('El correo ya existe');
    }
    const res = await pool.query(
      'INSERT INTO bodega.emailNotificaciones (Email) VALUES ($1) RETURNING *',
      [email]
    );
    return res.rows[0];
  } catch (error) {
    console.error('Error registrando el email', error);
    throw error;
  }
};

//eliminar email de la lista
const deleteEmail = async (id, usuarioID, responsable) => {
  try {
    // Iniciar la transacción
    await pool.query('BEGIN');

    // Verificar si existe
    const queryResult = await pool.query('SELECT * FROM bodega.emailNotificaciones WHERE id = $1', [id]);
    if (queryResult.rows.length === 0) {
      throw new Error('Email no encontrado');
    }

    // Eliminar
    const deleteResult = await pool.query('DELETE FROM bodega.emailNotificaciones WHERE id = $1 RETURNING *', [id]);

    // Registrar la actividad en la bitácora
    await pool.query(
      'INSERT INTO bodega.Bitacora (UsuarioID, Responsable, ActividadID, TipoActividad, FechaHora, Detalles) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)',
      [usuarioID, responsable, deleteResult.rows[0].id, "Eliminación de email de notificaciones", `Email ${deleteResult.rows[0].email} eliminado`]
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

const enviarNotificacion = async (codigo, nombre, cantidad) => {
  try {
    const result = await pool.query('SELECT email FROM bodega.emailnotificaciones');
    let emails = result.rows.map(row => row.email);
    console.log(emails);

    const mailOptions = {
      from: 'fakechicharo18@gmail.com',
      subject: `Alerta de Inventario: ${nombre}`,
      text: `El producto ${nombre} (Código: ${codigo}) ha alcanzado su cantidad mínima. Cantidad actual: ${cantidad}. Por favor, revisa el inventario y realiza los pedidos necesarios.`
    };

    const emailPromises = emails.map(email => {
      return transporter.sendMail({ ...mailOptions, to: email });
    });

    await Promise.all(emailPromises);
    console.log(`Notificaciones enviadas para el producto ${nombre}`);
    return mailOptions;
  } catch (error) {
    console.error('Error enviando la notificación por correo:', error);
  }
};

const enviarPass = async (data, res) => {
  if (!data.email) {
    return res.status(400).json({ error: 'Email es requerido' });
  }

  try {
    // Verificar que el usuario exista
    const result = await pool.query('SELECT id FROM bodega.usuarios WHERE email = $1', [data.email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar un token de reinicio
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 1800000; // El token expira en media hora

    // Guardar el token y la fecha de expiración en la base de datos
    const res = await pool.query(
      'UPDATE bodega.usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3',
      [token, expires, data.email]
    );

    // Enviar el correo electrónico con el token
    const mailOptions = {
      from: 'fakechicharo18@gmail.com',
      to: data.email,
      subject: 'Solicitud de reinicio de contraseña',
      text: `El código para reiniciar tu contraseña es: 
      ${token}. Vence en 30 min.`
    };

    await transporter.sendMail(mailOptions);

    return res.rows[0];
  } catch (error) {
    console.error('Error en la solicitud de reinicio de contraseña:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

module.exports = {
  getNotificaciones,
  addNotificacion,
  deleteEmail,
  enviarPass,
  enviarNotificacion,
};
