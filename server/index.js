const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Employee = require('./models/Employee');
const Attendance = require('./models/Attendance');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 0. Admin Auth
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
    res.json({ token: 'simple-thakadar-token', success: true });
  } else {
    res.status(401).json({ message: 'Invalid credentials', success: false });
  }
});

// Database Connection with improved diagnostics
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.log('❌ MongoDB Connection Error');
    if (err.message.includes('bad auth')) {
      console.log('👉 TIP: Authentication failed. Please check your DB Password in Atlas.');
    } else if (err.message.includes('ERR_NETWORK') || err.message.includes('timeout')) {
      console.log('👉 TIP: Connection timed out. Make sure you have whitelisted 0.0.0.0/0 in Atlas Network Access.');
    }
    console.error(err.message);
  }
};

connectDB();

// --- API Endpoints ---

// 1. Employee Management
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/employees', async (req, res) => {
  const { name, phone, role, profilePhoto, fathersName, aadhaarNumber } = req.body;
  try {
    const employee = new Employee({ name, phone, role, profilePhoto, fathersName, aadhaarNumber });
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/employees/:id', async (req, res) => {
  const { name, phone, role, profilePhoto, fathersName, aadhaarNumber } = req.body;
  try {
    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      { name, phone, role, profilePhoto, fathersName, aadhaarNumber },
      { new: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Employee.findByIdAndDelete(id);
    // Also delete their attendance history if needed? Usually safe to keep or delete.
    // For now, just delete the employee.
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Attendance Management
app.post('/api/attendance', async (req, res) => {
  const { employeeId, location, photo, status, timestamp, type } = req.body;
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // Capture the worker's name permanently in case their profile gets deleted later
    const emp = await Employee.findById(employeeId);
    const workerName = emp ? emp.name : 'Unknown Worker';

    if (status === 'Regularized') {
      // Force Regularized items to 'Pending' for Admin approval with a system note
      const attendance = new Attendance({
        employeeId, 
        workerName,
        locationIn: location, 
        photo, 
        status: 'Pending', 
        adminNote: 'Manual Regularization Request',
        timestamp: timestamp || Date.now()
      });
      await attendance.save();
      return res.status(201).json(attendance);
    }

    if (type === 'clockOut') {
      // Support Night Shifts crossing midnight (search open shifts within the last 24h)
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await Attendance.findOne({
        employeeId,
        clockOutTime: { $exists: false },
        timestamp: { $gte: twentyFourHoursAgo }
      }).sort({ timestamp: -1 });

      if (existing) {
        existing.clockOutTime = new Date();
        existing.locationOut = location; // Capture the location at clock out
        
        // --- AUTO-DIHADI ENGINE ---
        const inHour = new Date(existing.timestamp).getHours();
        const outHour = new Date(existing.clockOutTime).getHours();
        let calculatedDihadi = 0;

        // 1. Day Shift (In: 10am-12pm -> Out: 5pm-6pm)
        if (inHour >= 10 && inHour <= 12 && outHour >= 17 && outHour <= 18) {
           calculatedDihadi = 1;
        } 
        // 2. Night Shifts (In: 6pm-10pm)
        else if (inHour >= 18 && inHour <= 22) {
           if (outHour === 1 || outHour === 2) {
              calculatedDihadi = 1; // Out around 1am
           } else if (outHour >= 3 && outHour <= 5) {
              calculatedDihadi = 2; // Out around 4am
           }
        }
        
        // 3. Fallback (If manual variations occur based purely on total hours)
        if (calculatedDihadi === 0) {
           const hoursWorked = (existing.clockOutTime.getTime() - new Date(existing.timestamp).getTime()) / (1000 * 60 * 60);
           if (hoursWorked >= 9) calculatedDihadi = 1.5;
           else if (hoursWorked >= 5) calculatedDihadi = 1;
           else if (hoursWorked >= 3) calculatedDihadi = 0.5;
        }

        existing.dihadi = calculatedDihadi;
        // --------------------------

        await existing.save();
        return res.status(200).json(existing);
      } else {
        return res.status(400).json({ message: "No active clock-in found within the last 24 hours." });
      }
    } else {
      // Normal Clock In or Manual Entry from worker (default to Pending for approval)
      const finalStatus = (status === 'Present') ? 'Pending' : (status || 'Pending');
      
      const attendance = new Attendance({
        employeeId,
        workerName,
        locationIn: location,
        photo,
        status: finalStatus,
        timestamp: timestamp || Date.now()
      });
      await attendance.save();
      return res.status(201).json(attendance);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/attendance/approve/:id', async (req, res) => {
  try {
    const { status, adminNote, dihadi } = req.body;
    const updateData = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    if (dihadi !== undefined) updateData.dihadi = Number(dihadi) || 0;

    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!record) return res.status(404).json({ message: "Not found" });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/today', async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  try {
    const attendance = await Attendance.find({
      timestamp: { $gte: start, $lte: end }
    }).populate('employeeId');
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/history', async (req, res) => {
  try {
    const records = await Attendance.find()
      .populate('employeeId')
      .sort({ timestamp: -1 })
      .limit(500);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/attendance/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const records = await Attendance.find({ employeeId: id })
      .populate('employeeId')
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/attendance/cancel/:id', async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found" });

    // Validate 1 hour window
    const now = Date.now();
    const recordTime = new Date(record.timestamp).getTime();
    const oneHour = 60 * 60 * 1000;

    if (now - recordTime > oneHour) {
      return res.status(403).json({ message: "Cannot cancel records older than 1 hour. Contact Admin." });
    }

    if (record.status === 'Approved' || record.status === 'Rejected') {
      return res.status(403).json({ message: "Cannot cancel a record that has already been processed by an Admin." });
    }

    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: "Record cancelled successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- Static File Serving (Monolith Deployment) ---

// Serve static files from the Vite build directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing: Serve index.html for any unknown routes
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
