const CalendarEvent = require('../models/CalendarEvent');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { logActivity } = require('../services/auditService');
const { getIO } = require('../services/socketService');

// @desc    Create a new calendar event
// @route   POST /api/calendar/events
exports.createEvent = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    startDate,
    endDate,
    eventType,
    isFullDay = true,
    dayCoverage = 'FullDay',
    isPublic = true,
  } = req.body;

  const event = await CalendarEvent.create({
    userId: req.user._id,
    title,
    description,
    startDate,
    endDate,
    eventType,
    isFullDay: Boolean(isFullDay),
    dayCoverage: eventType === 'Holiday' ? dayCoverage : 'FullDay',
    // Holidays are always visible to all users across the company
    isPublic: eventType === 'Holiday' ? true : Boolean(isPublic),
    departmentId: req.user.departmentId || null,
    branchId: req.user.branchId || null,
    teamId: req.user.teamId || null,
  });

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'CALENDAR_EVENT_CREATED',
    module: 'calendar',
    resourceId: event._id.toString(),
    description: `Created ${eventType} (${dayCoverage}): ${title}`,
    req,
  });

  const populatedEvent = await CalendarEvent.findById(event._id)
    .populate('userId', 'name email employeeId');

  try {
    const io = getIO();
    io.emit('calendar_updated', populatedEvent);
  } catch (socketErr) {
    console.warn('Socket emit error:', socketErr.message);
  }

  res.status(201).json(new ApiResponse(201, populatedEvent, 'Calendar event created successfully'));
});

// @desc    Get calendar events (Accessible by both Admin and Employee)
// @route   GET /api/calendar/events
exports.getEvents = asyncHandler(async (req, res) => {
  const { startDate, endDate, year } = req.query;

  const dataScope = req.dataScopeFilter || {};

  // FIX: Employees must see all company holidays and public items
  const queryConditions = [
    {
      $or: [
        { eventType: 'Holiday' },
        { isPublic: true },
        dataScope,
      ],
    },
  ];

  // Date boundary filtering
  if (startDate && endDate) {
    queryConditions.push({
      startDate: { $lte: new Date(endDate) },
      endDate: { $gte: new Date(startDate) },
    });
  } else if (year) {
    const startOfYear = new Date(year, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
    queryConditions.push({
      startDate: { $lte: endOfYear },
      endDate: { $gte: startOfYear },
    });
  }

  const finalFilter = queryConditions.length > 1 ? { $and: queryConditions } : queryConditions[0];

  const events = await CalendarEvent.find(finalFilter)
    .populate('userId', 'name email employeeId')
    .sort({ startDate: 1 });

  res.status(200).json(new ApiResponse(200, events, 'Calendar events retrieved successfully'));
});

// @desc    Delete a calendar event
// @route   DELETE /api/calendar/events/:id
exports.deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Admins can delete any, users can delete only within their allowed scope
  const event = await CalendarEvent.findOne({ _id: id });

  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  await event.deleteOne();

  await logActivity({
    userId: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: 'CALENDAR_EVENT_DELETED',
    module: 'calendar',
    resourceId: id,
    description: `Deleted event: ${event.title}`,
    req,
  });

  try {
    const io = getIO();
    io.emit('calendar_updated', { _id: id, deleted: true });
  } catch (socketErr) {
    console.warn('Socket emit error:', socketErr.message);
  }

  res.status(200).json(new ApiResponse(200, null, 'Calendar event deleted successfully'));
});