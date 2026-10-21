const mongoose = require('mongoose');

const actionPermissionSchema = new mongoose.Schema(
  {
    allowed: { type: Boolean, default: false },
    scope: {
      type: String,
      enum: ['OWN', 'TEAM', 'DEPARTMENT', 'BRANCH', 'ALL'],
      default: 'OWN',
    },
  },
  { _id: false }
);

const modulePermissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    actions: {
      type: Map,
      of: actionPermissionSchema,
      default: {},
    },
  },
  { _id: false }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
    },
    key: {
      type: String,
      required: [true, 'Role key is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    permissions: [modulePermissionSchema],
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.index({ key: 1, isActive: 1 });

module.exports = mongoose.model('Role', roleSchema);
