/**
 * Unit Test for Ticket Mongoose Model Definitions:
 * - startedAt, stoppedAt, totalWorkingSeconds, priority
 * - Pre-save hook synchronization
 */

const assert = require('assert');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

async function run() {
  console.log('Testing Ticket Model Schema & Synchronization...');

  // Verify Schema Fields
  const paths = Ticket.schema.paths;
  assert.ok(paths.startedAt, 'startedAt field must exist in Ticket schema');
  assert.ok(paths.stoppedAt, 'stoppedAt field must exist in Ticket schema');
  assert.ok(paths.totalWorkingSeconds, 'totalWorkingSeconds field must exist in Ticket schema');
  assert.ok(paths.priority, 'priority field must exist in Ticket schema');
  const durationPaths = paths.workingDuration?.schema?.paths;
  assert.ok(durationPaths?.totalSeconds, 'totalSeconds field must exist in workingDuration schema');

  console.log('  ✓ Schema paths validated successfully:');
  console.log('    - startedAt:', paths.startedAt.instance);
  console.log('    - stoppedAt:', paths.stoppedAt.instance);
  console.log('    - totalWorkingSeconds:', paths.totalWorkingSeconds.instance);
  console.log('    - priority enum:', paths.priority.enumValues);
  console.log('    - workingDuration.totalSeconds:', durationPaths.totalSeconds.instance);

  // Verify Document Synchronization logic
  const doc1 = new Ticket({
    ticketNo: 'TCK-TEST-1',
    ticketType: 'Normal Ticket',
    companyId: new mongoose.Types.ObjectId(),
    createdBy: new mongoose.Types.ObjectId(),
    startTime: new Date('2026-11-05T10:00:00Z'),
    stopTime: new Date('2026-11-05T11:30:00Z'),
    workingDuration: {
      durationMs: 5400000,
      formatted: '1h 30m',
    },
  });

  // Trigger synchronization logic via validate()
  await doc1.validate();

  assert.strictEqual(doc1.startedAt.getTime(), doc1.startTime.getTime(), 'startedAt should sync from startTime');
  assert.strictEqual(doc1.stoppedAt.getTime(), doc1.stopTime.getTime(), 'stoppedAt should sync from stopTime');
  assert.strictEqual(doc1.totalWorkingSeconds, 5400, 'totalWorkingSeconds should sync from durationMs (5400s)');
  assert.strictEqual(doc1.priority, 'Medium', 'priority default should be Medium');

  console.log('  ✓ Pre-save synchronization hook verified:');
  console.log('    - startedAt:', doc1.startedAt.toISOString());
  console.log('    - stoppedAt:', doc1.stoppedAt.toISOString());
  console.log('    - totalWorkingSeconds:', doc1.totalWorkingSeconds);
  console.log('    - priority:', doc1.priority);

  console.log('\n[PASS] All Model Schema & Hook validations passed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
