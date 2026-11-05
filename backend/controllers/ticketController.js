const Ticket = require('../models/Ticket');
const Company = require('../models/Company');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');
const { uploadFile } = require('../services/cloudinaryService');
const crypto = require('crypto');

/**
 * Safe socket emission helper
 */
const safeEmit = (event, data) => {
  try {
    const io = getIO();
    if (io) io.emit(event, data);
  } catch {
    // Socket.io not initialized in unit tests or CLI context
  }
};

/**
 * Format duration helper
 */
const formatWorkingDuration = (startTime, stopTime) => {
  if (!startTime || !stopTime) {
    return {
      totalHours: 0,
      totalMinutes: 0,
      totalSeconds: 0,
      durationMs: 0,
      totalWorkingSeconds: 0,
      formatted: '0 Hours 0 Minutes',
    };
  }
  const start = new Date(startTime).getTime();
  const end = new Date(stopTime).getTime();
  const durationMs = Math.max(0, end - start);
  const totalWorkingSeconds = Math.floor(durationMs / 1000);
  const totalHours = Math.floor(totalWorkingSeconds / 3600);
  const totalMinutes = Math.floor((totalWorkingSeconds % 3600) / 60);
  const totalSeconds = totalWorkingSeconds % 60;
  
  let formatted = '';
  if (totalHours > 0) {
    formatted = `${totalHours}h ${totalMinutes}m`;
  } else if (totalMinutes > 0) {
    formatted = `${totalMinutes}m`;
  } else {
    formatted = `${totalSeconds}s`;
  }

  return {
    totalHours,
    totalMinutes,
    totalSeconds,
    durationMs,
    totalWorkingSeconds,
    formatted,
  };
};

/**
 * @desc Get all tickets with pagination, search, status filter, and data scope
 * @route GET /api/tickets
 */
const getTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const filter = { ...req.dataScopeFilter };

  // Status Filter
  if (req.query.status && req.query.status !== 'ALL') {
    const s = req.query.status.toUpperCase();
    if (s === 'PENDING' || s === 'OPEN') {
      filter.status = { $in: ['Pending', 'Open'] };
    } else if (s === 'IN_PROGRESS' || s === 'IN PROGRESS') {
      filter.status = 'In Progress';
    } else if (s === 'COMPLETED' || s === 'RESOLVED') {
      filter.status = { $in: ['Completed', 'Resolved'] };
    } else {
      filter.status = req.query.status;
    }
  }

  // Ticket Type Filter
  if (req.query.ticketType && req.query.ticketType !== 'ALL') {
    filter.ticketType = req.query.ticketType;
  }

  // Search Filter
  if (req.query.search) {
    const searchRegex = { $regex: req.query.search, $options: 'i' };
    
    // Find matching company IDs first for populated search
    const matchingCompanies = await Company.find({
      company: searchRegex,
    }).select('_id');
    const matchingCompanyIds = matchingCompanies.map((c) => c._id);

    // Find matching user IDs for creator or technician search
    const matchingUsers = await User.find({
      $or: [{ name: searchRegex }, { employeeId: searchRegex }],
    }).select('_id');
    const matchingUserIds = matchingUsers.map((u) => u._id);

    filter.$or = [
      { ticketNo: searchRegex },
      { subject: searchRegex },
      { contactPerson: searchRegex },
      { phoneNumber: searchRegex },
      { millName: searchRegex },
      { description: searchRegex },
      { createdByName: searchRegex },
      { createdBy: { $in: matchingUserIds } },
      { assignedTo: { $in: matchingUserIds } },
      { companyId: { $in: matchingCompanyIds } },
    ];
  }

  const total = await Ticket.countDocuments(filter);
  const tickets = await Ticket.find(filter)
    .populate('createdBy', 'name email employeeId avatar')
    .populate('assignedTo', 'name email employeeId avatar')
    .populate('startedBy', 'name email employeeId')
    .populate('stoppedBy', 'name email employeeId')
    .populate('companyId', 'company profileCode contactPerson contactNumber city state area addressLine1')
    .populate('departmentId', 'name code')
    .populate('branchId', 'name code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        tickets,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      'Tickets retrieved successfully'
    )
  );
});

