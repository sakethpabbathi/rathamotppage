
require('dotenv').config();
const mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const twilio = require('twilio');

dotenv.config();
const app = express();
const otpStore = new Map();


const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const twilioClient = twilio(accountSid, authToken);

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
      console.error('MySQL Connection Error:', err);
      return;
  }
  console.log(' MySQL Connected to freesql...');
});

  // This route must come BEFORE express.static
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Rathamapp.html');
});

// Static files middleware (moved below)
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));





app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'verify.html')));

app.post('/send-otp', async (req, res) => {
  const mobile = req.body.mobile;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(mobile, otp);

  try {
    await client.messages.create({
      body: `Your OTP is: ${otp}`,
      from: process.env.TWILIO_PHONE_FROM,
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





app.post('/submit-order', (req, res) => {
  console.log("Received form submission:", req.body); // Debugging log

  const { name, phone } = req.body;
  if (!name || !phone) {
    console.log(" Missing name or phone");
    return res.status(400).send(" Name and phone are required!");
  }

  const checkQuery = "SELECT * FROM orders WHERE phone = ?";
  db.query(checkQuery, [phone], (err, results) => {
    if (err) {
      console.error(" Database Error:", err);
      return res.status(500).send(" Database error");
    }

    if (results.length > 0) {
      console.log(" Phone already exists");
    } else {
      const insertQuery = "INSERT INTO orders (name, phone) VALUES (?, ?)";
      db.query(insertQuery, [name, phone], (err, result) => {
        if (err) {
          console.error(" Insert Failed:", err);
          return res.status(500).send(" Insert failed");
        }
        console.log(" Order inserted:", result.insertId);
      });
    }

    // Send SMS
    twilioClient.messages
      .create({
        body: `New Order\nName: ${name}\nPhone: ${phone}`,
        from: process.env.TWILIO_PHONE_FROM,
        to: process.env.TWILIO_PHONE_TO
      })
      .then(message => {
        
        res.redirect('/sent.html'); 
        
      })
      .catch(err => {
        console.error(" SMS Error:", err);
        res.status(500).send(" Failed to send SMS");
      });
  });
});



// app.post("/submit-order", (req, res) => {
//   const { name, phone } = req.body;
//   const message = `New Order:\nName: ${name}\nPhone: ${phone}`;

//   // Send SMS to owner
//   client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE,  // Your Twilio number
//       to: '+919347719244'             // Owner's number
//   })
//   .then(() => {
//       console.log("SMS sent successfully.");
//       res.redirect('/sent.html');
      
//   })
//   .catch(err => {
//       console.error("Error sending SMS:", err);
//       res.status(500).send("Failed to send SMS.");
//   });
// });



// Add product to cart
app.post('/api/add-to-cart', (req, res) => {
  const { productId, productName, productPrice } = req.body;

  const checkQuery = "SELECT * FROM cart WHERE product_id = ?";
  db.query(checkQuery, [productId], (err, result) => {
      if (err) {
          console.error('Error checking cart:', err);
          return res.json({ success: false, error: err });
      }

      if (result.length > 0) {
          return res.json({ success: false, message: "Product already in cart" });
      }

      const insertQuery = "INSERT INTO cart (product_id, product_name, product_price) VALUES (?, ?, ?)";
      db.query(insertQuery, [productId, productName, productPrice], (err, result) => {
          if (err) {
              console.error('Error adding to cart:', err);
              return res.json({ success: false, error: err });
          }
          res.json({ success: true });
      });
  });
});

// Get cart products
app.get('/api/cart', (req, res) => {
  const query = "SELECT * FROM cart";
  db.query(query, (err, results) => {
      if (err) {
          console.error('Error fetching cart:', err);
          return res.json({ success: false, error: err });
      }
      res.json({ success: true, cart: results });
  });
});

// Remove product from cart
app.delete('/api/remove-from-cart/:productId', (req, res) => {
  const { productId } = req.params;

  const deleteQuery = "DELETE FROM cart WHERE product_id = ?";
  db.query(deleteQuery, [productId], (err, result) => {
      if (err) {
          console.error('Error removing from cart:', err);
          return res.json({ success: false, error: err });
      }
      res.json({ success: true });
  });
});


// Save product
app.post('/api/save-product', (req, res) => {
  const { productId, productName, productPrice } = req.body;

  const checkQuery = "SELECT * FROM saved WHERE product_id = ?";
  db.query(checkQuery, [productId], (err, result) => {
      if (err) return res.json({ success: false, error: err });

      if (result.length > 0) {
          return res.json({ success: false, message: "Product already saved" });
      }

      const insertQuery = "INSERT INTO saved (product_id, product_name, product_price) VALUES (?, ?, ?)";
      db.query(insertQuery, [productId, productName, productPrice], (err, result) => {
          if (err) return res.json({ success: false, error: err });

          res.json({ success: true });
      });
  });
});

// Get saved products
app.get('/api/saved-products', (req, res) => {
  db.query("SELECT * FROM saved", (err, results) => {
      if (err) return res.json({ success: false, error: err });

      res.json({ success: true, saved: results });
  });
});

// Remove saved product
app.delete('/api/remove-saved-product/:productId', (req, res) => {
  const { productId } = req.params;

  db.query("DELETE FROM saved WHERE product_id = ?", [productId], (err, result) => {
      if (err) return res.json({ success: false, error: err });

      res.json({ success: true });
  });
});





// POST endpoint to save profile data
app.post('/api/profile', (req, res) => {
  const { name, number, address, profileImage } = req.body;

  // Ensure that the profile is saved under the correct phone number
  const sql = 'INSERT INTO profiles (name, phone_number, address, profile_image) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, address = ?, profile_image = ?';
  db.query(sql, [name, number, address, profileImage, name, address, profileImage], (err, result) => {
      if (err) {
          console.error('Error saving profile:', err);
          res.status(500).json({ error: 'Failed to save profile data' });
          return;
      }
      res.status(200).json({ message: 'Profile saved successfully' });
  });
});

// GET endpoint to retrieve profile data for the logged-in user (using their phone number)
app.get('/api/profile', (req, res) => {
  const { phoneNumber } = req.query;  // Fetch phone number from query params or session

  if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
  }

  // Fetch profile data specific to the logged-in phone number
  const sql = 'SELECT * FROM profiles WHERE phone_number = ? LIMIT 1';
  db.query(sql, [phoneNumber], (err, results) => {
      if (err) {
          console.error('Error fetching profile:', err);
          res.status(500).json({ error: 'Failed to fetch profile data' });
          return;
      }
      if (results.length > 0) {
          res.status(200).json(results[0]);
      } else {
          res.status(404).json({ message: 'No profile data found' });
      }
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
