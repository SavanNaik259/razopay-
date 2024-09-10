const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

// Initialize express
const app = express();
app.use(bodyParser.json());
app.use(cors({
    origin: "https://paymenti.netlify.app/frontend/" // Set this in your .env file for production
}));

// Initialize Razorpay with environment variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Route to create an order
app.post('/createOrder', async (req, res) => {
    const { amount, currency, receipt, payment_capture } = req.body;

    if (amount < 1 || amount > 49000) {
        return res.status(400).json({ error: 'Amount must be between 1 and 49000 INR' });
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
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to verify the payment
app.post('/verifyPayment', async (req, res) => {
    const { order_id, payment_id, signature } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${order_id}|${payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === signature) {
        res.json({ status: 'success', order_id, payment_id });
    } else {
        res.status(400).json({ status: 'failure', error: 'Signature mismatch' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
