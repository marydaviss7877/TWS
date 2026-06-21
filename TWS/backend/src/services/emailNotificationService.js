const nodemailer = require('nodemailer');
const config = require('../config/environment');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const handlebars = require('handlebars');

class EmailNotificationService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.get('EMAIL_HOST'),
            port: config.get('EMAIL_PORT'),
            secure: config.get('EMAIL_PORT') === 465,
            auth: {
                user: config.get('EMAIL_USER'),
                pass: config.get('EMAIL_PASS')
            }
        });

        // Load email templates
        this.templates = {
            welcome: this.loadTemplate('welcome'),
            onboarding: this.loadTemplate('onboarding'),
            setupWizard: this.loadTemplate('setup-wizard')
        };
    }

    loadTemplate(templateName) {
        const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.hbs`);
        const templateContent = fs.readFileSync(templatePath, 'utf-8');
        return handlebars.compile(templateContent);
    }

    async sendWelcomeEmail(tenant, adminUser) {
        try {
            const emailContent = this.templates.welcome({
                companyName: tenant.companyName,
                adminName: adminUser.name,
                loginUrl: `${config.get('FRONTEND_URL')}/login`,
                supportEmail: config.get('SUPPORT_EMAIL')
            });

            await this.sendEmail({
                to: adminUser.email,
                subject: `Welcome to TWS ERP - ${tenant.companyName}`,
                html: emailContent
            });

            logger.info(`Welcome email sent to ${adminUser.email} for tenant ${tenant.companyName}`);
        } catch (error) {
            logger.error(`Failed to send welcome email to ${adminUser.email}: ${error.message}`);
            throw error;
        }
    }

    async sendOnboardingInstructions(tenant, adminUser) {
        try {
            const emailContent = this.templates.onboarding({
                companyName: tenant.companyName,
                adminName: adminUser.name,
                setupUrl: `${config.get('FRONTEND_URL')}/setup-wizard`,
                industry: tenant.industryType,
                modules: tenant.modules,
                supportEmail: config.get('SUPPORT_EMAIL')
            });

            await this.sendEmail({
                to: adminUser.email,
                subject: `Get Started with Your TWS ERP System - ${tenant.companyName}`,
                html: emailContent
            });

            logger.info(`Onboarding instructions sent to ${adminUser.email} for tenant ${tenant.companyName}`);
        } catch (error) {
            logger.error(`Failed to send onboarding instructions to ${adminUser.email}: ${error.message}`);
            throw error;
        }
    }

    async sendSetupWizardReminder(tenant, adminUser, completedSteps, nextStep) {
        try {
            const emailContent = this.templates.setupWizard({
                companyName: tenant.companyName,
                adminName: adminUser.name,
                setupUrl: `${config.get('FRONTEND_URL')}/setup-wizard`,
                completedSteps,
                nextStep,
                supportEmail: config.get('SUPPORT_EMAIL')
            });

            await this.sendEmail({
                to: adminUser.email,
                subject: `Complete Your TWS ERP Setup - ${nextStep.name}`,
                html: emailContent
            });

            logger.info(`Setup wizard reminder sent to ${adminUser.email} for tenant ${tenant.companyName}`);
        } catch (error) {
            logger.error(`Failed to send setup wizard reminder to ${adminUser.email}: ${error.message}`);
            throw error;
        }
    }

    async sendEmail({ to, subject, html }) {
        try {
            await this.transporter.sendMail({
                from: `"TWS ERP" <${config.get('EMAIL_FROM')}>`,
                to,
                subject,
                html
            });
        } catch (error) {
            logger.error(`Failed to send email to ${to}: ${error.message}`);
            throw error;
        }
    }
}

module.exports = new EmailNotificationService();