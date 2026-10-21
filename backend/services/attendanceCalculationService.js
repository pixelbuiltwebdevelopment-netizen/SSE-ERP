const AttendancePolicy = require('../models/AttendancePolicy');
const Shift = require('../models/Shift');
const LeaveRequest = require('../models/LeaveRequest');
const CalendarEvent = require('../models/CalendarEvent');

/**
 * Helper to parse "HH:mm" on a given Date object (in local/configured timezone)
 */
const setTimeToDate = (baseDate, timeStr) => {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Fetch active policy or return standard defaults
 */
const getActivePolicy = async () => {
  let policy = await AttendancePolicy.findOne({ isActive: true });
  if (!policy) {
    policy = {
      timezone: 'Asia/Kolkata',
      standardStartTime: '09:00',
      standardEndTime: '18:00',
      requiredWorkHours: 8.0,
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.0,
      fullDayThresholdHours: 8.0,
      unpaidBreakMinutes: 60,
      paidBreakMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
      overtimeEnabled: true,
      overtimeRequiresApproval: true,
      overtimeMinMinutes: 30,
      overtimeMaxHoursDaily: 4.0,
      autoPunchOutMode: 'SHIFT_END',
      autoPunchOutMaxHours: 9.0,
      weeklyHolidays: ['Sunday'],
    };
  }
  return policy;
};

/**
 * Resolve effective shift for an employee
 */
const resolveShift = async (user) => {
  let shift = null;
  if (user && user.shiftId) {
    shift = await Shift.findById(user.shiftId);
  }
  if (!shift && user && user.departmentId) {
    shift = await Shift.findOne({ departmentIds: user.departmentId, isActive: true });
  }
  if (!shift) {
    shift = await Shift.findOne({ isDefault: true, isActive: true });
  }
  if (!shift) {
    shift = await Shift.findOne({ isActive: true });
  }
  if (!shift) {
    // Fallback standard shift
    shift = {
      _id: null,
      name: 'General Shift',
      code: 'GEN',
      startTime: '09:00',
      endTime: '18:00',
      requiredHours: 8.0,
      gracePeriodMinutes: 15,
      halfDayThresholdHours: 4.0,
      fullDayThresholdHours: 8.0,
      breakMinutes: 60,
      unpaidBreakMinutes: 60,
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    };
  }
  return shift;
};

/**
 * Evaluate punch-in on-time / late status
 */
const evaluatePunchIn = ({ punchInTime, scheduledStartTime, graceMinutes = 15 }) => {
  const diffMinutes = Math.floor((punchInTime - scheduledStartTime) / (1000 * 60));
  if (diffMinutes > graceMinutes) {
    return {
      status: 'Late',
      lateMinutes: diffMinutes,
    };
  }
  return {
    status: 'On-Time',
    lateMinutes: 0,
  };
};

/**
 * Calculate full attendance metrics on punch out or auto-punch out
 */
const calculateAttendanceSummary = ({
  punchInTime,
  punchOutTime,
  scheduledStartTime,
  scheduledEndTime,
  policy,
  shift,
}) => {
  const punchInDate = new Date(punchInTime);
  const punchOutDate = new Date(punchOutTime);

  // Raw worked milliseconds
  const rawDiffMs = Math.max(0, punchOutDate - punchInDate);
  const rawWorkedMinutes = Math.floor(rawDiffMs / (1000 * 60));

  // Break deduction
  const unpaidBreak = shift.unpaidBreakMinutes !== undefined 
    ? shift.unpaidBreakMinutes 
    : (policy.unpaidBreakMinutes || 0);

  // Apply unpaid break deduction only if worked duration is longer than break
  const effectiveWorkedMinutes = rawWorkedMinutes > unpaidBreak 
    ? rawWorkedMinutes - unpaidBreak 
    : rawWorkedMinutes;

  const workingHours = parseFloat((effectiveWorkedMinutes / 60).toFixed(2));

  // Late calculation
  let lateMinutes = 0;
  if (scheduledStartTime) {
    const grace = shift.gracePeriodMinutes !== undefined ? shift.gracePeriodMinutes : policy.gracePeriodMinutes;
    const diffStartMinutes = Math.floor((punchInDate - scheduledStartTime) / (1000 * 60));
    if (diffStartMinutes > grace) {
      lateMinutes = diffStartMinutes;
    }
  }

  // Early departure calculation
  let earlyDepartureMinutes = 0;
  if (scheduledEndTime) {
    const diffEndMinutes = Math.floor((scheduledEndTime - punchOutDate) / (1000 * 60));
    if (diffEndMinutes > (policy.earlyDepartureThresholdMinutes || 0)) {
      earlyDepartureMinutes = diffEndMinutes;
    }
  }

  // Required working minutes
  const requiredHours = shift.requiredHours || policy.requiredWorkHours || 8.0;
  const requiredMinutes = requiredHours * 60;

  // Overtime calculation
  let overtimeMinutes = 0;
  if (policy.overtimeEnabled && effectiveWorkedMinutes > requiredMinutes) {
    const candidateOt = effectiveWorkedMinutes - requiredMinutes;
    if (candidateOt >= (policy.overtimeMinMinutes || 30)) {
      const maxOtMinutes = (policy.overtimeMaxHoursDaily || 4.0) * 60;
      overtimeMinutes = Math.min(candidateOt, maxOtMinutes);
    }
  }

  // Determine Attendance Status
  const halfDayThresholdHours = shift.halfDayThresholdHours || policy.halfDayThresholdHours || 4.0;
  const fullDayThresholdHours = shift.fullDayThresholdHours || policy.fullDayThresholdHours || 8.0;

  let attendanceStatus = 'Present';
  const flags = ['Present'];

  if (workingHours < halfDayThresholdHours) {
    attendanceStatus = 'Incomplete';
    flags.push('Incomplete');
  } else if (workingHours < fullDayThresholdHours) {
    attendanceStatus = 'Half-Day';
    flags.push('Half-Day');
  } else {
    attendanceStatus = 'Present';
    flags.push('Full-Day');
  }

  if (lateMinutes > 0) {
    flags.push('Late');
  }
  if (earlyDepartureMinutes > 0) {
    flags.push('Early-Departure');
  }
  if (overtimeMinutes > 0) {
    flags.push('Overtime');
  }

  return {
    actualWorkedMinutes: rawWorkedMinutes,
    effectiveWorkedMinutes,
    workingHours,
    unpaidBreakMinutes: unpaidBreak,
    lateMinutes,
    earlyDepartureMinutes,
    overtimeMinutes,
    status: attendanceStatus,
    flags,
  };
};

module.exports = {
  setTimeToDate,
  getActivePolicy,
  resolveShift,
  evaluatePunchIn,
  calculateAttendanceSummary,
};
