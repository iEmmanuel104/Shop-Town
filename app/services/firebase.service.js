const admin = require('firebase-admin');
const serviceAccount = require('../cloudkeys/firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const sendPushNotification = (registrationToken, title, body) => {
    const message = {
        notification: {
            title: title,
            body: body,
        },
        token: registrationToken,
    };

    admin
        .messaging()
        .send(message)
        .then((response) => {
            // return response
            console.log('Successfully sent notification:', response);
        })
        .catch((error) => {
            // throw new CustomError.InternalServerError('Error sending notification: ' + error.message);
            console.error('Error sending notification:', error);
        });
};

// // Example usage:
// const registrationToken = 'DEVICE_REGISTRATION_TOKEN';
// const notificationTitle = 'Notification Title';
// const notificationBody = 'Notification Body';
// sendPushNotification(registrationToken, notificationTitle, notificationBody);

module.exports = { sendPushNotification };