/**
 * @desc Get single ticket details by ID
 * @route GET /api/tickets/:id
 */
const getTicketById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter })
    .populate('createdBy', 'name email employeeId avatar')
    .populate('assignedTo', 'name email employeeId avatar')
    .populate('startedBy', 'name email employeeId')
    .populate('stoppedBy', 'name email employeeId')
    .populate('companyId', 'company profileCode contactPerson contactNumber alternatePhone contactEmail city state area addressLine1 pincode')
    .populate('departmentId', 'name code')
    .populate('branchId', 'name code')
    .populate('teamId', 'name');

  if (!ticket) {
    throw new ApiError(404, 'Ticket not found or access denied');
  }

  res.status(200).json(new ApiResponse(200, ticket, 'Ticket details retrieved successfully'));
});

/**
 * @desc Create new ticket with dynamic fields
 * @route POST /api/tickets
 */
const createTicket = asyncHandler(async (req, res) => {
  const {
    ticketType,
    companyId,
    contactPerson,
    phoneNumber,
    unit,
    subject,
    description,
    hp,
    rpm,
    millName,
    beforeServiceImages,
  } = req.body;

  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, 'Company not found');

  const ticketNo = 'TCK-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  // Generated or custom subject
  const finalSubject = subject && subject.trim()
    ? subject.trim()
    : `${ticketType || 'Service Ticket'} - ${unit || 'Plant'}`;

  const newTicket = await Ticket.create({
    ticketNo,
    ticketType: ticketType || 'Normal Ticket',
    companyId,
    contactPerson: contactPerson || company.contactPerson || '',
    phoneNumber: phoneNumber || company.contactNumber || '',
    unit: unit || 'Plant',
    subject: finalSubject,
    description: description || '',
    hp: hp ? String(hp).trim() : '',
    rpm: rpm ? String(rpm).trim() : '',
    millName: millName ? String(millName).trim() : '',
    assignedTo: req.body.assignedTo || null,
    priority: req.body.priority || 'Medium',
    status: 'Pending',
    beforeServiceImages: Array.isArray(beforeServiceImages) ? beforeServiceImages : [],
    createdBy: req.user._id,
    createdByName: req.user.name || '',
    departmentId: req.user.departmentId,
    branchId: req.user.branchId,
    teamId: req.user.teamId,
  });

  const populatedTicket = await Ticket.findById(newTicket._id)
    .populate('createdBy', 'name email employeeId avatar')
    .populate('assignedTo', 'name email employeeId avatar')
    .populate('companyId', 'company profileCode contactPerson contactNumber city state area');

  safeEmit('ticket_created', populatedTicket);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'TICKET_CREATED',
    module: 'tickets',
    resourceId: newTicket._id.toString(),
    description: `Created ${ticketType} #${ticketNo} for company ${company.company}`,
    req,
  });

  res.status(201).json(new ApiResponse(201, populatedTicket, 'Service ticket created successfully'));
});

/**
 * @desc Start service tracking on a ticket (captures server timestamp & GPS location)
 * @route POST /api/tickets/:id/start
 */
const startTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location } = req.body; // { lat, lng, address, accuracy }

  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter });
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  // Lifecycle check: prevent starting already started or completed tickets
  if (ticket.status === 'In Progress' || ticket.startTime || ticket.startedAt) {
    throw new ApiError(400, 'Ticket has already been started and is currently In Progress');
  }
  if (ticket.status === 'Completed' || ticket.status === 'Resolved' || ticket.status === 'Closed') {
    throw new ApiError(400, 'Ticket is already completed and cannot be restarted');
  }

  // Location validation: genuine coordinates required
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number' || isNaN(location.lat) || isNaN(location.lng)) {
    throw new ApiError(400, 'Valid GPS location (latitude and longitude) is strictly required to start the ticket');
  }

  const now = new Date();
  ticket.status = 'In Progress';
  ticket.startTime = now; // Server-side source of truth
  ticket.startedAt = now;
  ticket.startedBy = req.user._id;
  ticket.startedByName = req.user.name || 'Field Technician';
  ticket.startLocation = {
    lat: location.lat,
    lng: location.lng,
    address: location.address || `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`,
    accuracy: location.accuracy || null,
  };

  await ticket.save();

  const populatedTicket = await Ticket.findById(ticket._id)
    .populate('createdBy', 'name email employeeId avatar')
    .populate('startedBy', 'name email employeeId')
    .populate('companyId', 'company profileCode contactPerson contactNumber');

  safeEmit('ticket_updated', populatedTicket);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'TICKET_STARTED',
    module: 'tickets',
    resourceId: ticket._id.toString(),
    description: `Started service on ticket ${ticket.ticketNo} at ${ticket.startTime.toISOString()}`,
    req,
  });

  res.status(200).json(new ApiResponse(200, populatedTicket, 'Ticket service started successfully'));
});

