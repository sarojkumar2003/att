const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: false, index: true },
  workerName: { type: String }, // Permanently saves the name in case the Employee profile is deleted
  timestamp: { type: Date, default: Date.now, index: true },
  locationIn: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String }
  },
  locationOut: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  photo: { type: String, required: true },
  clockOutTime: { type: Date },
  status: { type: String, enum: ['Present', 'Absent', 'Leave', 'Regularized', 'Pending', 'Approved', 'Rejected'], default: 'Present' },
  adminNote: { type: String },
  dihadi: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: '90d' } // Automatically delete after 90 days
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
