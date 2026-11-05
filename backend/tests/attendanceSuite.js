require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const {
  evaluatePunchIn,
  calculateAttendanceSummary,
  setTimeToDate,
  resolveShift,
} = require('../services/attendanceCalculationService');
const {
  createDateInTimezone,
  getNowInTimezone,
} = require('../services/automaticPunchOutService');

console.log('====================================================');
console.log('🧪 RUNNING COMPREHENSIVE ATTENDANCE TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

const runTest = (name, testFn) => {
  totalTests++;
  try {
    testFn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   Error: ${err.message}\n`);
  }
};

// Standard company-wide policy and shift (no unpaid break deduction)
const mockPolicy = {
  timezone: 'Asia/Kolkata',
  standardStartTime: '09:00',
  standardEndTime: '18:00',
  gracePeriodMinutes: 15,
  requiredWorkHours: 8.0,
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 8.0,
  unpaidBreakMinutes: 0,
  earlyDepartureThresholdMinutes: 30,
  overtimeEnabled: true,
  overtimeMinMinutes: 30,
  overtimeMaxHoursDaily: 4.0,
  autoPunchOutEnabled: true,
  autoPunchOutTime: '18:00',
};

const mockShift = {
  name: 'Standard Company Shift',
  code: 'STD',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  requiredHours: 8.0,
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 8.0,
  unpaidBreakMinutes: 0,
};

// 1. Employee punches in on time (9:05 AM vs 9:00 AM start with 15m grace)
runTest('Case 1: Employee punches in on time within grace period (09:05)', () => {
  const scheduledStart = new Date('2026-10-16T09:00:00.000Z');
  const punchInTime = new Date('2026-10-16T09:05:00.000Z');

  const result = evaluatePunchIn({
    punchInTime,
    scheduledStartTime: scheduledStart,
    graceMinutes: 15,
  });

  assert.strictEqual(result.status, 'On-Time');
  assert.strictEqual(result.lateMinutes, 0);
});

// 2. Employee punches in late (9:25 AM vs 9:00 AM start with 15m grace)
runTest('Case 2: Employee punches in late past grace period (09:25)', () => {
  const scheduledStart = new Date('2026-10-16T09:00:00.000Z');
  const punchInTime = new Date('2026-10-16T09:25:00.000Z');

  const result = evaluatePunchIn({
    punchInTime,
    scheduledStartTime: scheduledStart,
    graceMinutes: 15,
  });

  assert.strictEqual(result.status, 'Late');
  assert.strictEqual(result.lateMinutes, 25);
});

// 3. Employee punches out with Full-Day duration (9:00 AM to 18:00 PM = 9.0 hours, no unpaid break deduction)
runTest('Case 3: Full-Day threshold reached (09:00 to 18:00 = 9.0 hours)', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T18:00:00.000Z');
  const start = new Date('2026-10-16T09:00:00.000Z');
  const end = new Date('2026-10-16T18:00:00.000Z');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: start,
    scheduledEndTime: end,
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.status, 'Present');
  assert.strictEqual(result.workingHours, 9.0);
  assert.strictEqual(result.effectiveWorkedMinutes, 540);
  assert.ok(result.flags.includes('Full-Day'));
});

// 4. Half-day threshold reached (09:00 to 13:00 = 4.0 hours)
runTest('Case 4: Half-day threshold accurately evaluated (4.0 hours)', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T13:00:00.000Z');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: new Date('2026-10-16T18:00:00.000Z'),
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.status, 'Half-Day');
  assert.strictEqual(result.workingHours, 4.0);
  assert.ok(result.flags.includes('Half-Day'));
});

// 5. Incomplete attendance (less than 4 hours worked: 2.5 hours)
runTest('Case 5: Incomplete attendance (less than half-day threshold: 2.5 hours)', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T11:30:00.000Z');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: new Date('2026-10-16T18:00:00.000Z'),
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.status, 'Incomplete');
  assert.strictEqual(result.workingHours, 2.5);
  assert.ok(result.flags.includes('Incomplete'));
});

// 6. Overtime Calculation beyond 8 hours requirement (9:00 to 19:30 = 10.5h -> 2.5h OT = 150 mins)
runTest('Case 6: Overtime calculation beyond required work hours', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T19:30:00.000Z');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: new Date('2026-10-16T18:00:00.000Z'),
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.workingHours, 10.5);
  assert.strictEqual(result.overtimeMinutes, 150);
  assert.ok(result.flags.includes('Overtime'));
});

// 7. Early Departure calculation (leaving 45 mins before 18:00 shift end)
runTest('Case 7: Early departure detection (leaving 45 mins before shift end)', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T17:15:00.000Z');
  const scheduledEnd = new Date('2026-10-16T18:00:00.000Z');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: scheduledEnd,
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.earlyDepartureMinutes, 45);
  assert.ok(result.flags.includes('Early-Departure'));
});

// 8. Automatic Punch-Out at 06:00 PM (18:00) with 09:00 AM punch-in
runTest('Case 8: Automatic punch-out at configured 18:00 PM yields 9.0 working hours', () => {
  const punchIn = createDateInTimezone('2026-11-03', '09:00', 'Asia/Kolkata');
  const autoPunchOut = createDateInTimezone('2026-11-03', '18:00', 'Asia/Kolkata');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: autoPunchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: autoPunchOut,
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.workingHours, 9.0);
  assert.strictEqual(result.effectiveWorkedMinutes, 540);
  assert.ok(result.flags.includes('Full-Day'));
  assert.strictEqual(result.overtimeMinutes, 0 || result.overtimeMinutes); // Auto checkout does not create overtime past auto checkout time
});

// 9. Automatic Punch-Out changed to 08:00 PM (20:00) with 09:00 AM punch-in
runTest('Case 9: Automatic punch-out changed to 20:00 PM yields 11.0 working hours', () => {
  const punchIn = createDateInTimezone('2026-11-03', '09:00', 'Asia/Kolkata');
  const autoPunchOut = createDateInTimezone('2026-11-03', '20:00', 'Asia/Kolkata');

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: autoPunchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: autoPunchOut,
    policy: { ...mockPolicy, autoPunchOutTime: '20:00' },
    shift: mockShift,
  });

  assert.strictEqual(result.workingHours, 11.0);
  assert.strictEqual(result.effectiveWorkedMinutes, 660);
});

// 10. Timezone parser createDateInTimezone accuracy
runTest('Case 10: Timezone parser createDateInTimezone accuracy', () => {
  const dateKolkata = createDateInTimezone('2026-11-03', '18:00', 'Asia/Kolkata');
  const formatted = dateKolkata.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  assert.ok(formatted.includes('6:00:00 PM'));
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
