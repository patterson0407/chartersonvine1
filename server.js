// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const axios = require('axios'); // For API requests
const app = express();

app.use(cors());
app.use(express.json());

// Helper function to safely stringify objects with BigInt
function safeStringify(obj, indent = 2) {
  return JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value
  , indent);
}

// Debugging Logs for Environment Variables
console.log("SQUARE_ENV:", process.env.SQUARE_ENV);
console.log("SQUARE_ACCESS_TOKEN:", process.env.SQUARE_ACCESS_TOKEN ? "Loaded" : "Missing");
console.log("SQUARE_LOCATION_ID:", process.env.SQUARE_LOCATION_ID ? "Loaded" : "Missing");
console.log("EMAIL_USER:", process.env.EMAIL_USER ? "Loaded" : "Missing");
console.log("BUSINESS_EMAIL:", process.env.BUSINESS_EMAIL ? "Loaded" : "Missing");

// Define port
const port = process.env.PORT || 3000;

/**
 * Charter Request Endpoint
 */
app.post("/api/charter-request", async (req, res) => {
  try {
    const { firstName, lastName, email, eventType, eventDate, hours, charterType, details } = req.body;

    // Send Confirmation Email to Customer
    await sendEmail({
      to: email,
      subject: "Charters on Vine - Charter Request Received",
      text: `Hello ${firstName},\n\nWe have received your charter request for ${eventType} on ${eventDate}.\nOur team will get back to you soon!\n\nThank you,\nCharters on Vine`,
    });

    // Send Notification Email to Business
    await sendEmail({
      to: process.env.BUSINESS_EMAIL,
      subject: "New Charter Request",
      text: `New charter request from ${firstName} ${lastName} (${email}).\nEvent Type: ${eventType}\nEvent Date: ${eventDate}\nHours: ${hours}\nCharter Type(s): ${charterType}\n\nDetails:\n${details}`,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Error in /api/charter-request:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Create Checkout Endpoint (Using Axios for Checkout API)
 */
app.post("/create-checkout", async (req, res) => {
  const { eventId, quantity, totalAmount, email, event, date, description } = req.body;

  // Define your events (This can be moved to a database or separate file)
  const events = {
    event1: {
      name: "Jimmy Buffet Lost Shaker of Salt Trolley Party",
      description: "Join us for an unforgettable night with Jimmy Buffet's music as we cruise through the best bars and pubs around Ankeny!",
      price: 4965, // in cents ($49.65)
      thumbnail: "Images/jimmy_buffet_event.jpg", // Update with actual image path
    },
    event2: {
      name: "Another Exciting Event",
      description: "Details about the second event.",
      price: 2995, // in cents ($29.95)
      thumbnail: "Images/another_event.jpg", // Update with actual image path
    },
    // Add more events as needed
  };

  // Validate eventId
  if (!eventId || !events[eventId]) {
    return res.status(400).json({ error: 'Invalid or missing event ID.' });
  }

  const selectedEvent = events[eventId];

  try {
    // Step 1: Create an Order using Square Orders API
    const orderPayload = {
      location_id: process.env.SQUARE_LOCATION_ID,
      line_items: [
        {
          name: "Test Event",
          quantity: "1",
          base_price_money: {
            amount: 1000, // in cents ($10.00)
            currency: "USD",
          },
        },
      ],
    };
    
    try {
      const orderResponse = await axios.post(
        'https://connect.squareupsandbox.com/v2/orders',
        { order: orderPayload },
        {
          headers: {
            'Square-Version': '2024-12-18',
            'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log('Order Created:', orderResponse.data);
    } catch (error) {
      console.error('Order Error:', error.response?.data || error.message);
    }
    

    // Step 2: Create a Checkout using Square Checkout API
    const checkoutPayload = {
      idempotency_key: `idemp-${Date.now()}`, // Unique identifier to prevent duplicates
      order: {
        id: orderId,
      },
      redirect_url: "http://localhost:3000/thank-you.html", // URL to redirect after payment
      pre_populated_data: {
        buyer_email_address: email, // Pre-populate the buyer's email in the payment form
      },
    };

    console.log("Creating Checkout with:", safeStringify(checkoutPayload, 2));

    const checkoutResponse = await axios.post(
      'https://connect.squareup.com/v2/checkout',
      checkoutPayload,
      {
        headers: {
          'Square-Version': '2024-12-18', // Ensure this matches API version 39.1.0
          'Authorization': `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const checkoutUrl = checkoutResponse.data.checkout.checkout_page_url; // URL to redirect the buyer for payment

    if (!checkoutUrl) {
      throw new Error("Checkout creation failed: Missing checkout URL.");
    }

    console.log("Checkout Response:", safeStringify(checkoutResponse.data.checkout, 2));

    res.json({ checkoutUrl: checkoutUrl });

    // Optionally, send confirmation emails here if desired

  } catch (error) {
    console.error("Error creating Square Checkout:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to create checkout.' });
  }
});

/**
 * Utility Function: Send Email with Nodemailer
 */
async function sendEmail({ to, subject, text }) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // Use your preferred email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
  }
}

// Serve static files
app.use(express.static('public'));

// Default route
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Start the Server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
