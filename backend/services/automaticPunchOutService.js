const Attendance = require('../models/Attendance');
const { getActivePolicy, calculateAttendanceSummary, setTimeToDate } = require('./attendanceCalculationService');
const { logActivity } = require('./auditService');
const { sendNotification } = require('./notificationService');
const { getIO } = require('./socketService');

/**
 * Execute automatic punch out for open sessions that have exceeded shift/max limits
 */
const processAutoPunchOut = async () => {
  try {
    const policy = await getActivePolicy();
    if (policy.autoPunchOutMode === 'DISABLED') {
      return { processed: 0, message: 'Auto punch-out is disabled in policy.' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Find all attendance records that have punchIn but no punchOut.time
    const openRecords = await Attendance.find({
      'punchIn.time': { $exists: true },
      'punchOut.time': { $exists: false },
    })
      .populate('userId', 'name email departmentId branchId teamId')
      .populate('shiftId');

    let processedCount = 0;

    for (const record of openRecords) {
      if (!record.punchIn || !record.punchIn.time) continue;

      const punchInDate = new Date(record.punchIn.time);
      const isPastDay = record.date !== todayStr;

      // Determine shift schedule
      const shiftStartTimeStr = record.shiftId?.startTime || policy.standardStartTime || '09:00';
      const shiftEndTimeStr = record.shiftId?.endTime || policy.standardEndTime || '18:00';

      const scheduledEnd = setTimeToDate(punchInDate, shiftEndTimeStr);
      const scheduledStart = setTimeToDate(punchInDate, shiftStartTimeStr);

      // Check if cutoff has elapsed
      let shouldAutoPunch = false;
      let effectivePunchOutTime = new Date();
      let methodUsed = 'Auto-ShiftEnd';
      let reason = '';

      if (policy.autoPunchOutMode === 'SHIFT_END') {
        // If current time is after scheduled shift end (plus 30 min buffer) OR record is from a previous day
        if (isPastDay || now > new Date(scheduledEnd.getTime() + 30 * 60 * 1000)) {
          shouldAutoPunch = true;
          effectivePunchOutTime = scheduledEnd;
          methodUsed = 'Auto-ShiftEnd';
          reason = `Auto punched out at shift end (${shiftEndTimeStr}) due to missing punch-out.`;
        }
      } else if (policy.autoPunchOutMode === 'MAX_HOURS') {
        const maxHours = policy.autoPunchOutMaxHours || 9.0;
        const maxDurationMs = maxHours * 60 * 60 * 1000;
        const elapsedSincePunchIn = now - punchInDate;

        if (isPastDay || elapsedSincePunchIn >= maxDurationMs) {
          shouldAutoPunch = true;
          effectivePunchOutTime = new Date(punchInDate.getTime() + maxDurationMs);
          methodUsed = 'Auto-MaxHours';
          reason = `Auto punched out after max duration limit (${maxHours}h).`;
        }
      }

      if (shouldAutoPunch) {
        // Run centralized attendance calculations
        const metrics = calculateAttendanceSummary({
          punchInTime: punchInDate,
          punchOutTime: effectivePunchOutTime,
          scheduledStartTime: scheduledStart,
          scheduledEndTime: scheduledEnd,
          policy,
          shift: record.shiftId || {},
        });

        // Set punchOut details
        record.punchOut = {
          time: effectivePunchOutTime,
          isAutoPunched: true,
          method: methodUsed,
          ipAddress: '127.0.0.1 (SYSTEM)',
        };

        record.actualPunchOutAt = null; // No physical punch-out recorded
        record.effectivePunchOutAt = effectivePunchOutTime;
        record.actualWorkedMinutes = 0; // Actual physical observation is 0 past punch-in
        record.effectiveWorkedMinutes = metrics.effectiveWorkedMinutes;
        record.workingHours = metrics.workingHours;
        record.unpaidBreakMinutes = metrics.unpaidBreakMinutes;
        record.lateMinutes = metrics.lateMinutes;
        record.earlyDepartureMinutes = metrics.earlyDepartureMinutes;
        record.overtimeMinutes = 0; // Do not auto-grant overtime for missing punch-out
        record.status = metrics.status;
        record.flags = [...new Set([...metrics.flags, 'Auto-Punched', 'Missing-Punch-Out'])];
        record.isAutoPunchOut = true;
        record.autoPunchOutReason = reason;

        if (policy.autoPunchOutRequireReview) {
          record.needsReview = true;
          record.reviewStatus = 'Pending-Review';
        }

        await record.save();
        processedCount++;

        // System audit log
        await logActivity({
          userId: record.userId?._id,
          userName: 'SYSTEM',
          userEmail: 'system@erp.local',
          action: 'ATTENDANCE_AUTO_PUNCH_OUT',
          module: 'attendance',
          resourceId: record._id.toString(),
          description: `${reason} for user ${record.userId?.name || 'Employee'}. Effective duration: ${metrics.workingHours}h.`,
        });

        // Notify employee
        if (policy.autoPunchOutNotifyEmployee && record.userId?._id) {
          await sendNotification({
            userId: record.userId._id,
            title: 'Automatic Punch-Out Applied',
            message: `Your attendance for ${record.date} was automatically closed at ${effectivePunchOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Please submit a correction if your timings differed.`,
            type: 'AUTO_PUNCH_OUT',
            referenceId: record._id,
          });
        }
      }
    }

    const io = getIO();
    if (io && processedCount > 0) {
      io.emit('attendance_batch_updated', { processed: processedCount });
    }

    return { processed: processedCount, message: `Processed ${processedCount} open attendance sessions.` };
  } catch (error) {
    console.error('[AutomaticPunchOutService] Error running auto punch-out:', error);
    throw error;
  }
};

module.exports = {
  processAutoPunchOut,
};
