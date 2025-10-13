const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.isConfigured = false;
    
    // Check if email configuration is provided
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // Configure transporter - supports both Gmail and custom SMTP
      const emailConfig = {
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };

      // Check if using Gmail or custom SMTP
      if (process.env.EMAIL_USER.includes('@gmail.com')) {
        // Use Gmail service
        emailConfig.service = 'gmail';
      } else {
        // Use custom SMTP settings
        emailConfig.host = process.env.SMTP_HOST || 'smtp.gmail.com';
        emailConfig.port = process.env.SMTP_PORT || 587;
        emailConfig.secure = process.env.SMTP_SECURE === 'true' || false;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.isConfigured = true;
    } else {
      console.log('⚠️  Email service not configured. OTP codes will only be logged to console.');
      console.log('📧 To enable email sending, configure EMAIL_USER and EMAIL_PASS in your .env file.');
      this.transporter = null;
    }
  }

  async sendEmployerApprovalEmail(employerEmail, companyName) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@peso.gov.ph',
      to: employerEmail,
      subject: 'PESO - Employer Account Approved',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>Account Approved!</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Congratulations ${companyName ? companyName : ''}!</h2>
            
            <p>We're pleased to inform you that your employer account has been <strong>approved</strong> by our PESO administrators.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What's Next?</h3>
              <ul>
                <li>✅ You can now access your employer dashboard</li>
                <li>✅ Post job openings for job seekers</li>
                <li>✅ Review and manage job applications</li>
                <li>✅ Access all employer features</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/employer" 
                 style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
            
            <p>Thank you for choosing PESO for your recruitment needs. We look forward to helping you find the best talent!</p>
            
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
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Approval email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending approval email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmployerRejectionEmail(employerEmail, companyName, reason) {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@peso.gov.ph',
      to: employerEmail,
      subject: 'PESO - Employer Account Application Update',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1>Application Update</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${companyName ? companyName : 'Applicant'},</h2>
            
            <p>Thank you for your interest in registering as an employer with PESO. After careful review of your application, we regret to inform you that your employer account application has not been approved at this time.</p>
            
            ${reason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Reason for Rejection:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What You Can Do:</h3>
              <ul>
                <li>📧 Contact our support team for clarification</li>
                <li>📋 Address the issues mentioned above</li>
                <li>🔄 Reapply with updated information/documents</li>
                <li>📞 Schedule a consultation with our team</li>
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
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Rejection email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending rejection email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendOTPEmail(email, otp, userRole = 'user') {
    // If email service is not configured, just return success (OTP will be logged to console)
    if (!this.isConfigured) {
      console.log(`📧 Email service not configured. OTP for ${email}: ${otp}`);
      return { success: true, message: 'Email service not configured - OTP logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@peso.gov.ph',
      to: email,
      subject: 'PESO - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
            <h1>Email Verification</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Verify Your Email Address</h2>
            
            <p>Thank you for registering with PESO! To complete your ${userRole} account setup, please verify your email address using the code below:</p>
            
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
                <li>🔒 Never share this code with anyone</li>
                <li>🚫 PESO staff will never ask for your verification code</li>
                <li>⚠️ If you didn't request this code, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you're having trouble with verification, you can request a new code from the verification page.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              This is an automated message from PESO. Please do not reply to this email.<br>
              If you need assistance, please contact our support team.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}:`, result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Error sending OTP email to ${email}:`, error);
      return { success: false, error: error.message };
    }
  }

  async sendJobRemovalEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`📧 Email service not configured. Job removal notification for ${employerEmail}: Job "${jobTitle}" has been removed.`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@peso.gov.ph',
      to: employerEmail,
      subject: 'PESO - Job Posting Removed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1>Job Posting Removed</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${companyName || 'Employer'},</h2>
            
            <p>We are writing to inform you that your job posting has been removed from the PESO platform by our administrative team.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <h3 style="color: #dc2626; margin-top: 0;">Removed Job Posting:</h3>
              <p style="margin-bottom: 0;"><strong>"${jobTitle}"</strong></p>
            </div>

            ${reason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Reason for Removal:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Common Reasons for Removal:</h3>
                <ul style="margin-bottom: 0;">
                  <li>Job posting violates platform policies</li>
                  <li>Inappropriate or misleading content</li>
                  <li>Job has been inactive for an extended period</li>
                  <li>Duplicate posting or outdated information</li>
                  <li>Legal compliance requirements</li>
                </ul>
              </div>
            `}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What You Can Do:</h3>
              <ul>
                <li>📧 Contact our support team for clarification</li>
                <li>📋 Review our posting guidelines</li>
                <li>🔄 Create a new job posting that complies with our policies</li>
                <li>📞 Schedule a consultation with our team</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/employer" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
            
            <p>We appreciate your understanding and encourage you to continue using our platform for your recruitment needs while following our community guidelines.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For assistance or to appeal this decision, please contact our support team.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Job removal email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending job removal email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendJobPauseEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`📧 Email service not configured. Job pause notification for ${employerEmail}: Job "${jobTitle}" has been paused.`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@peso.gov.ph',
      to: employerEmail,
      subject: 'PESO - Job Posting Paused',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
            <h1>Job Posting Paused</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${companyName || 'Employer'},</h2>
            
            <p>We are writing to inform you that your job posting has been temporarily paused by our administrative team.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #d97706; margin-top: 0;">Paused Job Posting:</h3>
              <p style="margin-bottom: 0;"><strong>"${jobTitle}"</strong></p>
            </div>

            ${reason ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #d97706; margin-top: 0;">Reason for Pause:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #d97706; margin-top: 0;">Common Reasons for Pause:</h3>
                <ul style="margin-bottom: 0;">
                  <li>Job posting requires review or updates</li>
                  <li>Temporary halt in hiring process</li>
                  <li>Need for additional information or clarification</li>
                  <li>Seasonal hiring adjustments</li>
                </ul>
              </div>
            `}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What This Means:</h3>
              <ul>
                <li>📋 Your job posting is temporarily hidden from jobseekers</li>
                <li>🔄 You can still manage existing applications</li>
                <li>✅ The posting can be reactivated once issues are resolved</li>
                <li>📞 Contact our team for assistance or clarification</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/employer" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
            
            <p>This is a temporary measure and your job posting can be reactivated once any concerns are addressed.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For assistance or questions, please contact our support team.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Job pause email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending job pause email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendJobFlagEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`📧 Email service not configured. Job flag notification for ${employerEmail}: Job "${jobTitle}" has been flagged.`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@peso.gov.ph',
      to: employerEmail,
      subject: 'PESO - Job Posting Flagged for Review',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>Job Posting Flagged</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${companyName || 'Employer'},</h2>
            
            <p>We are writing to inform you that your job posting has been flagged for review by our administrative team.</p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin-top: 0;">Flagged Job Posting:</h3>
              <p style="margin-bottom: 0;"><strong>"${jobTitle}"</strong></p>
            </div>

            ${reason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Reason for Flag:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Common Reasons for Flagging:</h3>
                <ul style="margin-bottom: 0;">
                  <li>Potential policy violations requiring review</li>
                  <li>Suspicious or misleading content</li>
                  <li>Reported by users or automated systems</li>
                  <li>Requires verification of job details</li>
                </ul>
              </div>
            `}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What This Means:</h3>
              <ul>
                <li>🔍 Your job posting is under administrative review</li>
                <li>⏸️ The posting may be temporarily hidden during review</li>
                <li>📞 Our team may contact you for additional information</li>
                <li>✅ The posting will be restored if no issues are found</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/employer" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Access Your Dashboard
              </a>
            </div>
            
            <p>We appreciate your cooperation during this review process. Most flagged items are resolved quickly once reviewed.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For questions about this flag, please contact our support team.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Job flag email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Error sending job flag email:', error);
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();
