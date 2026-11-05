/**
 * API Endpoints & Validations Test Suite for Tickets
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const app = require('../app');
const http = require('http');
const User = require('../models/User');
const Company = require('../models/Company');
const Ticket = require('../models/Ticket');
const { generateAccessToken } = require('../services/tokenService');

let server;
let baseUrl;

async function request(method, path, body = null, token = null, isMultipart = false) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      headers: {},
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    let payload = null;
    if (body) {
      if (isMultipart) {
        // multipart raw buffer
        options.headers['Content-Type'] = body.contentType;
        payload = body.buffer;
      } else {
        options.headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
    }

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runApiTests() {
  console.log('====================================================');
  console.log('STARTING EXPRESS HTTP API & VALIDATION TEST SUITE');
  console.log('====================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`[PASS] Test HTTP server listening on port ${port}`);

  const user = await User.findOne({ email: 'admin@erp.com' });
  const company = await Company.findOne({});
  const token = generateAccessToken(user);

  console.log(`[PASS] Generated JWT for ${user.email}\n`);

  // 1. Fetch Companies for Ticket
  console.log('--- TEST 1: GET /api/tickets/companies ---');
  const compRes = await request('GET', '/api/tickets/companies', null, token);
  console.log(`[PASS] Status: ${compRes.status}, Companies count: ${compRes.body.data.companies.length}`);
  if (compRes.status !== 200 || !compRes.body.data.companies) throw new Error('Companies endpoint failed');

  // 2. Validate Rewinding Ticket requires HP and RPM
  console.log('\n--- TEST 2: Validation Check - Rewinding Ticket requires HP & RPM ---');
  const badRewindRes = await request(
    'POST',
    '/api/tickets',
    {
      ticketType: 'Rewinding Ticket',
      companyId: company._id.toString(),
      contactPerson: 'Karan',
      phoneNumber: '9988776655',
      unit: 'Plant',
      // HP and RPM omitted
    },
    token
  );
  console.log(`[PASS] Expected 400 rejection received: Status ${badRewindRes.status}, Message: "${badRewindRes.body.message}"`);
  if (badRewindRes.status !== 400) throw new Error('Rewinding ticket should fail when HP/RPM missing');

  // 3. Validate Out Door Ticket requires Mill Name
  console.log('\n--- TEST 3: Validation Check - Out Door Ticket requires Mill Name ---');
  const badOutdoorRes = await request(
    'POST',
    '/api/tickets',
    {
      ticketType: 'Out Door Ticket',
      companyId: company._id.toString(),
      contactPerson: 'Karan',
      phoneNumber: '9988776655',
      unit: 'Plant',
      // Mill Name omitted
    },
    token
  );
  console.log(`[PASS] Expected 400 rejection received: Status ${badOutdoorRes.status}, Message: "${badOutdoorRes.body.message}"`);
  if (badOutdoorRes.status !== 400) throw new Error('Out Door ticket should fail when Mill Name missing');

  // 4. Create Normal Ticket via API
  console.log('\n--- TEST 4: POST /api/tickets - Create Normal Ticket ---');
  const createNormalRes = await request(
    'POST',
    '/api/tickets',
    {
      ticketType: 'Normal Ticket',
      companyId: company._id.toString(),
      contactPerson: 'Ravi Teja',
      phoneNumber: '9988771122',
      unit: 'Plant',
      subject: 'Hydraulic Cylinder Leak Test',
      description: 'Minor hydraulic pressure drop observed during shift 1',
    },
    token
  );
  console.log('Create normal response:', JSON.stringify(createNormalRes, null, 2));
  if (!createNormalRes.body || !createNormalRes.body.data) {
    throw new Error('Create normal response missing body.data: ' + JSON.stringify(createNormalRes));
  }
  console.log(`[PASS] Status: ${createNormalRes.status}, Created ticket: ${createNormalRes.body.data.ticketNo}`);
  const createdTicketId = createNormalRes.body.data._id;

  // 5. Start Ticket requires valid GPS
  console.log('\n--- TEST 5: Validation Check - Start Ticket requires GPS ---');
  const badStartRes = await request('POST', `/api/tickets/${createdTicketId}/start`, {}, token);
  console.log(`[PASS] Expected 400 rejection received: Status ${badStartRes.status}, Message: "${badStartRes.body.message}"`);
  if (badStartRes.status !== 400) throw new Error('Start should require GPS location');

  // 6. Start Ticket with valid GPS
  console.log('\n--- TEST 6: POST /api/tickets/:id/start - Valid GPS Start ---');
  const goodStartRes = await request(
    'POST',
    `/api/tickets/${createdTicketId}/start`,
    {
      location: {
        lat: 17.4401,
        lng: 78.3489,
        address: 'HITEC City Phase 2, Hyderabad',
        accuracy: 8,
      },
    },
    token
  );
  console.log(`[PASS] Status: ${goodStartRes.status}, Ticket status: ${goodStartRes.body.data.status}`);
  console.log(`[PASS] Start Location: ${goodStartRes.body.data.startLocation.address}`);
  if (goodStartRes.status !== 200 || goodStartRes.body.data.status !== 'In Progress') {
    throw new Error('Start ticket failed');
  }

  // 7. Cannot start already started ticket
  console.log('\n--- TEST 7: Validation Check - Cannot restart In Progress ticket ---');
  const doubleStartRes = await request(
    'POST',
    `/api/tickets/${createdTicketId}/start`,
    {
      location: { lat: 17.4401, lng: 78.3489 },
    },
    token
  );
  console.log(`[PASS] Expected 400 rejection received: Status ${doubleStartRes.status}, Message: "${doubleStartRes.body.message}"`);
  if (doubleStartRes.status !== 400) throw new Error('Double start should be rejected');

  // 8. Stop Ticket with ending GPS, remarks and after images
  console.log('\n--- TEST 8: POST /api/tickets/:id/stop - Complete Ticket ---');
  const stopRes = await request(
    'POST',
    `/api/tickets/${createdTicketId}/stop`,
    {
      location: {
        lat: 17.4410,
        lng: 78.3495,
        address: 'Substation Gate, HITEC City',
        accuracy: 10,
      },
      serviceCompletionRemarks: 'Replaced hydraulic high-pressure seals, bled air from line, pressure verified at 120 bar.',
      afterServiceImages: ['https://res.cloudinary.com/demo/image/upload/sample_repaired.jpg'],
    },
    token
  );
  console.log(`[PASS] Status: ${stopRes.status}, Ticket status: ${stopRes.body.data.status}`);
  console.log(`[PASS] Recorded Working Duration: ${stopRes.body.data.workingDuration.formatted}`);
  console.log(`[PASS] Total Minutes: ${stopRes.body.data.workingDuration.totalMinutes}`);
  if (stopRes.status !== 200 || stopRes.body.data.status !== 'Completed') {
    throw new Error('Stop ticket failed');
  }

  // 9. Cannot stop already completed ticket
  console.log('\n--- TEST 9: Validation Check - Cannot re-stop Completed ticket ---');
  const doubleStopRes = await request(
    'POST',
    `/api/tickets/${createdTicketId}/stop`,
    {
      location: { lat: 17.4410, lng: 78.3495 },
    },
    token
  );
  console.log(`[PASS] Expected 400 rejection received: Status ${doubleStopRes.status}, Message: "${doubleStopRes.body.message}"`);
  if (doubleStopRes.status !== 400) throw new Error('Double stop should be rejected');

  // 10. Fetch Single Ticket Details by ID
  console.log('\n--- TEST 10: GET /api/tickets/:id - Fetch Ticket Details ---');
  const detailRes = await request('GET', `/api/tickets/${createdTicketId}`, null, token);
  console.log(`[PASS] Status: ${detailRes.status}, Retrieved Ticket: ${detailRes.body.data.ticketNo}`);
  console.log(`[PASS] Company populated: ${detailRes.body.data.companyId?.company}`);
  console.log(`[PASS] StartedBy populated: ${detailRes.body.data.startedBy?.name}`);
  console.log(`[PASS] StoppedBy populated: ${detailRes.body.data.stoppedBy?.name}`);
  console.log(`[PASS] Duration: ${detailRes.body.data.workingDuration?.formatted}`);
  if (detailRes.status !== 200 || !detailRes.body.data.companyId) {
    throw new Error('Get ticket by ID failed');
  }

  // 11. Test Creating All 5 Ticket Types independently via API
  console.log('\n--- TEST 11: Create All 5 Ticket Types via POST /api/tickets ---');

  // Type 1: Normal Ticket
  const t1 = await request('POST', '/api/tickets', {
    ticketType: 'Normal Ticket',
    companyId: company._id.toString(),
    contactPerson: 'Anil Rao',
    phoneNumber: '9848011223',
    unit: 'Plant',
    subject: 'Normal Diagnostic Call',
  }, token);
  console.log(`[PASS] 1. Normal Ticket: ${t1.body.data?.ticketNo} (${t1.status})`);
  if (t1.status !== 201) throw new Error('Normal Ticket creation failed');

  // Type 2: Rewinding Ticket
  const t2 = await request('POST', '/api/tickets', {
    ticketType: 'Rewinding Ticket',
    companyId: company._id.toString(),
    contactPerson: 'Sanjay Gupta',
    phoneNumber: '9848022334',
    unit: 'Mill',
    hp: '50',
    rpm: '1440',
    subject: '50 HP Motor Stator Rewinding',
  }, token);
  console.log(`[PASS] 2. Rewinding Ticket: ${t2.body.data?.ticketNo} (HP: ${t2.body.data?.hp}, RPM: ${t2.body.data?.rpm})`);
  if (t2.status !== 201 || t2.body.data?.hp !== '50' || t2.body.data?.rpm !== '1440') {
    throw new Error('Rewinding Ticket creation failed');
  }

  // Type 3: Out Door Ticket
  const t3 = await request('POST', '/api/tickets', {
    ticketType: 'Out Door Ticket',
    companyId: company._id.toString(),
    contactPerson: 'Venu Madhav',
    phoneNumber: '9848033445',
    unit: 'Boiler',
    millName: 'Deccan Agro Mill #3',
    subject: 'Outdoor Steam Line Inspection',
  }, token);
  console.log(`[PASS] 3. Out Door Ticket: ${t3.body.data?.ticketNo} (Mill: ${t3.body.data?.millName})`);
  if (t3.status !== 201 || t3.body.data?.millName !== 'Deccan Agro Mill #3') {
    throw new Error('Out Door Ticket creation failed');
  }

  // Type 4: AMC Ticket
  const t4 = await request('POST', '/api/tickets', {
    ticketType: 'AMC Ticket',
    companyId: company._id.toString(),
    contactPerson: 'Prakash Rao',
    phoneNumber: '9848044556',
    unit: 'Round Silo',
    hp: '100',
    rpm: '2800',
    subject: 'Annual Silo Motor Maintenance',
  }, token);
  console.log(`[PASS] 4. AMC Ticket: ${t4.body.data?.ticketNo} (Unit: ${t4.body.data?.unit}, HP: ${t4.body.data?.hp}, RPM: ${t4.body.data?.rpm})`);
  if (t4.status !== 201 || t4.body.data?.unit !== 'Round Silo' || t4.body.data?.hp !== '100') {
    throw new Error('AMC Ticket creation failed');
  }

  // Type 5: Panel Board Ticket
  const t5 = await request('POST', '/api/tickets', {
    ticketType: 'Panel Board Ticket',
    companyId: company._id.toString(),
    contactPerson: 'Raghu Ram',
    phoneNumber: '9848055667',
    unit: 'Plant',
    millName: 'Vijayawada Central Mill',
    subject: 'Main Relay Calibration',
  }, token);
  console.log(`[PASS] 5. Panel Board Ticket: ${t5.body.data?.ticketNo} (Mill: ${t5.body.data?.millName})`);
  if (t5.status !== 201 || t5.body.data?.millName !== 'Vijayawada Central Mill') {
    throw new Error('Panel Board Ticket creation failed');
  }

  console.log('\n====================================================');
  console.log('ALL API ENDPOINT & VALIDATION TESTS PASSED! (10/10)');
  console.log('====================================================');

  server.close();
  process.exit(0);
}

runApiTests().catch((err) => {
  console.error('[FAIL] API test error:', err);
  if (server) server.close();
  process.exit(1);
});
