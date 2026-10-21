// models/Company.js
const mongoose = require('mongoose');

const FileMetadataSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String },
    size: { type: Number },
    resourceType: { type: String, default: 'image' },
  },
  { _id: true, timestamps: true }
);

const MachineFeedbackSchema = new mongoose.Schema(
  {
    rating: { type: Number, min: 1, max: 5, default: 5 },
    condition: { type: String, enum: ['Excellent', 'Good', 'Requires Service', 'Critical'], default: 'Good' },
    remarks: { type: String, default: '' },
    operatorFeedback: { type: String, default: '' },
    lastServiceDate: { type: String, default: '' },
  },
  { _id: false }
);

const MachineSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    machineType: { type: String, required: true, default: 'Color Sorter' },
    model: { type: String, default: '' },
    serialNumber: { type: String, default: '' },
    contractType: { type: String, default: 'Warranty' },
    feedback: { type: MachineFeedbackSchema, default: () => ({}) },
    visitImages: [FileMetadataSchema],
  },
  { _id: true }
);

const CompanySchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    profileCode: {
      type: String,
      unique: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'Contact person is required'],
      trim: true,
    },
    contactNumber: {
      type: String,
      required: [true, 'Contact number is required'],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      trim: true,
      lowercase: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    area: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    addressLine1: {
      type: String,
      default: '',
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Disabled', 'Customer'],
      default: 'Active',
    },
    siteVisitImages: [FileMetadataSchema],
    machines: [MachineSchema],

    // CRITICAL: Required for populate('assignedTo') and data scoping
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
  },
  { timestamps: true }
);

CompanySchema.pre('save', async function (next) {
  if (!this.profileCode) {
    const count = await mongoose.model('Company').countDocuments();
    this.profileCode = `COMP-${(count + 1001).toString().padStart(4, '0')}`;
  }
  if (!this.assignedTo) {
    this.assignedTo = this.createdBy;
  }
  next();
});

module.exports = mongoose.model('Company', CompanySchema);