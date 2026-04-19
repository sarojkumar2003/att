const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

console.log('Testing connection to:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('SUCCESS: MongoDB Connected');
    process.exit(0);
  })
  .catch(err => {
    console.error('FAILURE: MongoDB Connection Error');
    console.error(err);
    process.exit(1);
  });

setTimeout(() => {
  console.error('TIMEOUT: Connection took too long (30s)');
  process.exit(1);
}, 30000);
