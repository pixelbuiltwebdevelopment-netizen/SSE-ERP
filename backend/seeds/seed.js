require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Role = require('../models/Role');
const Module = require('../models/Module');
const Department = require('../models/Department');
const Branch = require('../models/Branch');
const Team = require('../models/Team');
const Ticket = require('../models/Ticket');
const Company = require('../models/Company');
const Shift = require('../models/Shift');
const AttendancePolicy = require('../models/AttendancePolicy');
const Attendance = require('../models/Attendance');
const { hashPassword } = require('../utils/security');
const { DEFAULT_MODULES } = require('../constants/modules');
const { ALL_ACTIONS } = require('../constants/actions');

const seedData = async () => {
  try {
    await connectDB();
    console.log('[Seed]: Starting idempotent database seeding...');

    // 1. Seed Modules
    const moduleMap = {};
    for (const mod of DEFAULT_MODULES) {
      const dbMod = await Module.findOneAndUpdate(
        { key: mod.key },
        { name: mod.name, key: mod.key, description: mod.description, availableActions: mod.availableActions, isActive: true },
        { upsert: true, new: true }
      );
      moduleMap[mod.key] = dbMod;
    }
    console.log(`[Seed]: Seeded ${Object.keys(moduleMap).length} modules.`);

    // 2. Seed Departments
    const salesDept = await Department.findOneAndUpdate(
      { code: 'SALES' },
      { name: 'Sales Department', code: 'SALES', isActive: true },
      { upsert: true, new: true }
    );
    const supportDept = await Department.findOneAndUpdate(
      { code: 'SUPPORT' },
      { name: 'Support Department', code: 'SUPPORT', isActive: true },
      { upsert: true, new: true }
    );
    console.log('[Seed]: Seeded Departments.');

    // 3. Seed Branches
    const hydBranch = await Branch.findOneAndUpdate(
      { code: 'HYD' },
      { name: 'Hyderabad HQ', code: 'HYD', location: 'Hyderabad', isActive: true },
      { upsert: true, new: true }
    );
    const blrBranch = await Branch.findOneAndUpdate(
      { code: 'BLR' },
      { name: 'Bangalore Branch', code: 'BLR', location: 'Bangalore', isActive: true },
      { upsert: true, new: true }
    );
    console.log('[Seed]: Seeded Branches.');

    // 4. Seed Teams
    const insideSalesTeam = await Team.findOneAndUpdate(
      { name: 'Inside Sales' },
      { name: 'Inside Sales', departmentId: salesDept._id, isActive: true },
      { upsert: true, new: true }
    );
    const fieldSalesTeam = await Team.findOneAndUpdate(
      { name: 'Field Sales' },
      { name: 'Field Sales', departmentId: salesDept._id, isActive: true },
      { upsert: true, new: true }
    );
    console.log('[Seed]: Seeded Teams.');

    // 5. Build Super Admin Permissions (ALL actions allowed with ALL scope)
    const superAdminPermissions = DEFAULT_MODULES.map((mod) => {
      const actionsObj = {};
      ALL_ACTIONS.forEach((act) => {
        actionsObj[act] = { allowed: true, scope: 'ALL' };
      });
      return {
        module: mod.key,
        actions: actionsObj,
      };
    });

    // 6. Seed Super Admin Role
    const superAdminRole = await Role.findOneAndUpdate(
      { key: 'super_admin' },
      {
        name: 'Super Admin',
        key: 'super_admin',
        description: 'Unrestricted full system administrator',
        permissions: superAdminPermissions,
        isSystemRole: true,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // 7. Seed Sales Manager Role
    const salesManagerPermissions = DEFAULT_MODULES.map((mod) => {
      if (mod.key === 'companies') {
        return {
          module: 'companies',
          actions: {
            view: { allowed: true, scope: 'ALL' },
            create: { allowed: true, scope: 'ALL' },
            edit: { allowed: true, scope: 'DEPARTMENT' },
            delete: { allowed: true, scope: 'DEPARTMENT' },
            export: { allowed: true, scope: 'DEPARTMENT' },
            import: { allowed: true, scope: 'DEPARTMENT' },
            activate: { allowed: true, scope: 'DEPARTMENT' },
            deactivate: { allowed: true, scope: 'DEPARTMENT' },
          },
        };
      }
      if (mod.key === 'tickets') {
        return {
          module: 'tickets',
          actions: {
            view: { allowed: true, scope: 'ALL' },
            create: { allowed: false, scope: 'OWN' },
            edit: { allowed: true, scope: 'DEPARTMENT' },
            delete: { allowed: false, scope: 'OWN' },
            export: { allowed: false, scope: 'OWN' },
            assign: { allowed: true, scope: 'DEPARTMENT' },
          },
        };
      }
      if (mod.key === 'leaves') {
        return {
          module: 'leaves',
          actions: {
            view: { allowed: true, scope: 'OWN' },
            create: { allowed: true, scope: 'OWN' },
          },
        };
      }
      // Salary: Managers can view their own + view all in department, issue advances, generate salary
      if (mod.key === 'salary') {
        return {
          module: 'salary',
          actions: {
            view: { allowed: true, scope: 'OWN' },
            view_all: { allowed: true, scope: 'DEPARTMENT' },
            issue_advance: { allowed: true, scope: 'DEPARTMENT' },
            generate_salary: { allowed: true, scope: 'DEPARTMENT' },
          },
        };
      }
      return {
        module: mod.key,
        actions: {
          view: { allowed: true, scope: 'OWN' },
        },
      };
    });

    const salesManagerRole = await Role.findOneAndUpdate(
      { key: 'sales_manager' },
      {
        name: 'Sales Manager',
        key: 'sales_manager',
        description: 'Sales Department Manager with department scope',
        permissions: salesManagerPermissions,
        isSystemRole: false,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    // 8. Seed Sales Executive Role
    const salesExecPermissions = DEFAULT_MODULES.map((mod) => {
      if (mod.key === 'companies') {
        return {
          module: 'companies',
          actions: {
            view: { allowed: true, scope: 'OWN' },
            create: { allowed: true, scope: 'OWN' },
            edit: { allowed: true, scope: 'OWN' },
            delete: { allowed: false, scope: 'OWN' },
            export: { allowed: false, scope: 'OWN' },
            activate: { allowed: false, scope: 'OWN' },
            deactivate: { allowed: false, scope: 'OWN' },
          },
        };
      }
      if (mod.key === 'tickets') {
        return {
          module: 'tickets',
          actions: {
            view: { allowed: true, scope: 'OWN' },
            create: { allowed: true, scope: 'OWN' },
            edit: { allowed: true, scope: 'OWN' },
            delete: { allowed: false, scope: 'OWN' },
          },
        };
      }
      if (mod.key === 'leaves') {
        return {
          module: 'leaves',
          actions: {
            view: { allowed: false, scope: 'OWN' },
            create: { allowed: true, scope: 'OWN' },
          },
        };
      }
      // Salary: Employees can only view their own salary + advances
      if (mod.key === 'salary') {
        return {
          module: 'salary',
          actions: {
            view: { allowed: true, scope: 'OWN' },
          },
        };
      }
      return {
        module: mod.key,
        actions: {
          view: { allowed: false, scope: 'OWN' },
        },
      };
    });

    const salesExecRole = await Role.findOneAndUpdate(
      { key: 'sales_executive' },
      {
        name: 'Sales Executive',
        key: 'sales_executive',
        description: 'Sales representative with OWN scope',
        permissions: salesExecPermissions,
        isSystemRole: false,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('[Seed]: Seeded Roles (Super Admin, Sales Manager, Sales Executive).');

    // 8.5 Seed Shifts & Attendance Policy
    const generalShift = await Shift.findOneAndUpdate(
      { code: 'GEN' },
      {
        name: 'General Day Shift',
        code: 'GEN',
        startTime: '09:00',
        endTime: '18:00',
        requiredHours: 8.0,
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.0,
        fullDayThresholdHours: 8.0,
        breakMinutes: 60,
        unpaidBreakMinutes: 60,
        isNightShift: false,
        isDefault: true,
        isActive: true,
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        departmentIds: [salesDept._id, supportDept._id],
        description: 'Standard 9:00 AM - 6:00 PM corporate day shift with 15m grace period',
      },
      { upsert: true, new: true }
    );

    const morningShift = await Shift.findOneAndUpdate(
      { code: 'MORN' },
      {
        name: 'Early Morning Shift',
        code: 'MORN',
        startTime: '07:00',
        endTime: '16:00',
        requiredHours: 8.0,
        gracePeriodMinutes: 10,
        halfDayThresholdHours: 4.0,
        fullDayThresholdHours: 8.0,
        breakMinutes: 60,
        unpaidBreakMinutes: 60,
        isNightShift: false,
        isDefault: false,
        isActive: true,
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        description: 'Early morning shift 7:00 AM - 4:00 PM',
      },
      { upsert: true, new: true }
    );

    const nightShift = await Shift.findOneAndUpdate(
      { code: 'NIGHT' },
      {
        name: 'Night Operations Shift',
        code: 'NIGHT',
        startTime: '21:00',
        endTime: '06:00',
        requiredHours: 8.0,
        gracePeriodMinutes: 15,
        halfDayThresholdHours: 4.0,
        fullDayThresholdHours: 8.0,
        breakMinutes: 60,
        unpaidBreakMinutes: 60,
        isNightShift: true,
        isDefault: false,
        isActive: true,
        workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        description: 'Night shift 9:00 PM - 6:00 AM',
      },
      { upsert: true, new: true }
    );

    await AttendancePolicy.findOneAndUpdate(
      { name: 'Standard Company Attendance Policy' },
      {
        name: 'Standard Company Attendance Policy',
        timezone: 'Asia/Kolkata',
        defaultShiftId: generalShift._id,
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
        autoPunchOutNotifyEmployee: true,
        autoPunchOutRequireReview: true,
        weeklyHolidays: ['Sunday'],
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('[Seed]: Seeded Shifts (GEN, MORN, NIGHT) and AttendancePolicy.');

    // 9. Seed Users
    const adminPassword = await hashPassword('Admin@123');
    const managerPassword = await hashPassword('Manager@123');
    const execPassword = await hashPassword('Exec@123');

    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@erp.com' },
      {
        name: 'System Super Admin',
        email: 'admin@erp.com',
        employeeId: 'EMP-001',
        shiftId: generalShift._id,
        password: adminPassword,
        roleId: superAdminRole._id,
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const managerUser = await User.findOneAndUpdate(
      { email: 'manager@erp.com' },
      {
        name: 'Rahul Sales Manager',
        email: 'manager@erp.com',
        employeeId: 'EMP-002',
        shiftId: generalShift._id,
        password: managerPassword,
        roleId: salesManagerRole._id,
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
        createdBy: adminUser._id,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const execUser1 = await User.findOneAndUpdate(
      { email: 'executive1@erp.com' },
      {
        name: 'Priya Executive (Inside Sales HYD)',
        email: 'executive1@erp.com',
        employeeId: 'EMP-003',
        shiftId: generalShift._id,
        password: execPassword,
        roleId: salesExecRole._id,
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
        createdBy: adminUser._id,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    const execUser2 = await User.findOneAndUpdate(
      { email: 'executive2@erp.com' },
      {
        name: 'Kiran Executive (Field Sales BLR)',
        email: 'executive2@erp.com',
        employeeId: 'EMP-004',
        shiftId: generalShift._id,
        password: execPassword,
        roleId: salesExecRole._id,
        departmentId: salesDept._id,
        branchId: blrBranch._id,
        teamId: fieldSalesTeam._id,
        createdBy: adminUser._id,
        isActive: true,
      },
      { upsert: true, new: true }
    );

    console.log('[Seed]: Seeded Users (admin@erp.com, manager@erp.com, executive1@erp.com, executive2@erp.com).');

    // 10. Seed Demo Business Records for Scope Testing
    await Company.deleteMany({});
    const companies = await Company.create([
      {
        company: 'Sri Lakshmi Rice Mills',
        profileCode: 'COMP-1001',
        contactPerson: 'Venkateswara Rao',
        contactNumber: '9848012345',
        contactEmail: 'lakshmi.mills@gmail.com',
        businessType: 'Rice Mill',
        country: 'India',
        state: 'Telangana',
        area: 'Hyderabad',
        city: 'Hyderabad',
        pincode: '500001',
        status: 'Active',
        createdBy: execUser1._id,
        assignedTo: execUser1._id,
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
        machines: [
          {
            id: 'm_101',
            machineType: 'Color Sorter',
            model: 'FCS 7000',
            version: 'v3.5',
            numberOfChutes: '7',
            serialNumber: 'CS-2026-HYD-01',
            stdOrExp: 'Std',
            manufactureDate: '2025-05-10',
            installationDate: '2025-06-01',
            contract: {
              type: 'Warranty',
              startDate: '2025-06-01',
              endDate: '2026-06-01',
            },
          },
        ],
      },
      {
        company: 'Bangalore Agro Flour Mills',
        profileCode: 'COMP-1002',
        contactPerson: 'Anand Kumar',
        contactNumber: '9900112233',
        contactEmail: 'anand@blr-agro.com',
        businessType: 'Flour Mill',
        country: 'India',
        state: 'Karnataka',
        area: 'Bengaluru Urban',
        city: 'Bangalore',
        pincode: '560001',
        status: 'Active',
        createdBy: execUser2._id,
        assignedTo: execUser2._id,
        departmentId: salesDept._id,
        branchId: blrBranch._id,
        teamId: fieldSalesTeam._id,
      },
    ]);

    await Ticket.deleteMany({});
    await Ticket.create([
      {
        ticketNo: 'TCK-1001',
        ticketType: 'Normal Ticket',
        companyId: companies[0]._id,
        subject: 'SSO Authentication Gateway Error',
        priority: 'High',
        status: 'In Progress',
        createdBy: execUser1._id,
        assignedTo: execUser1._id,
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
      },
      {
        ticketNo: 'TCK-1002',
        ticketType: 'AMC',
        companyId: companies[1]._id,
        subject: 'Billing Invoice Export Discrepancy',
        priority: 'Medium',
        status: 'Open',
        createdBy: execUser2._id,
        assignedTo: execUser2._id,
        departmentId: salesDept._id,
        branchId: blrBranch._id,
        teamId: fieldSalesTeam._id,
      },
    ]);

    // 11. Seed Demo Attendance Records
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    await Attendance.deleteMany({});
    await Attendance.create([
      {
        userId: adminUser._id,
        date: today,
        shiftId: generalShift._id,
        scheduledStartAt: new Date(`${today}T09:00:00.000Z`),
        scheduledEndAt: new Date(`${today}T18:00:00.000Z`),
        punchIn: {
          time: new Date(`${today}T08:55:00.000Z`),
          status: 'On-Time',
        },
        punchOut: {
          time: new Date(`${today}T18:15:00.000Z`),
          method: 'Manual',
        },
        workingHours: 8.3,
        effectiveWorkedMinutes: 498,
        actualWorkedMinutes: 560,
        unpaidBreakMinutes: 60,
        lateMinutes: 0,
        overtimeMinutes: 18,
        status: 'Present',
        flags: ['Present', 'Full-Day'],
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
      },
      {
        userId: managerUser._id,
        date: today,
        shiftId: generalShift._id,
        scheduledStartAt: new Date(`${today}T09:00:00.000Z`),
        scheduledEndAt: new Date(`${today}T18:00:00.000Z`),
        punchIn: {
          time: new Date(`${today}T09:25:00.000Z`),
          status: 'Late',
        },
        workingHours: 0,
        lateMinutes: 25,
        status: 'Present',
        flags: ['Present', 'Late'],
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
      },
      {
        userId: execUser1._id,
        date: yesterday,
        shiftId: generalShift._id,
        scheduledStartAt: new Date(`${yesterday}T09:00:00.000Z`),
        scheduledEndAt: new Date(`${yesterday}T18:00:00.000Z`),
        punchIn: {
          time: new Date(`${yesterday}T09:05:00.000Z`),
          status: 'On-Time',
        },
        punchOut: {
          time: new Date(`${yesterday}T18:00:00.000Z`),
          method: 'Auto-ShiftEnd',
          isAutoPunched: true,
        },
        workingHours: 8.0,
        effectiveWorkedMinutes: 480,
        isAutoPunchOut: true,
        autoPunchOutReason: 'Auto punched out at shift end due to missing punch-out.',
        needsReview: true,
        reviewStatus: 'Pending-Review',
        status: 'Present',
        flags: ['Present', 'Auto-Punched', 'Missing-Punch-Out'],
        departmentId: salesDept._id,
        branchId: hydBranch._id,
        teamId: insideSalesTeam._id,
      },
    ]);

    console.log('[Seed]: Seeded sample Tickets, Companies, and Attendance Records.');
    console.log('[Seed]: Seeding finished successfully!');

    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`);
    process.exit(1);
  }
};

seedData();
