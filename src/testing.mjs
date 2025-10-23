
import Pushy from 'pushy';

// Replace with your Pushy Secret API Key
const pushyAPI = new Pushy('3a834dabe5d9ca297ada29d915807b619d221224f207ac3c3dd81a791b479209');

// Set push payload data
const data = {
    message: 'Hellorrgggggg World!'
};

// Replace with your actual device token
const to = ['98035f2994f2636f11132f'];

// Optional notification options
const options = {
    notification: {
        badge: 1,
        sound: 'ping.aiff',
        title: 'Test Notification',
        body: 'Hello World ✌',
    },
};

// Send push notification
pushyAPI.sendPushNotification(data, to, options, function (err, id) {
    if (err) {
        return console.log('Fatal Error', err);
    }
    console.log('Push sent successfully! (ID: ' + id + ')');
});
