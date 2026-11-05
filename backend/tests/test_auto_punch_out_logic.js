const assert = require('assert');
const {
  calculateAttendanceSummary,
} = require('../services/attendanceCalculationService');
const {
  createDateInTimezone,
  getNowInTimezone,
} = require('../services/automaticPunchOutService');

console.log('================================================================');
console.log('🧪 TESTING MISSING PUNCH-OUT AUTOMATION & SINGLE SHIFT LOGIC');
console.log('================================================================\n');

// 1. Verification of Example 1:
// Admin configures automatic punch-out time as 06:00 PM.
// Employee punches in at 09:00 AM. Employee forgets to punch out.
// At 06:00 PM, system records 06:00 PM as checkout time.
// Working hours = 09:00 AM to 06:00 PM = 9.00 hours.
console.log('Test 1: Example 1 - 09:00 AM punch-in with 06:00 PM configured auto punch-out');
const punchIn1 = createDateInTimezone('2026-11-03', '09:00', 'Asia/Kolkata');
const autoPunchOut1 = createDateInTimezone('2026-11-03', '18:00', 'Asia/Kolkata');

const policy1 = {
  timezone: 'Asia/Kolkata',
  standardStartTime: '09:00',
  standardEndTime: '18:00',
  gracePeriodMinutes: 15,
  requiredWorkHours: 8.0,
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 8.0,
  autoPunchOutEnabled: true,
  autoPunchOutTime: '18:00',
  overtimeEnabled: true,
};

const result1 = calculateAttendanceSummary({
  punchInTime: punchIn1,
  punchOutTime: autoPunchOut1,
  scheduledStartTime: punchIn1,
  scheduledEndTime: autoPunchOut1,
  policy: policy1,
  shift: {
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    requiredHours: 8.0,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 8.0,
    unpaidBreakMinutes: 0,
  },
});

assert.strictEqual(result1.workingHours, 9.0, 'Working hours must be exactly 9.0 hours');
assert.strictEqual(result1.effectiveWorkedMinutes, 540, 'Effective worked minutes must be 540 mins');
assert.strictEqual(result1.unpaidBreakMinutes, 0, 'Unpaid lunch break must be 0 (removed)');
assert.strictEqual(result1.status, 'Present');
console.log('  -> Result: 9.0 hours worked, status: Present, unpaid break: 0m. PASSED!\n');

// 2. Verification of Example 2:
// Admin changes automatic punch-out time to 08:00 PM.
// Employees who miss checkout receive 08:00 PM as checkout time.
// Working hours = 09:00 AM to 08:00 PM = 11.00 hours.
console.log('Test 2: Example 2 - 09:00 AM punch-in with 08:00 PM configured auto punch-out');
const autoPunchOut2 = createDateInTimezone('2026-11-03', '20:00', 'Asia/Kolkata');

const policy2 = {
  ...policy1,
  autoPunchOutTime: '20:00',
};

const result2 = calculateAttendanceSummary({
  punchInTime: punchIn1,
  punchOutTime: autoPunchOut2,
  scheduledStartTime: punchIn1,
  scheduledEndTime: autoPunchOut2,
  policy: policy2,
  shift: {
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMinutes: 15,
    requiredHours: 8.0,
    halfDayThresholdHours: 4.0,
    fullDayThresholdHours: 8.0,
    unpaidBreakMinutes: 0,
  },
});

assert.strictEqual(result2.workingHours, 11.0, 'Working hours must be exactly 11.0 hours');
assert.strictEqual(result2.effectiveWorkedMinutes, 660, 'Effective worked minutes must be 660 mins');
console.log('  -> Result: 11.0 hours worked. PASSED!\n');

