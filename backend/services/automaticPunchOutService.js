const Attendance = require('../models/Attendance');
const { getActivePolicy, calculateAttendanceSummary } = require('./attendanceCalculationService');
const { logActivity } = require('./auditService');
const { getIO } = require('./socketService');

/**
 * Get timezone offset in ms between UTC and specified timeZone
 */
function getTimezoneOffsetMs(timeZone, date = new Date()) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Create a UTC Date object representing dateStr (YYYY-MM-DD) and timeStr (HH:mm) in target timezone
 */
function createDateInTimezone(dateStr, timeStr, tz = 'Asia/Kolkata') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min] = timeStr.split(':').map(Number);
  const targetUtc = Date.UTC(y, m - 1, d, h, min, 0);
  const offsetMs = getTimezoneOffsetMs(tz, new Date(targetUtc));
  return new Date(targetUtc - offsetMs);
}

/**
 * Get current date string and time string in target timezone
 */
function getNowInTimezone(tz = 'Asia/Kolkata') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return {
    todayDateStr: `${map.year}-${map.month}-${map.day}`,
    currentTimeStr: `${map.hour}:${map.minute}`,
  };
}

/**
 * Execute automatic punch out for open sessions that have missed checkout
 *
 * Business Logic:
 * - Automatic punch-out ONLY runs for a day after 12:00 AM (midnight) has passed,
 *   i.e. once the date has ended (record.date < todayDateStr in company timezone).
 * - During the working day (up to 12:00 AM midnight), employees are free to work and punch out manually.
 * - Once 12:00 AM midnight passes into the next day, any unpunched session from that day is
 *   automatically calculated using the configured checkout time (e.g. 18:00 or 20:00).
 * - Calculate total working hours using actual punch-in and configured checkout timestamp.
 * - Mark checkout source as AUTO / SYSTEM_GENERATED.
 * - Preserve original punch-in timestamp.
 * - Do not overwrite actual checkout timestamps (only records with missing checkout are processed).
 * - Idempotent so repeated runs cannot create duplicate checkout records.
 * - Skips employees who already punched out.
 * - If automatic punch-out is disabled, skip processing.
 * - Timezone-aware using company timezone.
 */
