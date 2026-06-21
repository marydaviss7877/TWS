const crypto = require('crypto');
const EmailVerification = require('../../models/users-auth/EmailVerification');
const emailService = require('./email.service');
const envConfig = require('../../config/environment-validator');

class EmailVerificationService {
  /**
   * Generate 6-digit OTP
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Generate secure token
   */
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create email verification record
   */
  async createVerification(email, userId = null, metadata = {}) {
    // Delete any existing pending verifications for this email
    await EmailVerification.deleteMany({
      email: email.toLowerCase(),
      status: 'pending'
    });

    const otp = this.generateOTP();
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const verification = new EmailVerification({
      email: email.toLowerCase(),
      userId,
      otp,
      token,
      type: 'signup',
      status: 'pending',
      expiresAt,
      metadata
    });

    await verification.save();
    return verification;
  }

  /**
   * Send verification email with OTP
   */
  async sendVerificationEmail(verification) {
    const subject = 'Verify Your Email Address - TWS ERP';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Verify Your Email</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hello,</p>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Thank you for signing up for TWS ERP! Please verify your email address by entering the code below:
          </p>
          
          <div style="background: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h2 style="color: #1f2937; margin: 0 0 10px 0;">Your Verification Code</h2>
            <p style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 20px 0;">
              ${verification.otp}
            </p>
            <p style="font-size: 12px; color: #9ca3af;">This code expires in 15 minutes</p>
          </div>
          
          <p style="font-size: 14px; color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px;">
            <strong>⚠️ Security Notice:</strong> Never share this code with anyone. TWS will never ask for your verification code.
          </p>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
            If you didn't create an account with TWS ERP, please ignore this email.
          </p>
        </div>
      </div>
    `;

    return await emailService.sendEmail(verification.email, subject, html);
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email, otp) {
    const verification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      otp,
      status: 'pending'
    });

    if (!verification) {
      throw new Error('Invalid or expired verification code');
    }

    if (!verification.isValid()) {
      verification.status = 'expired';
      await verification.save();
      throw new Error('Verification code has expired');
    }

    // Mark as verified
    await verification.markAsVerified();
    return verification;
  }

  /**
   * Verify token (alternative to OTP)
   */
  async verifyToken(token) {
    const verification = await EmailVerification.findOne({
      token,
      status: 'pending'
    });

    if (!verification) {
      throw new Error('Invalid or expired verification link');
    }

    if (!verification.isValid()) {
      verification.status = 'expired';
      await verification.save();
      throw new Error('Verification link has expired');
    }

    await verification.markAsVerified();
    return verification;
  }

  /**
   * Resend verification code
   */
  async resendVerification(email, metadata = {}) {
    // Check rate limiting
    const existing = await EmailVerification.findOne({
      email: email.toLowerCase(),
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (existing) {
      const now = new Date();
      const lastResend = existing.lastResendAt || existing.createdAt;
      const timeSinceLastResend = now - lastResend;
      const thirtyMinutes = 30 * 60 * 1000;

      if (existing.resendCount >= 3 && timeSinceLastResend < thirtyMinutes) {
        throw new Error('Too many resend attempts. Please wait 30 minutes.');
      }

      // Update resend count
      existing.resendCount += 1;
      existing.lastResendAt = now;
      existing.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Reset expiry
      await existing.save();

      // Send email with same OTP
      await this.sendVerificationEmail(existing);
      return existing;
    }

    // Create new verification if none exists
    const verification = await this.createVerification(email, null, metadata);
    await this.sendVerificationEmail(verification);
    return verification;
  }

  /**
   * Check if email is verified
   */
  async isEmailVerified(email) {
    const verification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      status: 'verified'
    }).sort({ verifiedAt: -1 });

    return !!verification;
  }
}

module.exports = new EmailVerificationService();