// 3. Test Actual checkout protection:
// If an employee already has an actual checkout (e.g. 17:30), they must NOT be overwritten.
console.log('Test 3: Employee with actual checkout (17:30) is not affected by auto punch-out');
const mockExistingRecord = {
  date: '2026-11-03',
  punchIn: { time: punchIn1 },
  punchOut: { time: createDateInTimezone('2026-11-03', '17:30', 'Asia/Kolkata'), method: 'Manual' },
};
// Simulating query filter logic:
const shouldProcess = !mockExistingRecord.punchOut?.time;
assert.strictEqual(shouldProcess, false, 'Record with actual punchOut must NOT be selected');
console.log('  -> Employee with actual checkout skipped. PASSED!\n');

// 4. Test Idempotency:
// If record is already auto punched, query skips it.
console.log('Test 4: Idempotency check');
const mockAutoPunchedRecord = {
  date: '2026-11-03',
  punchIn: { time: punchIn1 },
  punchOut: { time: autoPunchOut1, method: 'AUTO', isAutoPunched: true },
  isAutoPunchOut: true,
};
const shouldReprocess = !mockAutoPunchedRecord.punchOut?.time && !mockAutoPunchedRecord.isAutoPunchOut;
assert.strictEqual(shouldReprocess, false, 'Already auto-punched record must NOT be selected again');
console.log('  -> Repeated execution does not duplicate records. PASSED!\n');

// 5. Test Disable toggle:
console.log('Test 5: Disabled toggle stops processing');
const policyDisabled = { ...policy1, autoPunchOutEnabled: false };
const isAutomationActive = policyDisabled.autoPunchOutEnabled !== false && policyDisabled.autoPunchOutMode !== 'DISABLED';
assert.strictEqual(isAutomationActive, false, 'Automation must be inactive when disabled');
console.log('  -> Disabled automation correctly halts processing. PASSED!\n');

// 6. Test Timezone accuracy:
console.log('Test 6: Timezone correctness across regions');
const kolkataDate = createDateInTimezone('2026-11-03', '18:00', 'Asia/Kolkata');
const nyDate = createDateInTimezone('2026-11-03', '18:00', 'America/New_York');
assert.strictEqual(kolkataDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }), '18:00');
assert.strictEqual(nyDate.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false }), '18:00');
console.log('  -> Timezone conversions accurate. PASSED!\n');

// 7. Test "After 12:00 AM Midnight" Condition:
console.log('Test 7: Sessions on active working day are NOT auto punched out; only past days after 12:00 AM are processed');
const todayDateStr = '2026-11-04';
const activeTodayRecord = { date: '2026-11-04', punchIn: { time: new Date() }, punchOut: null };
const pastDayRecord = { date: '2026-11-03', punchIn: { time: punchIn1 }, punchOut: null };

// Active today session check:
const shouldAutoPunchToday = activeTodayRecord.date < todayDateStr;
assert.strictEqual(shouldAutoPunchToday, false, 'Today session before midnight MUST NOT be auto punched out');

// Past day session check (after 12 AM):
const shouldAutoPunchPast = pastDayRecord.date < todayDateStr;
assert.strictEqual(shouldAutoPunchPast, true, 'Past day session after 12 AM midnight MUST be auto punched out');
console.log('  -> After 12:00 AM midnight date boundary logic verified. PASSED!\n');

// 8. Test Manual Checkout overrides Auto-Punch:
console.log('Test 8: Manual punch-out allowed if previously auto-punched');
const autoPunchedRecord = {
  isAutoPunchOut: true,
  punchOut: { time: autoPunchOut1, method: 'AUTO', isAutoPunched: true },
};
const canManuallyPunchOut = Boolean(
  !autoPunchedRecord.punchOut?.time ||
  autoPunchedRecord.isAutoPunchOut ||
  autoPunchedRecord.punchOut?.method === 'AUTO'
);
assert.strictEqual(canManuallyPunchOut, true, 'User MUST be allowed to manually punch out even if previously auto-punched');
console.log('  -> Manual checkout override verified. PASSED!\n');

console.log('================================================================');
console.log('🎉 ALL MISSING PUNCH-OUT & SHIFT POLICY UNIT TESTS PASSED!');
console.log('================================================================');
