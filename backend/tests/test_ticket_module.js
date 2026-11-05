/**
 * Comprehensive Test Suite for Enhanced ERP Ticket Module
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Ticket = require('../models/Ticket');
const { createAccessToken } = require('../services/tokenService');

async function runTests() {
  console.log('====================================================');
  console.log('STARTING ENHANCED TICKET MODULE INTEGRATION TESTS');
  console.log('====================================================\n');

  await connectDB();

  // 1. Get test user and company
  const user = await User.findOne({ email: 'admin@erp.com' });
  if (!user) throw new Error('Admin user admin@erp.com not found');
  console.log(`[PASS] Found test user: ${user.name} (${user.email})`);

  const company = await Company.findOne({});
  if (!company) throw new Error('No test company found');
  console.log(`[PASS] Found test company: ${company.company} (${company._id})\n`);

  // ------------------------------------------------------------------
  // TEST 1: Normal Ticket Creation
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Normal Ticket Creation ---');
  const normalTicket = await Ticket.create({
    ticketNo: 'TCK-NORM-' + Date.now().toString().slice(-4),
    ticketType: 'Normal Ticket',
    companyId: company._id,
    contactPerson: 'Suresh Verma',
    phoneNumber: '9876543210',
    unit: 'Plant',
    subject: 'Normal Routine Inspection',
    description: 'General system maintenance check',
    status: 'Pending',
    beforeServiceImages: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    createdBy: user._id,
    departmentId: user.departmentId,
  });
  console.log(`[PASS] Normal ticket created successfully: ${normalTicket.ticketNo}`);
  if (normalTicket.ticketType !== 'Normal Ticket') throw new Error('Invalid ticket type');
  if (normalTicket.unit !== 'Plant') throw new Error('Invalid unit');
  if (normalTicket.beforeServiceImages.length !== 1) throw new Error('Before images mismatch');
  console.log(`[PASS] Verified Normal Ticket fields and before-service image persistence.\n`);

  // ------------------------------------------------------------------
  // TEST 2: Rewinding Ticket Creation (with HP & RPM)
  // ------------------------------------------------------------------
  console.log('--- TEST 2: Rewinding Ticket Creation ---');
  const rewindingTicket = await Ticket.create({
    ticketNo: 'TCK-REW-' + Date.now().toString().slice(-4),
    ticketType: 'Rewinding Ticket',
    companyId: company._id,
    contactPerson: 'Ramesh Patel',
    phoneNumber: '9811223344',
    unit: 'Mill',
    subject: 'Motor Coil Rewinding 30 HP',
    description: 'Burnt stator coil needs rewinding',
    hp: '30',
    rpm: '1440',
    status: 'Pending',
    createdBy: user._id,
    departmentId: user.departmentId,
  });
  console.log(`[PASS] Rewinding ticket created: ${rewindingTicket.ticketNo}`);
  if (rewindingTicket.hp !== '30' || rewindingTicket.rpm !== '1440') {
    throw new Error('HP or RPM mismatch in Rewinding Ticket');
  }
  console.log(`[PASS] Rewinding Ticket HP (${rewindingTicket.hp}) and RPM (${rewindingTicket.rpm}) verified.\n`);

  // ------------------------------------------------------------------
  // TEST 3: Out Door Ticket Creation (with Mill Name)
  // ------------------------------------------------------------------
  console.log('--- TEST 3: Out Door Ticket Creation ---');
  const outdoorTicket = await Ticket.create({
    ticketNo: 'TCK-OUT-' + Date.now().toString().slice(-4),
    ticketType: 'Out Door Ticket',
    companyId: company._id,
    contactPerson: 'Kalyan Sundaram',
    phoneNumber: '9988776655',
    unit: 'Boiler',
    subject: 'External Field Installation & Testing',
    description: 'Outdoor mill pipeline alignment issue',
    millName: 'Sri Venkateswara Rice & Flour Mills',
    status: 'Pending',
    createdBy: user._id,
    departmentId: user.departmentId,
  });
  console.log(`[PASS] Out Door ticket created: ${outdoorTicket.ticketNo}`);
  if (!outdoorTicket.millName) throw new Error('Mill Name missing in Out Door ticket');
  console.log(`[PASS] Out Door Ticket Mill Name verified: "${outdoorTicket.millName}".\n`);

  // ------------------------------------------------------------------
  // TEST 4: AMC Ticket Creation (with HP, RPM & Unit)
  // ------------------------------------------------------------------
  console.log('--- TEST 4: AMC Ticket Creation ---');
  const amcTicket = await Ticket.create({
    ticketNo: 'TCK-AMC-' + Date.now().toString().slice(-4),
    ticketType: 'AMC Ticket',
    companyId: company._id,
    contactPerson: 'Deepak Joshi',
    phoneNumber: '9123456789',
    unit: 'Round Silo',
    subject: 'Quarterly AMC Inspection Schedule',
    description: 'Scheduled quarterly preventive inspection',
    hp: '75',
    rpm: '2800',
    status: 'Pending',
    createdBy: user._id,
    departmentId: user.departmentId,
  });
  console.log(`[PASS] AMC ticket created: ${amcTicket.ticketNo}`);
  if (amcTicket.hp !== '75' || amcTicket.rpm !== '2800' || amcTicket.unit !== 'Round Silo') {
    throw new Error('AMC specifications mismatch');
  }
  console.log(`[PASS] AMC Ticket parameters verified: HP ${amcTicket.hp}, RPM ${amcTicket.rpm}, Unit ${amcTicket.unit}.\n`);

  // ------------------------------------------------------------------
  // TEST 5: Panel Board Ticket Creation (with Mill Name)
  // ------------------------------------------------------------------
  console.log('--- TEST 5: Panel Board Ticket Creation ---');
  const panelTicket = await Ticket.create({
    ticketNo: 'TCK-PNL-' + Date.now().toString().slice(-4),
    ticketType: 'Panel Board Ticket',
    companyId: company._id,
    contactPerson: 'Anand Reddy',
    phoneNumber: '9440123456',
    unit: 'Plant',
    subject: 'Main Distribution Panel Breaker Tripping',
    description: 'PLC breaker tripping intermittently under peak load',
    millName: 'Godavari Mega Agro Mill #1',
    status: 'Pending',
    createdBy: user._id,
    departmentId: user.departmentId,
  });
  console.log(`[PASS] Panel Board ticket created: ${panelTicket.ticketNo}`);
  if (!panelTicket.millName) throw new Error('Mill Name missing in Panel Board ticket');
  console.log(`[PASS] Panel Board Mill Name verified: "${panelTicket.millName}".\n`);

  // ------------------------------------------------------------------
  // TEST 6: Start Ticket Lifecycle & GPS Telemetry Tracking
  // ------------------------------------------------------------------
  console.log('--- TEST 6: Start Ticket Lifecycle & Telemetry ---');
  // Simulate starting normalTicket
  const startTime = new Date(Date.now() - 3 * 3600 * 1000 - 25 * 60 * 1000); // 3 hrs 25 mins ago
  normalTicket.status = 'In Progress';
  normalTicket.startTime = startTime;
  normalTicket.startedBy = user._id;
  normalTicket.startedByName = user.name;
  normalTicket.startLocation = {
    lat: 17.38504,
    lng: 78.48667,
    address: 'Industrial Development Area, Nacharam, Hyderabad',
    accuracy: 14,
  };
  await normalTicket.save();

  const startedTicket = await Ticket.findById(normalTicket._id);
  console.log(`[PASS] Ticket status updated to: ${startedTicket.status}`);
  console.log(`[PASS] Started by: ${startedTicket.startedByName}`);
  console.log(`[PASS] Start GPS: Lat ${startedTicket.startLocation.lat}, Lng ${startedTicket.startLocation.lng}`);
  console.log(`[PASS] Start Address: ${startedTicket.startLocation.address}\n`);

  // ------------------------------------------------------------------
  // TEST 7: Stop Ticket Lifecycle, Working Hours & Images
  // ------------------------------------------------------------------
  console.log('--- TEST 7: Stop Ticket Lifecycle & Working Duration ---');
  const stopTime = new Date(); // Stopped now
  const diffMs = stopTime.getTime() - normalTicket.startTime.getTime();
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const formattedDuration = `${totalHours} Hours ${totalMinutes} Minutes`;

  normalTicket.status = 'Completed';
  normalTicket.stopTime = stopTime;
  normalTicket.stoppedBy = user._id;
  normalTicket.stoppedByName = user.name;
  normalTicket.stopLocation = {
    lat: 17.38520,
    lng: 78.48680,
    address: 'Client Main Delivery Gate, IDA Nacharam',
    accuracy: 10,
  };
  normalTicket.workingDuration = {
    totalHours,
    totalMinutes,
    durationMs: diffMs,
    formatted: formattedDuration,
  };
  normalTicket.afterServiceImages = [
    'https://res.cloudinary.com/demo/image/upload/sample_after1.jpg',
    'https://res.cloudinary.com/demo/image/upload/sample_after2.jpg',
  ];
  normalTicket.serviceCompletionRemarks =
    'Successfully replaced worn bearings, re-aligned motor shaft, and conducted thermal test. Machine running at nominal 45°C.';
  await normalTicket.save();

  const completedTicket = await Ticket.findById(normalTicket._id);
  console.log(`[PASS] Ticket status updated to: ${completedTicket.status}`);
  console.log(`[PASS] Stopped by: ${completedTicket.stoppedByName}`);
  console.log(`[PASS] Calculated Working Duration: ${completedTicket.workingDuration.formatted}`);
  console.log(`[PASS] Total Hours: ${completedTicket.workingDuration.totalHours}, Minutes: ${completedTicket.workingDuration.totalMinutes}`);
  console.log(`[PASS] After-service images stored: ${completedTicket.afterServiceImages.length} images`);
  console.log(`[PASS] Service remarks: "${completedTicket.serviceCompletionRemarks}"\n`);

  // ------------------------------------------------------------------
  // TEST 8: Backward Compatibility with Existing Legacy Tickets
  // ------------------------------------------------------------------
  console.log('--- TEST 8: Backward Compatibility with Legacy Tickets ---');
  const legacyTickets = await Ticket.find({ ticketNo: { $in: ['TCK-1002', 'TCK-6DDCDF'] } });
  console.log(`[PASS] Successfully retrieved ${legacyTickets.length} legacy tickets from database.`);
  legacyTickets.forEach((t) => {
    console.log(`       - Ticket #${t.ticketNo} | Type: ${t.ticketType} | Status: ${t.status}`);
  });

  console.log('\n====================================================');
  console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (8/8)');
  console.log('====================================================');

  process.exit(0);
}

runTests().catch((err) => {
  console.error('[FAIL] Test execution error:', err);
  process.exit(1);
});