/**
 * @desc Stop service tracking on a ticket (calculates working hours & captures GPS location)
 * @route POST /api/tickets/:id/stop
 */
const stopTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location, serviceCompletionRemarks, afterServiceImages, resolutionNotes, resolutionImages } = req.body;

  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter });
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  // Lifecycle check: ticket must be in progress
  if (ticket.status !== 'In Progress' || (!ticket.startTime && !ticket.startedAt)) {
    throw new ApiError(400, 'Ticket must be In Progress before it can be stopped');
  }

  // Duplicate stop check
  if (ticket.stopTime || ticket.stoppedAt) {
    throw new ApiError(400, 'Ticket has already been stopped and marked Completed');
  }

  // Location validation: genuine coordinates required
  if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number' || isNaN(location.lat) || isNaN(location.lng)) {
    throw new ApiError(400, 'Valid GPS location (latitude and longitude) is strictly required to stop the ticket');
  }

  const stop = new Date();
  const start = ticket.startTime || ticket.startedAt;
  ticket.stopTime = stop; // Server-side source of truth
  ticket.stoppedAt = stop;
  ticket.stoppedBy = req.user._id;
  ticket.stoppedByName = req.user.name || 'Field Technician';
  ticket.stopLocation = {
    lat: location.lat,
    lng: location.lng,
    address: location.address || `Lat: ${location.lat.toFixed(5)}, Lng: ${location.lng.toFixed(5)}`,
    accuracy: location.accuracy || null,
  };

  // Automatic Working Duration Calculation
  const durationResult = formatWorkingDuration(start, stop);
  ticket.workingDuration = {
    totalHours: durationResult.totalHours,
    totalMinutes: durationResult.totalMinutes,
    totalSeconds: durationResult.totalSeconds,
    durationMs: durationResult.durationMs,
    formatted: durationResult.formatted,
  };
  ticket.totalWorkingSeconds = durationResult.totalWorkingSeconds;

  ticket.status = 'Completed';

  // Completion Remarks & Images
  const remarks = serviceCompletionRemarks !== undefined ? serviceCompletionRemarks : resolutionNotes;
  if (remarks !== undefined) {
    ticket.serviceCompletionRemarks = remarks;
    ticket.resolutionNotes = remarks; // Backward compatibility
  }

  const images = afterServiceImages || resolutionImages;
  if (Array.isArray(images) && images.length > 0) {
    ticket.afterServiceImages = Array.from(new Set([...ticket.afterServiceImages, ...images]));
    ticket.resolutionImages = ticket.afterServiceImages; // Backward compatibility
  }

  await ticket.save();

  const populatedTicket = await Ticket.findById(ticket._id)
    .populate('createdBy', 'name email employeeId avatar')
    .populate('startedBy', 'name email employeeId')
    .populate('stoppedBy', 'name email employeeId')
    .populate('companyId', 'company profileCode contactPerson contactNumber');

  safeEmit('ticket_updated', populatedTicket);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'TICKET_STOPPED',
    module: 'tickets',
    resourceId: ticket._id.toString(),
    description: `Stopped service on ticket ${ticket.ticketNo}. Duration: ${ticket.workingDuration.formatted}`,
    req,
  });

  res.status(200).json(new ApiResponse(200, populatedTicket, 'Ticket service stopped and marked Completed'));
});

/**
 * @desc Upload image for ticket (Before or After Service)
 * @route POST /api/tickets/upload
 */
const uploadTicketImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'No image file provided');
  }

  // Validate MIME type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    throw new ApiError(400, 'Invalid image format. Allowed formats: JPG, JPEG, PNG, WEBP');
  }

  // Max 10MB
  if (req.file.size > 10 * 1024 * 1024) {
    throw new ApiError(400, 'File size exceeds maximum allowable limit of 10MB');
  }

  try {
    const uploaded = await uploadFile(req.file, 'tickets', 'service_photos');
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          url: uploaded.url,
          publicId: uploaded.publicId,
          originalName: uploaded.originalName,
          size: uploaded.size,
        },
        'Image uploaded successfully'
      )
    );
  } catch (cloudErr) {
    console.warn('[Cloudinary Upload Warning]: Falling back to base64 Data URI', cloudErr.message);
    // Safe fallback if Cloudinary credentials or internet connectivity is unavailable in sandbox
    const base64Data = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          url: base64Data,
          publicId: 'local-' + Date.now(),
          originalName: req.file.originalname,
          size: req.file.size,
        },
        'Image stored successfully'
      )
    );
  }
});

/**
 * @desc Update ticket information (remarks, after-service images, etc.)
 * @route PUT /api/tickets/:id
 */
const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter });
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  // Handle updates
  const {
    contactPerson,
    phoneNumber,
    unit,
    subject,
    description,
    hp,
    rpm,
    millName,
    priority,
    assignedTo,
    serviceCompletionRemarks,
    afterServiceImages,
    beforeServiceImages,
  } = req.body;

  if (contactPerson !== undefined) ticket.contactPerson = contactPerson;
  if (phoneNumber !== undefined) ticket.phoneNumber = phoneNumber;
  if (unit !== undefined) ticket.unit = unit;
  if (subject !== undefined) ticket.subject = subject;
  if (description !== undefined) ticket.description = description;
  if (hp !== undefined) ticket.hp = hp;
  if (rpm !== undefined) ticket.rpm = rpm;
  if (millName !== undefined) ticket.millName = millName;
  if (priority !== undefined) ticket.priority = priority;
  if (assignedTo !== undefined) ticket.assignedTo = assignedTo;
  if (serviceCompletionRemarks !== undefined) {
    ticket.serviceCompletionRemarks = serviceCompletionRemarks;
    ticket.resolutionNotes = serviceCompletionRemarks;
  }
  if (afterServiceImages !== undefined && Array.isArray(afterServiceImages)) {
    ticket.afterServiceImages = afterServiceImages;
    ticket.resolutionImages = afterServiceImages;
  }
  if (beforeServiceImages !== undefined && Array.isArray(beforeServiceImages)) {
    ticket.beforeServiceImages = beforeServiceImages;
  }

  await ticket.save();

  const populatedTicket = await Ticket.findById(ticket._id)
    .populate('createdBy', 'name email employeeId avatar')
    .populate('startedBy', 'name email employeeId')
    .populate('stoppedBy', 'name email employeeId')
    .populate('companyId', 'company profileCode contactPerson contactNumber');

  safeEmit('ticket_updated', populatedTicket);

  res.status(200).json(new ApiResponse(200, populatedTicket, 'Ticket updated successfully'));
});

/**
 * @desc Delete ticket
 * @route DELETE /api/tickets/:id
 */
const deleteTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findOneAndDelete({ _id: id, ...req.dataScopeFilter });

  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  safeEmit('ticket_deleted', { _id: id });

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'TICKET_DELETED',
    module: 'tickets',
    resourceId: id,
    description: `Deleted ticket ${ticket.ticketNo}`,
    req,
  });

  res.status(200).json(new ApiResponse(200, null, 'Ticket deleted successfully'));
});

/**
 * @desc Dedicated endpoint: fetch companies for ticket booking
 * @route GET /api/tickets/companies
 */
const getCompaniesForTicket = asyncHandler(async (req, res) => {
  const companies = await Company.find({})
    .select('_id company profileCode contactPerson contactNumber alternatePhone contactEmail city state area addressLine1 pincode')
    .sort({ company: 1 });

  res.status(200).json(new ApiResponse(200, { companies }, 'Companies fetched for ticket booking'));
});

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  startTicket,
  stopTicket,
  uploadTicketImage,
  deleteTicket,
  getCompaniesForTicket,
};
