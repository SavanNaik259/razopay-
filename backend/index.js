const path = require('path');
const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Initialize express
const app = express();
app.use(bodyParser.json());

// CORS configuration
app.use(cors({
    origin: ['http://localhost:3000', 'https://paymenti.netlify.app/frontend/'] // Add your frontend URLs here
}));
// Initialize Razorpay with your key and secret from environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Route to create an order
app.post('/createOrder', async (req, res) => {
    const { amount, currency, receipt, payment_capture } = req.body;

    // Validate amount
    if (amount < 1 || amount > 49000) {
        return res.status(400).json({ error: 'Amount must be between ₹1 and ₹49,000.' });
    }

    const options = {
        amount: amount * 100, // amount in the smallest currency unit
        currency,
        receipt,
        payment_capture
    };

    try {
        const response = await razorpay.orders.create(options);
        res.json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
            receipt: response.receipt
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).send({ error: 'Error creating order. Please try again.' });
    }
});

// Route to verify the payment
app.post('/verifyPayment', async (req, res) => {
    const { order_id, payment_id, signature } = req.body;

    const shasum = crypto.createHmac('sha256', razorpay.key_secret);
    shasum.update(order_id + '|' + payment_id);
    const digest = shasum.digest('hex');

    if (digest === signature) {
        res.json({ status: 'success', order_id, payment_id });
    } else {
        res.status(400).json({ status: 'failure', message: 'Payment verification failed.' });
    }
});

// Serve the frontend index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
