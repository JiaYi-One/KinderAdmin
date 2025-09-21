import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';

const app = express();

// Allow CORS for local development
app.use(cors({ origin: true }));
app.use(express.json());

// Use environment variable for security
const PUSHY_API_KEY = (process.env.PUSHY_API_KEY || '').trim();

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
    const { parentId, message, billCount, totalAmount, deviceTokens, type, title, entityId, teacherName, studentName, parentName, studentId, reportType } = req.body || {};

    console.log('📨 Notification request:', { parentId, message, billCount, totalAmount, type, title, entityId, tokens: deviceTokens?.length || 0 });

    if (!deviceTokens || deviceTokens.length === 0) {
        console.error('❌ No device tokens provided');
        return res.status(400).send({ error: 'No device tokens provided' });
    }

    try {
        // Compute a title (use provided title first, then fallback by type)
        const computedTitle = title || ({
            new_bill: 'New Bill Availableee',
            announcement: 'New Announcement',
            report: 'New Report',
            chat: teacherName ? `New Message From ${teacherName}` : 'New Message',
            reminder: 'Payment Reminder',
        }[type] || 'KinderCare');

        console.log('🔔 Notification title computation:', {
            providedTitle: title,
            type: type,
            teacherName: teacherName,
            computedTitle: computedTitle
        });

        // Send notifications
        const results = await Promise.allSettled(
            deviceTokens.map(async (token) => {
                try {
                    console.log(`📤 Sending notification to token: ${token.substring(0, 20)}...`);

                    const pushyPayload = {
                        to: token,
                        data: {
                            type: type || 'generic',
                            parentId: parentId,
                            billCount: billCount || 1,
                            totalAmount: totalAmount || 0,
                            message: message || 'You have a new notification',
                            entityId: entityId || null,
                            title: computedTitle, // Include title in data payload for mobile handling
                            // Duplicate chatId for chat payloads to improve compatibility on clients
                            ...(type === 'chat' && entityId
                                ? { chatId: entityId }
                                : {}),
                            // For chat notifications, include structured metadata consumed by mobile
                            ...(type === 'chat' ? {
                                teacherName: teacherName,
                                studentName: studentName,
                                parentName: parentName,
                                content: message,
                            } : {}),
                            // For report notifications, include report-specific metadata
                            ...(type === 'report' ? {
                                studentName: studentName,
                                studentId: studentId,
                                reportType: reportType,
                                teacherName: teacherName,
                            } : {}),
                        },
                        notification: {
                            title: computedTitle,
                            body: message || 'You have a new notification',
                            sound: 'default',
                            badge: 1,
                            icon: 'ic_notification',
                            color: '#FF6B6B',
                        },
                    };

                    console.log('📤 Pushy payload being sent:', {
                        to: token.substring(0, 20) + '...',
                        notificationTitle: pushyPayload.notification.title,
                        dataTitle: pushyPayload.data.title,
                        type: type,
                        fullNotificationPayload: pushyPayload.notification
                    });

                    const response = await axios.post(
                        `https://api.pushy.me/push?api_key=${PUSHY_API_KEY}`,
                        pushyPayload,
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

// Chat notification endpoint
app.post('/api/send-notification', async (req, res) => {
    const { to: deviceTokens, notification, data } = req.body || {};

    console.log('💬 Chat notification request:', {
        tokens: deviceTokens?.length || 0,
        type: data?.type,
        chatId: data?.chatId
    });

    if (!deviceTokens || deviceTokens.length === 0) {
        console.error('❌ No device tokens provided for chat notification');
        return res.status(400).send({ error: 'No device tokens provided' });
    }

    try {
        // Send notifications to all device tokens
        const results = await Promise.allSettled(
            deviceTokens.map(async (token) => {
                try {
                    console.log(`💬 Sending chat notification to token: ${token.substring(0, 20)}...`);

                    const response = await axios.post(
                        `https://api.pushy.me/push?api_key=${PUSHY_API_KEY}`,
                        {
                            to: token,
                            data: {
                                type: data.type || 'chat',
                                chatId: data.chatId,
                                // Also send entityId mirror for clients that expect entityId
                                entityId: data.entityId || data.chatId,
                                studentName: data.studentName,
                                parentName: data.parentName,
                                teacherName: data.teacherName,
                                content: data.content,
                                message: notification.body,
                            },
                            notification: {
                                title: notification.title,
                                body: notification.body,
                                sound: notification.sound || 'default',
                            },
                        },
                        {
                            timeout: 10000,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    );

                    console.log(`✅ Chat notification sent successfully to token ending in ...${token.slice(-10)}`);
                    return { token, success: true, response: response.data };
                } catch (error) {
                    console.error(`❌ Failed to send chat notification to token ${token.substring(0, 20)}...`,
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
        console.error('💥 Unexpected error in chat notification endpoint:', err.message);
        res.status(500).send({ error: 'Failed to send chat notification', details: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Pushy server running on http://localhost:${PORT}`);
    console.log(`📊 Pushy API Key: ${PUSHY_API_KEY ? 'Configured' : 'Missing'}`);
});
