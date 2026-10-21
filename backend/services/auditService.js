const AuditLog = require('../models/AuditLog');

const logActivity = async ({
  userId = null,
  userName = 'System',
  userEmail = '',
  action,
  module,
  resourceId = '',
  description,
  req = null,
}) => {
  try {
    let ipAddress = '';
    let userAgent = '';

    if (req) {
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
      userAgent = req.headers['user-agent'] || '';
    }

    await AuditLog.create({
      userId,
      userName,
      userEmail,
      action,
      module,
      resourceId,
      description,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error(`[Audit Log Error]: Failed to create audit log entry: ${error.message}`);
  }
};

module.exports = {
  logActivity,
};
