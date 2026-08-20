const crypto = require('crypto');
const EmailVerification = require('../../models/users-auth/EmailVerification');
const emailService = require('./email.service');
const envConfig = require('../../config/environment-validator');
const { renderEmailShell, renderNotice, COLORS, FONT_STACK } = require('./emailTemplates');

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
    const subject = 'Verify your email address - HousesBase';
    const body = `
      <p style="font-size:16px;color:${COLORS.ink};margin:0 0 16px;">Hello,</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin:0 0 8px;">
        Thank you for signing up for HousesBase! Please verify your email address by entering the code below:
      </p>
      <div style="background:${COLORS.panel};border:1px solid ${COLORS.border};padding:28px;border-radius:8px;margin:20px 0;text-align:center;">
        <h2 style="color:${COLORS.ink};margin:0 0 6px;font-size:14px;font-weight:600;">Your verification code</h2>
        <p style="font-size:32px;font-weight:700;color:${COLORS.navy};letter-spacing:8px;margin:16px 0;font-family:${FONT_STACK};">
          ${verification.otp}
        </p>
        <p style="font-size:12px;color:${COLORS.faint};margin:0;">This code expires in 15 minutes</p>
      </div>
      ${renderNotice('<strong>Security notice:</strong> Never share this code with anyone. HousesBase will never ask for your verification code.', 'danger')}
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">
        If you didn't create an account with HousesBase, please ignore this email.
      </p>
    `;
    const html = renderEmailShell({ preheader: `Your verification code is ${verification.otp}`, bodyHtml: body });

    return await emailService.sendEmail(verification.email, subject, html);
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email, otp) {
    const verification = await EmailVerification.findOne({
      email: email.toLowerCase(),
      status: 'pending'
    }).sort({ createdAt: -1 });

    if (!verification) {
      throw new Error('Invalid or expired verification code. Please request a new one.');
    }

    if (!verification.isValid()) {
      verification.status = 'expired';
      await verification.save();
      throw new Error('Verification code has expired. Please request a new one.');
    }

    if (verification.otp !== String(otp)) {
      // Atomic increment so concurrent wrong guesses can't collapse into one
      // (a read-then-write on verification.attempts would race under parallel requests)
      const updated = await EmailVerification.findOneAndUpdate(
        { _id: verification._id, status: 'pending' },
        { $inc: { attempts: 1 } },
        { new: true }
      );

      if (updated && updated.attempts >= 5) {
        updated.status = 'expired';
        await updated.save();
        throw new Error('Too many incorrect attempts. Please request a new code.');
      }
      throw new Error('Incorrect verification code');
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
   * Reuses the existing record (even if it just expired from too many failed
   * attempts) so the resend-count/cooldown can't be reset by tripping the
   * attempt cap, and rotates the OTP so a previously-guessed code stops working.
   */
  async resendVerification(email, metadata = {}) {
    const normalizedEmail = email.toLowerCase();
    const existing = await EmailVerification.findOne({
      email: normalizedEmail,
      status: { $in: ['pending', 'expired'] }
    }).sort({ createdAt: -1 });

    if (existing) {
      const now = new Date();
      const lastResend = existing.lastResendAt || existing.createdAt;
      const timeSinceLastResend = now - lastResend;
      const thirtyMinutes = 30 * 60 * 1000;

      if (existing.resendCount >= 3 && timeSinceLastResend < thirtyMinutes) {
        throw new Error('Too many resend attempts. Please wait 30 minutes.');
      }

      // Rotate the OTP and reset attempts/status so a guessed or expired code is dead
      existing.otp = this.generateOTP();
      existing.token = this.generateToken();
      existing.attempts = 0;
      existing.status = 'pending';
      existing.resendCount += 1;
      existing.lastResendAt = now;
      existing.expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // Reset expiry
      await existing.save();

      await this.sendVerificationEmail(existing);
      return existing;
    }

    // Create new verification if none exists
    const verification = await this.createVerification(normalizedEmail, null, metadata);
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
