/**
 * Firebase Admin — disabled (no-op stubs).
 * Set FIREBASE_ENABLED=true and add credentials to re-enable.
 */

console.log('ℹ️  Firebase Admin disabled — push notifications are off');

const noop = async () => ({ success: false, disabled: true });

module.exports = {
  initializeFirebaseAdmin: () => null,
  getFirebaseAdmin:        () => null,
  getFirebaseServices:     () => null,
  verifyFirebaseConnection: async () => false,
  sendNotificationToUser:   noop,
  sendNotificationToTopic:  noop,
  verifyIdToken:            async () => null
};
