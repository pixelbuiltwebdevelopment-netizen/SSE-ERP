const Notification = require('../models/Notification');
const { getIO } = require('./socketService');

/**
 * Create and dispatch an in-app notification
 */
const sendNotification = async ({ userId, title, message, type, referenceId = null }) => {
  try {
    const notification = await Notification.create({
      userId,
      title,
      message,
      type,
      referenceId,
    });

    const io = getIO();
    if (io) {
      io.emit(`notification_${userId.toString()}`, notification);
      io.emit('notification_broadcast', { userId, notification });
    }

    return notification;
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    return null;
  }
};

module.exports = {
  sendNotification,
};
