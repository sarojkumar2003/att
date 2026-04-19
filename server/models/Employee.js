const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  fathersName: { type: String },
  aadhaarNumber: { type: String },
  phone: { type: String },
  role: { type: String, default: 'Worker' },
  profilePhoto: { type: String }, // Optional Base64
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Employee', EmployeeSchema);
