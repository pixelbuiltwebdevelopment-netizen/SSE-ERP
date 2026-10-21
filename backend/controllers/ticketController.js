const Ticket = require('../models/Ticket');
const Company = require('../models/Company');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');
const crypto = require('crypto');

const getTickets = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const filter = { ...req.dataScopeFilter };
  if (req.query.search) {
    filter.$or = [
      { ticketNo: { $regex: req.query.search, $options: 'i' } },
      { subject: { $regex: req.query.search, $options: 'i' } },
    ];
  }

  const total = await Ticket.countDocuments(filter);
  const tickets = await Ticket.find(filter)
    .populate('createdBy', 'name email')
    .populate('companyId', 'company contactPerson contactNumber')
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

const createTicket = asyncHandler(async (req, res) => {
  const { subject, ticketType, companyId } = req.body;

  const company = await Company.findById(companyId);
  if (!company) throw new ApiError(404, 'Company not found');

  const ticketNo = 'TCK-' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const newTicket = await Ticket.create({
    ticketNo,
    subject,
    ticketType: ticketType || 'Normal Ticket',
    companyId,
    createdBy: req.user._id,
    departmentId: req.user.departmentId,
    branchId: req.user.branchId,
    teamId: req.user.teamId,
  });

  const populatedTicket = await Ticket.findById(newTicket._id)
    .populate('createdBy', 'name')
    .populate('companyId', 'company');

  const io = getIO();
  io.emit('ticket_created', populatedTicket);

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'TICKET_CREATED',
    module: 'tickets',
    resourceId: newTicket._id.toString(),
    description: `Created service ticket ${ticketNo} for company ${company.company}`,
    req,
  });

  res.status(201).json(new ApiResponse(201, populatedTicket, 'Service ticket created successfully'));
});

const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter });
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  Object.assign(ticket, req.body);
  await ticket.save();

  const populatedTicket = await Ticket.findById(ticket._id)
    .populate('createdBy', 'name')
    .populate('companyId', 'company');

  const io = getIO();
  io.emit('ticket_updated', populatedTicket);

  res.status(200).json(new ApiResponse(200, populatedTicket, 'Ticket updated successfully'));
});

const startTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location } = req.body; // { lat, lng, address }
  
  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter });
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  ticket.status = 'In Progress';
  ticket.startTime = new Date();
  if (location) ticket.startLocation = location;
  await ticket.save();

  const io = getIO();
  io.emit('ticket_updated', ticket);

  res.status(200).json(new ApiResponse(200, ticket, 'Ticket started successfully'));
});

const stopTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { location, status, resolutionNotes, resolutionImages } = req.body;
  
  const ticket = await Ticket.findOne({ _id: id, ...req.dataScopeFilter });
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  ticket.status = status || 'Resolved';
  ticket.stopTime = new Date();
  if (location) ticket.stopLocation = location;
  if (resolutionNotes !== undefined) ticket.resolutionNotes = resolutionNotes;
  if (resolutionImages && Array.isArray(resolutionImages)) ticket.resolutionImages = resolutionImages;
  await ticket.save();

  const io = getIO();
  io.emit('ticket_updated', ticket);

  res.status(200).json(new ApiResponse(200, ticket, 'Ticket stopped/resolved successfully'));
});

const deleteTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await Ticket.findOneAndDelete({ _id: id, ...req.dataScopeFilter });
  
  if (!ticket) throw new ApiError(404, 'Ticket not found or access denied');

  const io = getIO();
  io.emit('ticket_deleted', { _id: id });

  res.status(200).json(new ApiResponse(200, null, 'Ticket deleted successfully'));
});

// Dedicated endpoint: fetch companies for ticket booking
// Authorized by 'tickets' module (fetch_companies action), NOT by 'companies' module
const getCompaniesForTicket = asyncHandler(async (req, res) => {
  const companies = await Company.find({})
    .select('_id company contactPerson contactNumber')
    .sort({ company: 1 });

  res.status(200).json(new ApiResponse(200, { companies }, 'Companies fetched for ticket booking'));
});

module.exports = {
  getTickets,
  createTicket,
  updateTicket,
  startTicket,
  stopTicket,
  deleteTicket,
  getCompaniesForTicket,
};
