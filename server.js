
// require('dotenv').config();

// const express = require('express');
// const mysql = require('mysql');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const bodyParser = require('body-parser');
// const fs = require('fs');
// const path = require('path');
// const twilio = require('twilio');
// const multer = require('multer');
// const app = express();
// const upload = multer();

// // app.use(express.static(__dirname));
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(cors());
// app.use(bodyParser.json({ limit: '10mb' }));
// app.use(express.urlencoded({ limit: '10mb', extended: true }));



// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;

// const twilioClient = twilio(accountSid, authToken);

// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME
// });


// db.connect(err => {
//     if (err) {
//         console.error('MySQL Connection Error:', err);
//         return;
//     }
//     console.log(' MySQL Connected...');
// });


//   // This route must come BEFORE express.static
// app.get('/', (req, res) => {
//   res.sendFile(__dirname + '/Rathamapp.html');
// });

// // Static files middleware (moved below)
// app.use(express.static(__dirname));




// // POST endpoint to save profile data
// app.post('/api/profile', (req, res) => {
//   const { name, number, address, profileImage } = req.body;

//   // Ensure that the profile is saved under the correct phone number
//   const sql = 'INSERT INTO profiles (name, phone_number, address, profile_image) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, address = ?, profile_image = ?';
//   db.query(sql, [name, number, address, profileImage, name, address, profileImage], (err, result) => {
//       if (err) {
//           console.error('Error saving profile:', err);
//           res.status(500).json({ error: 'Failed to save profile data' });
//           return;
//       }
//       res.status(200).json({ message: 'Profile saved successfully' });
//   });
// });

// // GET endpoint to retrieve profile data for the logged-in user (using their phone number)
// app.get('/api/profile', (req, res) => {
//   const { phoneNumber } = req.query;  // Fetch phone number from query params or session

//   if (!phoneNumber) {
//       return res.status(400).json({ error: 'Phone number is required' });
//   }

//   // Fetch profile data specific to the logged-in phone number
//   const sql = 'SELECT * FROM profiles WHERE phone_number = ? LIMIT 1';
//   db.query(sql, [phoneNumber], (err, results) => {
//       if (err) {
//           console.error('Error fetching profile:', err);
//           res.status(500).json({ error: 'Failed to fetch profile data' });
//           return;
//       }
//       if (results.length > 0) {
//           res.status(200).json(results[0]);
//       } else {
//           res.status(404).json({ message: 'No profile data found' });
//       }
//   });
// });

   
// // const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
// // const otpStore = new Map(); // Temporarily store OTPs (in-memory)

// // // Serve HTML


// // app.get('/verify', (req, res) => res.sendFile(__dirname + '/verify.html'));

// // // Send OTP
// // app.post('/send-otp', async (req, res) => {
// //   const mobile = req.body.mobile;
// //   const otp = Math.floor(100000 + Math.random() * 900000).toString();

// //   otpStore.set(mobile, otp); // Store OTP

// //   try {
// //     await client.messages.create({
// //       body: `Your OTP is: ${otp}`,
// //       from: process.env.TWILIO_PHONE,
// //       to: `+91${mobile}`
// //     });
// //     res.redirect('/verify');
// //   } catch (err) {
// //     console.error('Twilio Error:', err.message);
// //     res.send('Failed to send OTP');
// //   }
// // });


// // // Verify OTP
// // app.post('/verify-otp', (req, res) => {
// //   const { mobile, otp } = req.body;
// //   const storedOtp = otpStore.get(mobile);

// //   if (storedOtp === otp) {
// //     otpStore.delete(mobile);
  
// //     res.redirect('/mainapp.html');
// //   } else {
// //     res.send('Invalid OTP');
// //   }
// // });



// app.get('/index', (req, res) => {
//   res.sendFile(path.join(__dirname, 'index.html'));
// });

// app.get('/succes', (req, res) => {
//   res.sendFile(path.join(__dirname, 'succes.html'));
// });
// // Signup Page Route
// app.get('/signup', (req, res) => {
//   res.sendFile(path.join(__dirname, 'signup.html'));
// });

// // Login Page Route
// app.get('/login', (req, res) => {
//   res.sendFile(path.join(__dirname, 'login.html'));
// });

// // App Page Route
// app.get('/Rathamapp', (req, res) => {
//   res.sendFile(path.join(__dirname, 'Rathamapp.html'));
// });

//  app.get('/sent', (req, res) => {
//    res.sendFile(path.join(__dirname, 'sent.html'));
//  });

// // // Add this route (already partially present)
// app.get('/order', (req, res) => {
//   res.sendFile(path.join(__dirname, 'order.html'));
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
// });






const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();
const app = express();
const otpStore = new Map();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

app.use(bodyParser.urlencoded({ extended: true }));



  // This route must come BEFORE express.static
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Rathamapp.html');
});

// Static files middleware (moved below)
app.use(express.static(__dirname));





app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'verify.html')));

app.post('/send-otp', async (req, res) => {
  const mobile = req.body.mobile;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(mobile, otp);

  try {
    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE,
      to: `+91${mobile}`
    });
    res.redirect('/verify');
  } catch (err) {
    console.error('Twilio Error:', err.message);
    res.send('Failed to send OTP');
  }
});

app.post('/verify-otp', async (req, res) => {
  const { mobile, otp } = req.body;
  const storedOtp = otpStore.get(mobile);

  if (storedOtp === otp) {
    otpStore.delete(mobile);
    await pool.query('INSERT INTO users(mobile) VALUES($1)', [mobile]);
    res.redirect('/mainapp.html'); // Replace with your actual app
  } else {
    res.send('Invalid OTP');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
