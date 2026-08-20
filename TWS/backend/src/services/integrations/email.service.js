const { Resend } = require('resend');
const envConfig = require('../../config/environment-validator');
const { getSanitizedBaseDomain } = require('../../utils/baseDomain');
const { renderEmailShell, renderButton, renderCard, renderRow, renderNotice, renderBadge, COLORS } = require('./emailTemplates');

/**
 * Email Service for Education System
 * Handles all email notifications for students, teachers, and parents
 */

class EmailService {
  constructor() {
    // Secrets read directly from process.env, never through client-facing config.
    this.from = process.env.EMAIL_FROM || 'noreply@updates.housesbase.com';
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
   * Password Reset Email
   */
  async sendPasswordResetEmail(user, tempPassword) {
    const subject = 'Password Reset - Your Temporary Password';
    const body = `
      <p style="font-size:16px;color:${COLORS.ink};margin:0 0 16px;">Dear ${user.fullName || user.firstName || 'User'},</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin:0 0 8px;">
        You requested a password reset for your account. A temporary password has been generated for you.
      </p>
      ${renderCard(`
        <h3 style="color:${COLORS.ink};margin:0 0 12px;font-size:15px;">Your temporary password</h3>
        <p style="margin:0;font-size:20px;font-weight:700;color:${COLORS.navy};background:#FFFFFF;border:1px solid ${COLORS.border};padding:14px;border-radius:6px;text-align:center;letter-spacing:3px;">
          ${tempPassword}
        </p>
      `)}
      ${renderNotice('<strong>Important:</strong> Please login with this temporary password and change it immediately for security.', 'warning')}
      ${renderButton({ href: `${envConfig.get('FRONTEND_URL')}/login`, label: 'Login to Portal' })}
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">
        If you did not request this password reset, please contact your administrator immediately.
      </p>
    `;
    const html = renderEmailShell({ preheader: 'Your temporary password is ready.', bodyHtml: body });

    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Tenant Signup Welcome Email
   */
  async sendTenantWelcomeEmail(user, tenant, subdomain) {
    const subject = `Welcome to ${tenant.name || tenant.organizationName} - Your HousesBase workspace is ready!`;
    // The tenant slug lives in the hostname in production. Build this link from
    // the provisioned subdomain instead of a central frontend URL so welcome
    // emails cannot accidentally point at a placeholder or duplicate the slug.
    const tenantHost = String(subdomain || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
    const tenantOrigin = `https://${tenantHost}`;
    const body = `
      <p style="font-size:16px;color:${COLORS.ink};margin:0 0 16px;">Dear ${user.fullName},</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin:0 0 8px;">
        Congratulations! Your HousesBase tenant has been successfully created and provisioned. You're all set to start managing your business operations.
      </p>
      ${renderCard(`
        <h3 style="color:${COLORS.ink};margin:0 0 12px;font-size:15px;">Your tenant details</h3>
        ${renderRow('Organization', tenant.name || tenant.organizationName)}
        ${renderRow('Subdomain', subdomain)}
        ${renderRow('Industry', tenant.erpCategory || tenant.industry || 'Business')}
        ${renderRow('Status', '<span style="color:#047857;font-weight:600;">Active</span>')}
      `)}
      <div style="border-left:3px solid ${COLORS.navy};background:${COLORS.panel};padding:18px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
        <h3 style="color:${COLORS.navy};margin:0 0 10px;font-size:14px;">Quick start guide</h3>
        <ol style="color:${COLORS.ink};font-size:13px;line-height:1.8;margin:0;padding-left:18px;">
          <li>Complete your company profile and add your logo</li>
          <li>Configure your chart of accounts</li>
          <li>Invite your team members</li>
          <li>Set up approval workflows</li>
          <li>Review security settings and enable MFA</li>
        </ol>
      </div>
      ${renderButton({ href: `${tenantOrigin}/onboarding`, label: 'Complete Your Setup' })}
      <p style="font-size:12px;color:${COLORS.muted};margin:20px 0 0;">
        <strong>Need help?</strong> <a href="mailto:hello@housesbase.com" style="color:${COLORS.navy};">Contact support</a>.
      </p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:20px;">
        This email was sent to ${user.email}. If you didn't create this account, please contact support immediately.
      </p>
    `;
    const html = renderEmailShell({ preheader: 'Your HousesBase tenant is ready to go.', bodyHtml: body });

    return await this.sendEmail(user.email, subject, html);
  }

  /**
   * Workspace Lookup Email
   * Sent when a user submits their email on the root-domain "find my workspace"
   * page. Purely informational — contains a link to their org's subdomain,
   * no login token or auth material.
   */
  async sendWorkspaceLookupEmail(user, org) {
    const subject = 'Your HousesBase workspace';
    const baseDomain = getSanitizedBaseDomain();
    const workspaceUrl = `https://${org.slug}.${baseDomain}/login`;
    const body = `
      <p style="font-size:16px;color:${COLORS.ink};margin:0 0 16px;">Dear ${user.fullName || 'there'},</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin:0 0 8px;">
        Here's the link to your organization's workspace on HousesBase:
      </p>
      ${renderCard(renderRow('Organization', org.name))}
      ${renderButton({ href: workspaceUrl, label: 'Go to Your Workspace' })}
      <p style="font-size:12px;color:${COLORS.faint};">
        Or copy this link into your browser:<br/>
        <a href="${workspaceUrl}" style="color:${COLORS.navy};">${workspaceUrl}</a>
      </p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:20px;">
        This email was sent to ${user.email} because someone requested this workspace link. If that
        wasn't you, you can safely ignore this email.
      </p>
    `;
    const html = renderEmailShell({ preheader: `The link to your ${org.name} workspace.`, bodyHtml: body });

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
    const body = `
      <p style="margin:0 0 14px;">${renderBadge('Invoice overdue', 'danger')}</p>
      <p style="font-size:15px;color:${COLORS.ink};margin:0 0 8px;">Invoice <strong>${invoice.invoiceNumber || 'N/A'}</strong> is overdue.</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;">Due date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}. Please follow up with the client and update payment status.</p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">HousesBase – ${tenant.name || 'Tenant'}</p>
    `;
    const html = renderEmailShell({ preheader: `Invoice ${invoice.invoiceNumber || ''} is overdue.`, bodyHtml: body });
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
    const body = `
      <p style="margin:0 0 14px;">${renderBadge('Usage alert', 'warning')}</p>
      <p style="font-size:15px;color:${COLORS.ink};margin:0 0 8px;"><strong>${metric}</strong> is at ${pct}% of your plan limit (${value} / ${limit}).</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;">Consider upgrading or reducing usage to avoid hitting the limit.</p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">HousesBase – ${tenant.name || 'Tenant'}</p>
    `;
    const html = renderEmailShell({ preheader: `${metric} is at ${pct}% of your plan limit.`, bodyHtml: body });
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
    const body = `
      <p style="margin:0 0 14px;">${renderBadge('Payment past due', 'danger')}</p>
      <p style="font-size:15px;color:${COLORS.ink};line-height:1.6;">Your subscription payment is past due. Please update your billing details to avoid service interruption.</p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">HousesBase – ${tenant.name || 'Tenant'}</p>
    `;
    const html = renderEmailShell({ preheader: 'Your subscription payment is past due.', bodyHtml: body });
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
    const body = `
      <p style="margin:0 0 14px;">${renderBadge('Trial expired', 'danger')}</p>
      <p style="font-size:15px;color:${COLORS.ink};line-height:1.6;">Your trial period has ended and your account has been suspended. Subscribe to a plan to restore access.</p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">HousesBase – ${tenant.name || 'Tenant'}</p>
    `;
    const html = renderEmailShell({ preheader: 'Your trial has ended and your account is suspended.', bodyHtml: body });
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
    const body = `
      <p style="margin:0 0 14px;">${renderBadge('Trial ending soon', 'warning')}</p>
      <p style="font-size:15px;color:${COLORS.ink};line-height:1.6;">Your trial period ends in less than 24 hours. Subscribe to a plan now to avoid losing access.</p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:24px;">HousesBase – ${tenant.name || 'Tenant'}</p>
    `;
    const html = renderEmailShell({ preheader: 'Your trial ends in less than 24 hours.', bodyHtml: body });
    return await this.sendEmail(to, subject, html);
  }

  /**
   * Employee portal invite email
   * @param {{ fullName: string, email: string }} invitee
   * @param {{ inviteLink: string, orgName: string, role: string, inviterName: string }} opts
   */
  async sendEmployeeInviteEmail(invitee, opts = {}) {
    const { inviteLink, orgName = 'your organisation', role = 'employee', inviterName = 'An admin' } = opts;
    const subject = `You've been invited to join ${orgName} on HousesBase`;
    const body = `
      <p style="font-size:16px;color:${COLORS.ink};margin:0 0 16px;">Hi ${invitee.fullName || invitee.email},</p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;margin:0 0 12px;">
        ${inviterName} has invited you to join <strong style="color:${COLORS.ink};">${orgName}</strong> as a <strong style="color:${COLORS.ink};">${role}</strong> on HousesBase.
      </p>
      <p style="font-size:14px;color:${COLORS.muted};line-height:1.6;">
        Click the button below to accept your invitation and set your password. This link expires in <strong style="color:${COLORS.ink};">7 days</strong>.
      </p>
      ${renderButton({ href: inviteLink, label: 'Accept Invitation' })}
      <p style="font-size:12px;color:${COLORS.faint};">
        Or copy this link into your browser:<br/>
        <a href="${inviteLink}" style="color:${COLORS.navy};">${inviteLink}</a>
      </p>
      <p style="font-size:12px;color:${COLORS.faint};margin-top:20px;">
        If you did not expect this invitation, you can safely ignore this email.
      </p>
    `;
    const html = renderEmailShell({ preheader: `${inviterName} invited you to join ${orgName}.`, bodyHtml: body });
    return this.sendEmail(invitee.email, subject, html);
  }
}

// Export singleton instance
module.exports = new EmailService();