const processAutoPunchOut = async () => {
  try {
    const policy = await getActivePolicy();
    const isEnabled = policy.autoPunchOutEnabled !== false && policy.autoPunchOutMode !== 'DISABLED';
    if (!isEnabled) {
      return { processed: 0, message: 'Automatic punch-out is disabled in company policy.' };
    }

    const tz = policy.timezone || 'Asia/Kolkata';
    const autoPunchOutTimeStr = policy.autoPunchOutTime || policy.standardEndTime || '18:00';
    const { todayDateStr, currentTimeStr } = getNowInTimezone(tz);

    // Only process sessions where the day has completed (past 12:00 AM midnight, record.date < todayDateStr)
    const openRecords = await Attendance.find({
      date: { $lt: todayDateStr },
      'punchIn.time': { $exists: true, $ne: null },
      $or: [
        { 'punchOut.time': { $exists: false } },
        { 'punchOut.time': null },
      ],
      isAutoPunchOut: { $ne: true },
    }).populate('userId', 'name email departmentId branchId teamId');

    let processedCount = 0;

    for (const record of openRecords) {
      if (!record.punchIn || !record.punchIn.time || !record.date) continue;

      // Double check date boundary: must be strictly past 12:00 AM midnight of record.date
      if (record.date >= todayDateStr) {
        continue;
      }

      // Compute checkout timestamp on record's date at the configured auto checkout time
      let effectivePunchOutTime = createDateInTimezone(record.date, autoPunchOutTimeStr, tz);
      const punchInDate = new Date(record.punchIn.time);

      // Guard: If employee punched in at or after configured autoPunchOutTime (e.g. night shift or late punch-in)
      if (effectivePunchOutTime <= punchInDate) {
        const standardDurationMs = (policy.requiredWorkHours || 8.0) * 60 * 60 * 1000;
        const candidateEnd = new Date(punchInDate.getTime() + standardDurationMs);
        const endOfDay = createDateInTimezone(record.date, '23:59', tz);
        effectivePunchOutTime = candidateEnd <= endOfDay ? candidateEnd : endOfDay;
      }

      // Scheduled shift boundaries
      const scheduledStart = createDateInTimezone(record.date, policy.standardStartTime || '09:00', tz);
      const scheduledEnd = createDateInTimezone(record.date, policy.standardEndTime || '18:00', tz);

      // Calculate attendance metrics
      const metrics = calculateAttendanceSummary({
        punchInTime: punchInDate,
        punchOutTime: effectivePunchOutTime,
        scheduledStartTime: scheduledStart,
        scheduledEndTime: scheduledEnd,
        policy,
        shift: {
          startTime: policy.standardStartTime || '09:00',
          endTime: policy.standardEndTime || '18:00',
          gracePeriodMinutes: policy.gracePeriodMinutes ?? 15,
          earlyDepartureThresholdMinutes: policy.earlyDepartureThresholdMinutes ?? 30,
          requiredHours: policy.requiredWorkHours ?? 8.0,
          halfDayThresholdHours: policy.halfDayThresholdHours ?? 4.0,
          fullDayThresholdHours: policy.fullDayThresholdHours ?? 8.0,
          unpaidBreakMinutes: 0,
        },
      });

      // Populate punchOut details
      record.punchOut = {
        time: effectivePunchOutTime,
        isAutoPunched: true,
        method: 'AUTO',
        ipAddress: 'SYSTEM_GENERATED',
      };

      record.actualPunchOutAt = null; // No physical punch recorded
      record.effectivePunchOutAt = effectivePunchOutTime;
      record.actualWorkedMinutes = 0;
      record.effectiveWorkedMinutes = metrics.effectiveWorkedMinutes;
      record.workingHours = metrics.workingHours;
      record.unpaidBreakMinutes = 0;
      record.lateMinutes = metrics.lateMinutes;
      record.earlyDepartureMinutes = metrics.earlyDepartureMinutes;
      record.overtimeMinutes = 0; // Auto checkouts do not grant unverified overtime beyond configured checkout
      record.status = metrics.status;
      record.flags = [...new Set([...metrics.flags, 'Auto-Punched', 'Missing-Punch-Out'])];
      record.isAutoPunchOut = true;
      record.autoPunchOutReason = `Auto checked out at configured time (${autoPunchOutTimeStr}) after midnight due to missing punch-out.`;

      if (policy.autoPunchOutRequireReview) {
        record.needsReview = true;
        record.reviewStatus = 'Pending-Review';
      }

      await record.save();
      processedCount++;

      // Audit log
      await logActivity({
        userId: record.userId?._id,
        userName: 'SYSTEM',
        userEmail: 'system@erp.local',
        action: 'ATTENDANCE_AUTO_PUNCH_OUT',
        module: 'attendance',
        resourceId: record._id.toString(),
        description: `Auto recorded checkout at ${autoPunchOutTimeStr} after 12:00 AM for ${record.userId?.name || 'Employee'}. Working hours: ${metrics.workingHours}h.`,
      });
    }

    const io = getIO();
    if (io && processedCount > 0) {
      io.emit('attendance_batch_updated', { processed: processedCount });
    }

    return {
      processed: processedCount,
      message: `Successfully processed ${processedCount} missing punch-out session(s) at configured time (${autoPunchOutTimeStr}).`,
    };
  } catch (error) {
    console.error('[AutomaticPunchOutService] Error running auto punch-out:', error);
    throw error;
  }
};

module.exports = {
  processAutoPunchOut,
  createDateInTimezone,
  getNowInTimezone,
};
