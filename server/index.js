import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();

// Allow CORS for local development
app.use(cors({ origin: true }));
app.use(express.json());

// Use environment variable for security
const PUSHY_API_KEY = "3a834dabe5d9ca297ada29d915807b619d221224f207ac3c3dd81a791b479209	";

if (!PUSHY_API_KEY) {
    console.warn('⚠️ PUSHY_API_KEY not set in environment variables');
}

// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).send({
        ok: true,
        pushyConfigured: Boolean(PUSHY_API_KEY),
    });
});

// Pushy notification endpoint
app.post('/pushy', async (req, res) => {
    const { parentId, message, billCount, totalAmount, deviceTokens } = req.body || {};

    console.log('📨 Notification request:', { parentId, message, billCount, totalAmount });

    if (!deviceTokens || deviceTokens.length === 0) {
        console.error('❌ No device tokens provided');
        return res.status(400).send({ error: 'No device tokens provided' });
    }

    try {
        // Send notifications
        const results = await Promise.allSettled(
            deviceTokens.map(async (token) => {
                try {
                    console.log(`📤 Sending notification to token: ${token.substring(0, 20)}...`);

                    const response = await axios.post(
                        `https://api.pushy.me/push?api_key=${PUSHY_API_KEY}`,
                        {
                            to: token,
                            data: {
                                type: 'new_bill',
                                parentId: parentId,
                                billCount: billCount || 1,
                                totalAmount: totalAmount || 0,
                                message: message || 'You have a new bill',
                            },
                            notification: {
                                title: 'New Bill Available',
                                body: message || 'You have a new bill to review',
                            },
                        },
                        {
                            timeout: 10000,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    );

                    console.log(`✅ Notification sent successfully to token ending in ...${token.slice(-10)}`);
                    return { token, success: true, response: response.data };
                } catch (error) {
                    console.error(`❌ Failed to send to token ${token.substring(0, 20)}...`,
                        { error: error.message, response: error.response?.data }
                    );
                    return { token, success: false, error: error.message };
                }
            })
        );

        // Count results
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.length - successful;

        res.status(200).send({
            success: successful > 0,
            sentTo: successful,
            failed,
            totalTokens: deviceTokens.length,
            results,
        });

    } catch (err) {
        console.error('💥 Unexpected error in /pushy endpoint:', err.message);
        res.status(500).send({ error: 'Failed to send notification', details: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Pushy server running on http://localhost:${PORT}`);
    console.log(`📊 Pushy API Key: ${PUSHY_API_KEY ? 'Configured' : 'Missing'}`);
});
