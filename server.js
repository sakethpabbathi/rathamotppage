
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const twilio = require('twilio');




dotenv.config();
const app = express();
const otpStore = new Map();


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





// Verify OTP
app.post('/verify-otp', (req, res) => {
  const { mobile, otp } = req.body;
  const storedOtp = otpStore.get(mobile);

  if (storedOtp === otp) {
    otpStore.delete(mobile);
  
    res.redirect('/mainapp.html');
  } else {
    res.send('Invalid OTP');
  }
});






app.post("/submit-order", (req, res) => {
  const { name, phone } = req.body;
  const message = `New Order:\nName: ${name}\nPhone: ${phone}`;

  // Send SMS to owner
  client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,  // Your Twilio number
      to: '+919347719244'             // Owner's number
  })
  .then(() => {
      console.log("SMS sent successfully.");
      res.redirect('/sent.html');
      
  })
  .catch(err => {
      console.error("Error sending SMS:", err);
      res.status(500).send("Failed to send SMS.");
  });
});





app.get('/index', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/mainapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'mainapp.html'));
});

app.get('/Rathamapp', (req, res) => {
  res.sendFile(path.join(__dirname, 'Rathamapp.html'));
});

app.get('/profile', (req, res) => {
  res.sendFile(path.join(__dirname, 'profile.html'));
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
