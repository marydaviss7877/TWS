const { Resend } = require('resend');
const envConfig = require('../../config/environment-validator');

/**
 * Email Service for Education System
 * Handles all email notifications for students, teachers, and parents
 */

class EmailService {
  constructor() {
    // Secrets read directly from process.env, never through client-facing config.
    this.from = process.env.EMAIL_FROM || 'noreply@tws-platform.com';
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('⚠️  RESEND_API_KEY not set. Emails will be logged to console.');
      }
      this.resend = null;
    } else {
      this.resend = new Resend(apiKey);
    }
  }

  /**
   * Send email (with fallback to console logging)
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.resend) {
        // Fallback: log to console. Body may contain OTPs/tokens, so only
        // print it in development — elsewhere just confirm it was suppressed.
        console.log('📧 EMAIL (Console Fallback — RESEND_API_KEY not configured):');
        console.log('  To:', to);
        console.log('  Subject:', subject);
        console.log(
          '  Content:',
          process.env.NODE_ENV === 'development'
            ? (text || html.replace(/<[^>]*>/g, ''))
            : '[suppressed outside development — configure RESEND_API_KEY to send real emails]'
        );
        return { success: true, mode: 'console' };
      }

      const { data, error } = await this.resend.emails.send({
        from: this.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      });

      if (error) {
        console.error('❌ Email send failed:', error);
        return { success: false, error: error.message || 'Failed to send email' };
      }

      console.log('✅ Email sent:', data?.id);
      return { success: true, messageId: data?.id, mode: 'resend' };
    } catch (error) {
      console.error('❌ Email send failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Student Registration Welcome Email
   */
  async sendStudentWelcomeEmail(student, credentials) {
    const subject = 'Welcome to Your Student Portal';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Student Portal!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${student.firstName} ${student.lastName},</p>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Welcome to our school! Your student account has been successfully created.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Your Login Credentials:</h3>
            <p style="margin: 10px 0;"><strong>Student ID:</strong> ${student.studentId}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${credentials.email}</p>
            <p style="margin: 10px 0;"><strong>Temporary Password:</strong> ${credentials.password}</p>
            <p style="margin: 10px 0;"><strong>Class:</strong> ${student.currentClass?.className || 'TBA'}</p>
          </div>
          
          <p style="font-size: 14px; color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px;">
            <strong>⚠️ Important:</strong> Please change your password after your first login for security.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${envConfig.get('FRONTEND_URL')}/login"
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Login to Student Portal
            </a>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
            If you have any questions, please contact your school administrator.
          </p>
        </div>
      </div>
    `;
    
    return await this.sendEmail(credentials.email, subject, html);
  }

  /**
   * Password Reset Email
   */
  async sendPasswordResetEmail(user, tempPassword) {
    const subject = 'Password Reset - Your Temporary Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${user.fullName || user.firstName || 'User'},</p>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            You requested a password reset for your account. A temporary password has been generated for you.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Your Temporary Password:</h3>
            <p style="margin: 10px 0; font-size: 18px; font-weight: bold; color: #667eea; background: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; letter-spacing: 2px;">
              ${tempPassword}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px;">
            <strong>⚠️ Important:</strong> Please login with this temporary password and change it immediately for security.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${envConfig.get('FRONTEND_URL')}/login"
               style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Login to Portal
            </a>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
            If you did not request this password reset, please contact your administrator immediately.
          </p>
        </div>
      </div>
    `;
    
    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Grade Published Notification
   */
  async sendGradeNotification(student, grade) {
    const subject = `New Grade Posted - ${grade.subjectId?.subjectName}`;
    const percentage = ((grade.obtainedMarks / grade.totalMarks) * 100).toFixed(2);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #3b82f6; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">📊 New Grade Posted</h2>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${student.firstName},</p>
          
          <p style="font-size: 14px; color: #6b7280;">
            A new grade has been posted for your recent exam.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Grade Details:</h3>
            <p><strong>Subject:</strong> ${grade.subjectId?.subjectName || 'N/A'}</p>
            <p><strong>Exam:</strong> ${grade.examId?.examName || 'N/A'}</p>
            <p><strong>Marks:</strong> ${grade.obtainedMarks} / ${grade.totalMarks}</p>
            <p><strong>Percentage:</strong> ${percentage}%</p>
            <p><strong>Grade:</strong> <span style="background: #dbeafe; padding: 4px 12px; border-radius: 4px; font-weight: bold;">${grade.grade || 'N/A'}</span></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${envConfig.get('FRONTEND_URL')}/student/grades" 
               style="background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View All Grades
            </a>
          </div>
        </div>
      </div>
    `;
    
    return await this.sendEmail(student.email, subject, html);
  }

  /**
   * Homework Submission Confirmation
   */
  async sendHomeworkSubmissionConfirmation(student, homework) {
    const subject = `Homework Submitted - ${homework.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #10b981; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">✅ Homework Submitted Successfully</h2>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${student.firstName},</p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Your homework has been successfully submitted.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Submission Details:</h3>
            <p><strong>Assignment:</strong> ${homework.title}</p>
            <p><strong>Subject:</strong> ${homework.subjectId?.subjectName || 'N/A'}</p>
            <p><strong>Due Date:</strong> ${new Date(homework.dueDate).toLocaleDateString()}</p>
            <p><strong>Submitted On:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Status:</strong> <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 4px;">Submitted</span></p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            Your teacher will grade your submission soon. You'll receive another email when it's graded.
          </p>
        </div>
      </div>
    `;
    
    return await this.sendEmail(student.email, subject, html);
  }

  /**
   * Fee Payment Receipt
   */
  async sendFeePaymentReceipt(student, payment) {
    const subject = 'Fee Payment Receipt';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #8b5cf6; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">💳 Payment Receipt</h2>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${student.firstName} ${student.lastName},</p>
          
          <p style="font-size: 14px; color: #6b7280;">
            Thank you for your payment. Here are your receipt details:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
            <h3 style="color: #1f2937; margin-top: 0;">Payment Details:</h3>
            <p><strong>Receipt No:</strong> ${payment.receiptNumber || payment._id}</p>
            <p><strong>Student ID:</strong> ${student.studentId}</p>
            <p><strong>Amount Paid:</strong> ₹${payment.totalAmount.toLocaleString()}</p>
            <p><strong>Payment Date:</strong> ${new Date(payment.paymentDate).toLocaleDateString()}</p>
            <p><strong>Payment Method:</strong> ${payment.paymentMethod || 'N/A'}</p>
            <p><strong>Status:</strong> <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 4px;">Paid</span></p>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af; background: #f3f4f6; padding: 15px; border-radius: 6px;">
            Please keep this receipt for your records. If you have any questions about this payment, contact the school office.
          </p>
        </div>
      </div>
    `;
    
    return await this.sendEmail(student.email, subject, html);
  }

  /**
   * Low Attendance Alert
   */
  async sendLowAttendanceAlert(student, attendancePercentage) {
    const subject = '⚠️ Low Attendance Alert';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #ef4444; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">⚠️ Attendance Alert</h2>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${student.firstName},</p>
          
          <p style="font-size: 14px; color: #dc2626; background: #fef2f2; padding: 15px; border-radius: 8px;">
            <strong>Important Notice:</strong> Your attendance has fallen below the minimum required percentage.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Attendance Status:</h3>
            <p style="font-size: 24px; color: #dc2626; font-weight: bold; margin: 15px 0;">
              ${attendancePercentage.toFixed(2)}%
            </p>
            <p style="color: #6b7280;">Minimum Required: 75%</p>
          </div>
          
          <p style="font-size: 14px; color: #6b7280;">
            Please ensure regular attendance to meet the minimum requirement. If you have any concerns, please contact your class teacher or the school office.
          </p>
        </div>
      </div>
    `;
    
    return await this.sendEmail(student.email, subject, html);
  }

  /**
   * Tenant Signup Welcome Email
   */
  async sendTenantWelcomeEmail(user, tenant, subdomain) {
    const subject = `Welcome to ${tenant.name || tenant.organizationName} - Your TWS ERP is Ready!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to TWS ERP!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${user.fullName},</p>
          
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Congratulations! Your TWS ERP tenant has been successfully created and provisioned. You're all set to start managing your business operations.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Your Tenant Details:</h3>
            <p style="margin: 10px 0;"><strong>Organization:</strong> ${tenant.name || tenant.organizationName}</p>
            <p style="margin: 10px 0;"><strong>Subdomain:</strong> ${subdomain}</p>
            <p style="margin: 10px 0;"><strong>Industry:</strong> ${tenant.erpCategory || tenant.industry || 'Business'}</p>
            <p style="margin: 10px 0;"><strong>Status:</strong> <span style="background: #d1fae5; color: #065f46; padding: 4px 12px; border-radius: 4px;">Active</span></p>
          </div>
          
          <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin-top: 0;">🚀 Quick Start Guide</h3>
            <ol style="color: #374151; line-height: 1.8;">
              <li>Complete your company profile and add your logo</li>
              <li>Configure your chart of accounts</li>
              <li>Invite your team members</li>
              <li>Set up approval workflows</li>
              <li>Review security settings and enable MFA</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${envConfig.get('FRONTEND_URL') || 'https://app.tws.example.com'}/${tenant.slug}/onboarding" 
               style="background: #667eea; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
              Complete Your Setup
            </a>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              <strong>Need Help?</strong> Check out our <a href="${envConfig.get('FRONTEND_URL') || 'https://app.tws.example.com'}/docs" style="color: #667eea;">documentation</a> or 
              <a href="${envConfig.get('FRONTEND_URL') || 'https://app.tws.example.com'}/support" style="color: #667eea;">contact support</a>.
            </p>
          </div>
          
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
            This email was sent to ${user.email}. If you didn't create this account, please contact support immediately.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Teacher Notification - New Homework Submission
   */
  async sendTeacherHomeworkNotification(teacher, student, homework) {
    const subject = `New Homework Submission - ${student.firstName} ${student.lastName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #6366f1; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">📝 New Homework Submission</h2>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Dear ${teacher.firstName},</p>
          
          <p style="font-size: 14px; color: #6b7280;">
            A student has submitted homework that requires your review.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Submission Details:</h3>
            <p><strong>Student:</strong> ${student.firstName} ${student.lastName} (${student.studentId})</p>
            <p><strong>Assignment:</strong> ${homework.title}</p>
            <p><strong>Subject:</strong> ${homework.subjectId?.subjectName || 'N/A'}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${envConfig.get('FRONTEND_URL')}/teacher/homework" 
               style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Submission
            </a>
          </div>
        </div>
      </div>
    `;
    
    return await this.sendEmail(teacher.email, subject, html);
  }

  /**
   * Invoice overdue notification (FR18) – Finance, PM
   * Scheduler calls this; can also be used by NotificationService.
   */
  async sendOverdueInvoiceNotification(tenant, invoice) {
    const to = tenant.contactInfo?.email || tenant.contactInfo?.contactEmail;
    if (!to) {
      console.warn('Cannot send overdue invoice notification: no tenant contact email');
      return { success: false, error: 'No tenant email' };
    }
    const subject = `Overdue Invoice: ${invoice.invoiceNumber || invoice._id}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 16px; text-align: center;">
          <h2 style="color: white; margin: 0;">Invoice Overdue</h2>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="font-size: 14px; color: #374151;">Invoice <strong>${invoice.invoiceNumber || 'N/A'}</strong> is overdue.</p>
          <p style="font-size: 14px; color: #6b7280;">Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}. Please follow up with the client and update payment status.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">TWS ERP – ${tenant.name || 'Tenant'}</p>
        </div>
      </div>
    `;
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Usage alert (e.g. 90% of plan limit) – scheduler
   */
  async sendUsageAlert(tenant, metric, value, limit) {
    const to = tenant.contactInfo?.email || tenant.contactInfo?.contactEmail;
    if (!to) {
      console.warn('Cannot send usage alert: no tenant contact email');
      return { success: false, error: 'No tenant email' };
    }
    const pct = limit > 0 ? Math.round((value / limit) * 100) : 0;
    const subject = `Usage alert: ${metric} at ${pct}% of limit`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 16px; text-align: center;">
          <h2 style="color: white; margin: 0;">Usage Alert</h2>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="font-size: 14px; color: #374151;"><strong>${metric}</strong> is at ${pct}% of your plan limit (${value} / ${limit}).</p>
          <p style="font-size: 14px; color: #6b7280;">Consider upgrading or reducing usage to avoid hitting the limit.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">TWS ERP – ${tenant.name || 'Tenant'}</p>
        </div>
      </div>
    `;
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Payment reminder – tenant subscription past due (scheduler)
   */
  async sendPaymentReminder(tenant) {
    const to = tenant.contactInfo?.email || tenant.contactInfo?.contactEmail;
    if (!to) {
      console.warn('Cannot send payment reminder: no tenant contact email');
      return { success: false, error: 'No tenant email' };
    }
    const subject = 'Payment Reminder: Your subscription is past due';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 16px; text-align: center;">
          <h2 style="color: white; margin: 0;">Payment Past Due</h2>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="font-size: 14px; color: #374151;">Your subscription payment is past due. Please update your billing details to avoid service interruption.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">TWS ERP – ${tenant.name || 'Tenant'}</p>
        </div>
      </div>
    `;
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Trial expired – tenant suspended (scheduler)
   */
  async sendTrialExpiredNotification(tenant) {
    const to = tenant.contactInfo?.email || tenant.contactInfo?.contactEmail;
    if (!to) {
      console.warn('Cannot send trial-expired notification: no tenant contact email');
      return { success: false, error: 'No tenant email' };
    }
    const subject = 'Your trial has expired';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 16px; text-align: center;">
          <h2 style="color: white; margin: 0;">Trial Expired</h2>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="font-size: 14px; color: #374151;">Your trial period has ended and your account has been suspended. Subscribe to a plan to restore access.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">TWS ERP – ${tenant.name || 'Tenant'}</p>
        </div>
      </div>
    `;
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Trial expiring within 24 hours (scheduler)
   */
  async sendTrialExpiringNotification(tenant) {
    const to = tenant.contactInfo?.email || tenant.contactInfo?.contactEmail;
    if (!to) {
      console.warn('Cannot send trial-expiring notification: no tenant contact email');
      return { success: false, error: 'No tenant email' };
    }
    const subject = 'Your trial expires in 24 hours';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; padding: 16px; text-align: center;">
          <h2 style="color: white; margin: 0;">Trial Ending Soon</h2>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="font-size: 14px; color: #374151;">Your trial period ends in less than 24 hours. Subscribe to a plan now to avoid losing access.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">TWS ERP – ${tenant.name || 'Tenant'}</p>
        </div>
      </div>
    `;
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Employee portal invite email
   * @param {{ fullName: string, email: string }} invitee
   * @param {{ inviteLink: string, orgName: string, role: string, inviterName: string }} opts
   */
  async sendEmployeeInviteEmail(invitee, opts = {}) {
    const { inviteLink, orgName = 'your organisation', role = 'employee', inviterName = 'An admin' } = opts;
    const subject = `You've been invited to join ${orgName} on TWS`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">You're Invited!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <p style="font-size: 16px; color: #374151;">Hi ${invitee.fullName || invitee.email},</p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            ${inviterName} has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong> on the TWS ERP portal.
          </p>
          <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
            Click the button below to accept your invitation and set your password. This link expires in <strong>7 days</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}"
               style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 12px; color: #9ca3af;">
            Or copy this link into your browser:<br/>
            <a href="${inviteLink}" style="color: #667eea;">${inviteLink}</a>
          </p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
            If you did not expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </div>
    `;
    return this.sendEmail(invitee.email, subject, html);
  }
}

// Export singleton instance
module.exports = new EmailService();
