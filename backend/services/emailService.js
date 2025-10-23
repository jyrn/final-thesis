const nodemailer = require('nodemailer');
const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.isConfigured = false;
    
    console.log('🔧 Initializing Email Service with Resend...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
    
    // Check if Resend API key is available for production
    if (process.env.RESEND_API_KEY && process.env.NODE_ENV === 'production') {
      console.log('📧 Using Resend HTTP API for production email service');
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.isConfigured = true;
      this.useResend = true;
      console.log('✅ Resend email service configured successfully');
      return;
    }
    
    // Fallback to SMTP for development
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Configure transporter - supports both Gmail and custom SMTP
      const emailConfig = {
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };

      // Use Gmail service for better compatibility
      emailConfig.service = 'gmail';
      
      console.log('📧 Using Gmail service for:', process.env.EMAIL_USER);

      try {
        // Disable Brevo temporarily - revert to Gmail with different port
        if (false && process.env.BREVO_API_KEY && process.env.NODE_ENV === 'production') {
          console.log('📧 Using Brevo SMTP for production email service');
          console.log('📧 Brevo Login:', process.env.BREVO_LOGIN || process.env.EMAIL_USER);
          console.log('📧 Brevo API Key exists:', !!process.env.BREVO_API_KEY);
          
          this.transporter = nodemailer.createTransporter({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.BREVO_LOGIN || process.env.EMAIL_USER,
              pass: process.env.BREVO_API_KEY
            }
          });
        } else if (process.env.NODE_ENV === 'production') {
          // Try Gmail with port 465 for production
          console.log('📧 Using Gmail SMTP (Port 465) for production');
          this.transporter = nodemailer.createTransporter({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });
        } else {
          // Fallback to Gmail for development
          console.log('📧 Using Gmail for development email service');
          this.transporter = nodemailer.createTransporter({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });
        }
        this.isConfigured = true;
        console.log('✅ Email service configured successfully');
      } catch (error) {
        console.error('❌ Failed to create email transporter:', error.message);
        this.transporter = null;
        this.isConfigured = false;
      }
    } else {
      console.log('⚠️ Email service not configured - missing EMAIL_USER or EMAIL_PASS');
      this.transporter = null;
    }
  }

  async sendEmployerApprovalEmail(employerEmail, companyName) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: employerEmail,
      subject: 'SkillSync - Employer Account Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>Account Approved!</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Congratulations ${companyName ? companyName : ''}!</h2>
            
            <p>We're pleased to inform you that your employer account has been <strong>approved</strong> by our SkillSync administrators.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What's Next?</h3>
              <ul>
                <li> You can now access your employer dashboard</li>
                <li> Post job openings for job seekers</li>
                <li> Review and manage job applications</li>
                <li> Access all employer features</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/employer" 
                 style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
            
            <p>Thank you for choosing SkillSync for your recruitment needs. We look forward to helping you find the best talent!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              If you have any questions, please contact our support team.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <onboarding@resend.dev>',
          to: [mailOptions.to],
          subject: mailOptions.subject,
          html: mailOptions.html
        });
        return { success: true, messageId: result.data?.id };
      } else {
        if (!this.transporter) {
          return { success: false, error: 'Email transporter not configured' };
        }
        const result = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendEmployerRejectionEmail(employerEmail, companyName, reason) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: employerEmail,
      subject: 'SkillSync - Employer Account Application Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1>Application Update</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${companyName ? companyName : 'Applicant'},</h2>
            
            <p>Thank you for your interest in registering as an employer with SkillSync. After careful review of your application, we regret to inform you that your employer account application has not been approved at this time.</p>
            
            ${reason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Reason for Rejection:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What You Can Do:</h3>
              <ul>
                <li> Contact our support team for clarification</li>
                <li> Address the issues mentioned above</li>
                <li> Reapply with updated information/documents</li>
                <li> Schedule a consultation with our team</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/employer" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Try Again
              </a>
            </div>
            
            <p>We appreciate your understanding and encourage you to address the concerns and reapply. Our team is here to help you through the process.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For assistance, please contact our support team at support@peso.gov.ph<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <onboarding@resend.dev>',
          to: [mailOptions.to],
          subject: mailOptions.subject,
          html: mailOptions.html
        });
        return { success: true, messageId: result.data?.id };
      } else {
        if (!this.transporter) {
          return { success: false, error: 'Email transporter not configured' };
        }
        const result = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: result.messageId };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendOTPEmail(email, otp, userRole = 'user') {
    console.log(`📧 Attempting to send OTP to ${email}, Service configured: ${this.isConfigured}`);
    
    // Check if email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log('[EMAIL NOT CONFIGURED] OTP for', email + ':', otp);
      return { success: true, message: 'Email service not configured - OTP logged to console' };
    }

    // If using Resend but not configured properly
    if (this.useResend && !this.resend) {
      console.error('❌ Resend is enabled but not properly configured');
      return { success: false, error: 'Resend service not properly configured' };
    }

    console.log('🔍 DEBUG: Creating mailOptions...');
    
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER || 'noreply@skillsync.com',
        to: email,
        subject: 'SkillSync - Email Verification Code',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
            <h1>Email Verification</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Verify Your Email Address</h2>
            
            <p>Thank you for registering with SkillSync! To complete your ${userRole} account setup, please verify your email address using the code below:</p>
            
            <div style="background-color: white; padding: 30px; border-radius: 8px; margin: 30px 0; text-align: center; border: 2px solid #3b82f6;">
              <h2 style="color: #3b82f6; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                ${otp}
              </h2>
              <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">
                Enter this 6-digit code in the verification page
              </p>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>⏰ Important:</strong> This code will expire in 10 minutes for security reasons.
              </p>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Security Tips:</h3>
              <ul>
                <li> Never share this code with anyone</li>
                <li> SkillSync staff will never ask for your verification code</li>
                <li> If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you're having trouble with verification, you can request a new code from the verification page.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              This is an automated message from SkillSync. Please do not reply to this email.<br>
              If you need assistance, please contact our support team.
            </p>
          </div>
        </div>
      `
    };

    console.log(`📤 Sending OTP email to ${email}...`);
    console.log(`🔍 DEBUG: useResend=${this.useResend}, resend=${!!this.resend}, transporter=${!!this.transporter}`);
    
    if (this.useResend) {
      console.log('📧 Using Resend HTTP API - PRODUCTION PATH');
      if (!this.resend) {
        console.error('❌ CRITICAL: Resend object is null/undefined!');
        return { success: false, error: 'Resend service not initialized' };
      }
      const result = await this.resend.emails.send({
        from: 'SkillSync <onboarding@resend.dev>',
        to: [email],
        subject: mailOptions.subject,
        html: mailOptions.html
      });
      
      // Check if Resend returned an error in the response
      if (result.error) {
        console.error('❌ Resend API Error:', result.error);
        if (result.error.name === 'validation_error') {
          console.log('🔍 RESEND SANDBOX MODE: Can only send to verified email addresses');
          console.log('📧 For production, verify a domain at resend.com/domains');
          console.log(`📝 OTP for ${email}: ${otp} (logged due to sandbox limitation)`);
          return { 
            success: true, 
            message: 'Email service in sandbox mode - OTP logged to console',
            sandboxMode: true 
          };
        }
        return { success: false, error: result.error.message };
      }
      
      console.log(`✅ OTP email sent successfully via Resend to ${email}, ID: ${result.data?.id}`);
      return { success: true, messageId: result.data?.id };
    } else {
      console.log('📧 Using SMTP fallback - DEVELOPMENT PATH');
      // Check if transporter exists for SMTP fallback
      if (!this.transporter) {
        console.error('❌ No transporter configured for SMTP fallback');
        return { success: false, error: 'Email transporter not configured' };
      }
      console.log(`📧 Using transporter configured for: ${this.transporter.options?.service || this.transporter.options?.host}`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}, MessageID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    }
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
      console.error(`❌ Error code:`, error.code);
      console.error(`❌ Error details:`, error);
      console.error(`❌ Stack trace:`, error.stack);
      
      // Handle Resend validation errors specifically
      if (error.message && error.message.includes('validation_error')) {
        console.log('🔍 RESEND SANDBOX MODE: Can only send to verified email addresses');
        console.log('📧 For production, verify a domain at resend.com/domains');
        console.log(`📝 OTP for ${email}: ${otp} (logged due to sandbox limitation)`);
        return { 
          success: true, 
          message: 'Email service in sandbox mode - OTP logged to console',
          sandboxMode: true 
        };
      }
      
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      if (this.transporter) {
        await this.transporter.verify();
      }
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new EmailService();
