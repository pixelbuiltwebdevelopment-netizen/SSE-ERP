require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const {
  evaluatePunchIn,
  calculateAttendanceSummary,
  setTimeToDate,
} = require('../services/attendanceCalculationService');

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

// Standard test policy and shift
const mockPolicy = {
  timezone: 'Asia/Kolkata',
  standardStartTime: '09:00',
  standardEndTime: '18:00',
  gracePeriodMinutes: 15,
  requiredWorkHours: 8.0,
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 8.0,
  unpaidBreakMinutes: 60,
  earlyDepartureThresholdMinutes: 30,
  overtimeEnabled: true,
  overtimeMinMinutes: 30,
  overtimeMaxHoursDaily: 4.0,
};

const mockShift = {
  name: 'General Shift',
  code: 'GEN',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  requiredHours: 8.0,
  halfDayThresholdHours: 4.0,
  fullDayThresholdHours: 8.0,
  breakMinutes: 60,
  unpaidBreakMinutes: 60,
};

// 1. Employee punches in on time (9:05 AM vs 9:00 AM start with 15m grace)
runTest('Case 1: Employee punches in on time within grace period (09:05)', () => {
  const baseDate = new Date('2026-10-16T09:00:00.000Z');
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

// 3. Employee punches out correctly with full day (9:00 AM to 18:00 PM = 9h - 1h break = 8h)
runTest('Case 3: Full-Day threshold reached (8.0 hours after break deduction)', () => {
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
  assert.strictEqual(result.workingHours, 8.0);
  assert.strictEqual(result.effectiveWorkedMinutes, 480);
  assert.strictEqual(result.unpaidBreakMinutes, 60);
  assert.ok(result.flags.includes('Full-Day'));
});

// 4. Half-day threshold is reached (worked 4.5 hours elapsed - 1h break = 3.5h is incomplete, but 5h - 1h break = 4h is Half-Day)
runTest('Case 4: Half-day threshold accurately evaluated', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T14:00:00.000Z'); // 5 hours elapsed - 1h break = 4.0 hours

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

// 5. Incomplete attendance (less than 4 hours worked)
runTest('Case 5: Incomplete attendance (less than half-day threshold)', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T12:00:00.000Z'); // 3 hours elapsed - 1h break = 2.0 hours

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: new Date('2026-10-16T18:00:00.000Z'),
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.status, 'Incomplete');
  assert.strictEqual(result.workingHours, 2.0);
  assert.ok(result.flags.includes('Incomplete'));
});

// 6. Overtime Calculation (9:00 AM to 19:30 PM = 10.5h elapsed - 1h break = 9.5h worked -> 1.5h OT = 90 mins)
runTest('Case 6: Overtime calculation beyond required work hours', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T19:30:00.000Z'); // 10.5h - 1h = 9.5h (1.5h overtime = 90m)

  const result = calculateAttendanceSummary({
    punchInTime: punchIn,
    punchOutTime: punchOut,
    scheduledStartTime: punchIn,
    scheduledEndTime: new Date('2026-10-16T18:00:00.000Z'),
    policy: mockPolicy,
    shift: mockShift,
  });

  assert.strictEqual(result.workingHours, 9.5);
  assert.strictEqual(result.overtimeMinutes, 90);
  assert.ok(result.flags.includes('Overtime'));
});

// 7. Early Departure calculation
runTest('Case 7: Early departure detection (leaving 45 mins before shift end)', () => {
  const punchIn = new Date('2026-10-16T09:00:00.000Z');
  const punchOut = new Date('2026-10-16T17:15:00.000Z'); // 45m before 18:00 (threshold is 30m)
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

// 8. Idempotency test for time parsing
runTest('Case 8: Time parser setTimeToDate idempotency', () => {
  const date = new Date('2026-10-16T00:00:00.000Z');
  const target = setTimeToDate(date, '14:30');
  assert.strictEqual(target.getHours(), 14);
  assert.strictEqual(target.getMinutes(), 30);
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests}/${totalTests} TESTS PASSED!`);
console.log('====================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
