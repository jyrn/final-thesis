const nodemailer = require('nodemailer');
const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.useResend = false;
    
    console.log('🔧 Initializing Email Service...');
    console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'NOT SET');
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'SET' : 'NOT SET');
    
    // Check if Resend is available (preferred for production)
    if (process.env.RESEND_API_KEY) {
      try {
        this.resend = new Resend(process.env.RESEND_API_KEY);
        this.useResend = true;
        this.isConfigured = true;
        console.log('✅ Resend email service configured successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Resend:', error.message);
      }
    }
    
    // Fallback to Gmail if Resend not available
    if (!this.isConfigured && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
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
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          pool: true,
          maxConnections: 1,
          rateDelta: 20000,
          rateLimit: 5
        });
        this.isConfigured = true;
        console.log('✅ Email service configured successfully (no verification)');
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
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
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
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
    }
  }

  async sendOTPEmail(email, otp, userRole = 'user') {
    console.log(`📧 Attempting to send OTP to ${email}, Service configured: ${this.isConfigured}, Using Resend: ${this.useResend}`);
    
    // If email service is not configured, just return success (OTP will be logged to console)
    if (!this.isConfigured) {
      console.log(`[EMAIL NOT CONFIGURED] OTP for ${email}: ${otp}`);
      return { success: true, message: 'Email service not configured - OTP logged to console' };
    }

    // Use Resend if available
    if (this.useResend) {
      return await this.sendOTPWithResend(email, otp, userRole);
    }

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

    try {
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
    }
  }

  async sendJobRemovalEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: employerEmail,
      subject: 'SkillSync - Job Posting Removed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1>Job Posting Removed</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${companyName || 'Employer'},</h2>
            
            <p>We are writing to inform you that your job posting has been removed from the SkillSync platform by our administrative team.</p>
            
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
                <li> Contact our support team for clarification</li>
                <li> Review our posting guidelines</li>
                <li> Create a new job posting that complies with our policies</li>
                <li> Schedule a consultation with our team</li>
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
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
    }
  }

  async sendJobPauseEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: employerEmail,
      subject: 'SkillSync - Job Posting Paused',
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
                <li> Your job posting is temporarily hidden from jobseekers</li>
                <li> You can still manage existing applications</li>
                <li> The posting can be reactivated once issues are resolved</li>
                <li>� Contact our team for assistance or clarification</li>
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
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
    }
  }

  async sendJobFlagEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: employerEmail,
      subject: 'SkillSync - Job Posting Flagged for Review',
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
                <li> Your job posting is under administrative review</li>
                <li> The posting may be temporarily hidden during review</li>
                <li> Our team may contact you for additional information</li>
                <li> The posting will be restored if no issues are found</li>
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
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
    }
  }

  async sendJobseekerSuspensionEmail(jobseekerEmail, jobseekerName, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: jobseekerEmail,
      subject: 'Account Suspended Due to Inactivity - Reactivate by Logging In',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">SkillSync Job Portal</h1>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="color: #856404; margin: 0 0 15px 0;">Account Suspended Due to Inactivity</h2>
            <p style="color: #856404; margin: 0;">Your SkillSync job portal account has been suspended due to extended inactivity.</p>
          </div>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Hello ${jobseekerName},</h3>
            
            <p style="color: #666; line-height: 1.6;">
              Your account has been automatically suspended because you haven't logged in for over a year. This is part of our routine maintenance to keep our database current and secure.
            </p>
            
            <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 15px 0;">
              <h4 style="margin: 0 0 10px 0; color: #0c5460;">Easy Reactivation Process</h4>
              <p style="margin: 0; color: #0c5460;">
                <strong>Simply log in to your account to reactivate it immediately!</strong><br>
                No additional steps or verification required.
              </p>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/jobseeker" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Log In to Reactivate Account
              </a>
            </div>
            
            <div style="background-color: #fff3cd; border-radius: 6px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404;">
                <strong> Important:</strong> If you don't log in within 30 days from today, 
                your account will be permanently removed to maintain database hygiene.
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6;">
              We understand that job searching can be seasonal, and we want to make sure your account 
              is available when you need it. Simply logging in will restore full access to all your 
              saved jobs, applications, and profile information.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              This is an automated message from the SkillSync Job Portal System.<br>
              If you have questions, contact us at support@peso.com
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);      return { success: true, messageId: result.messageId };
    } catch (error) {      return { success: false, error: error.message };
    }
  }

  async sendJobseekerRemovalEmail(jobseekerEmail, jobseekerName, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: jobseekerEmail,
      subject: 'SkillSync - Account Removed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
            <h1>Account Removed</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${jobseekerName || 'User'},</h2>
            
            <p>We are writing to inform you that your SkillSync jobseeker account has been permanently removed from our system by our administrative team.</p>
            
            ${reason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Reason for Removal:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : `
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Common Reasons for Account Removal:</h3>
                <ul style="margin-bottom: 0;">
                  <li>Account inactive for extended period without response to reactivation requests</li>
                  <li>Fraudulent, misleading, or suspicious activity detected</li>
                  <li>Repeated violations of platform policies despite warnings</li>
                  <li>Duplicate account identified and merged/removed for consistency</li>
                </ul>
              </div>
            `}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What This Means:</h3>
              <ul>
                <li> Your account and all associated data have been permanently deleted</li>
                <li> All job applications and saved jobs have been removed</li>
                <li> You will no longer be able to access your previous account</li>
                <li> You will no longer receive notifications from our platform</li>
              </ul>
            </div>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Want to Continue Using SkillSync?</h3>
              <p style="margin-bottom: 0;">
                If you believe this removal was made in error or if you'd like to create a new account, please contact our support team. You may be eligible to register again with updated information.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/jobseeker" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Create New Account
              </a>
            </div>
            
            <p>We appreciate your understanding. If you have any questions about this decision or need assistance, please don't hesitate to contact our support team.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For questions or to appeal this decision, please contact our support team at support@peso.gov.ph<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      console.log(`📤 Sending OTP email to ${email}...`);
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}, MessageID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  async sendJobseekerCompleteRemovalEmail(jobseekerEmail, jobseekerName, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: jobseekerEmail,
      subject: 'SkillSync - Account Permanently Deleted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>Account Permanently Deleted</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${jobseekerName || 'User'},</h2>
            
            <p>We are writing to inform you that your SkillSync jobseeker account has been <strong>permanently and completely deleted</strong> from our system, including all associated data from both our database and authentication system.</p>
            
            ${reason ? `
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin-top: 0;">Reason for Complete Deletion:</h3>
                <p style="margin-bottom: 0;">${reason}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>What Has Been Permanently Deleted:</h3>
              <ul>
                <li> Your user account and login credentials</li>
                <li> Your complete jobseeker profile and resume data</li>
                <li> All job applications and application history</li>
                <li> All saved jobs and preferences</li>
                <li> Your authentication data from Firebase</li>
                <li> All associated analytics and activity data</li>
              </ul>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;"> Important Notice</h3>
              <p style="margin-bottom: 0;">
                This deletion is <strong>irreversible</strong>. All your data has been permanently removed from our systems. 
                You will now be able to register again with the same email address if you choose to do so, 
                as your previous account no longer exists in our system.
              </p>
            </div>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Want to Use SkillSync Again?</h3>
              <p style="margin-bottom: 0;">
                Since your account has been completely removed, you can now register as a new user with the same email address. 
                You will need to create a fresh profile and upload your resume again.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/jobseeker" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Register New Account
              </a>
            </div>
            
            <p>If you have any questions about this complete deletion or need assistance with creating a new account, please contact our support team.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For questions or assistance, please contact our support team at support@peso.gov.ph<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendAccountDeactivationEmail(userEmail, userName) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`Account deactivation email would be sent to: ${userEmail}`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: userEmail,
      subject: 'SkillSync - Account Deactivated',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
            <h1>Account Deactivated</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${userName || 'User'},</h2>
            
            <p>Your SkillSync jobseeker account has been temporarily deactivated as requested.</p>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h3 style="color: #d97706; margin-top: 0;">What This Means:</h3>
              <ul style="margin-bottom: 0;">
                <li>Your profile is temporarily hidden from employers</li>
                <li>You won't receive job match notifications</li>
                <li>Your applications remain active but you can't apply to new jobs</li>
                <li>Your data is safely stored and can be restored anytime</li>
              </ul>
            </div>
            
            <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin: 20px 0;">
              <h3 style="color: #0c5460; margin-top: 0;">Easy Reactivation</h3>
              <p style="margin-bottom: 0;">
                <strong>Simply sign in to your account to reactivate it immediately!</strong><br>
                All your profile data, saved jobs, and applications will be restored.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/jobseeker" 
                 style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reactivate Account
              </a>
            </div>
            
            <p>We understand that job searching can be seasonal. Your account will be ready whenever you need it.</p>
            
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
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendAccountDeletionEmail(userEmail, userName) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`Account deletion email would be sent to: ${userEmail}`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: userEmail,
      subject: 'SkillSync - Account Permanently Deleted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>Account Permanently Deleted</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Dear ${userName || 'User'},</h2>
            
            <p>Your SkillSync jobseeker account has been permanently deleted from our system as requested.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">What Has Been Permanently Deleted:</h3>
              <ul style="margin-bottom: 0;">
                <li>Your complete user account and login credentials</li>
                <li>Your jobseeker profile and resume data</li>
                <li>All job applications and application history</li>
                <li>All saved jobs and preferences</li>
                <li>Your authentication data</li>
              </ul>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">⚠️ Important Notice</h3>
              <p style="margin-bottom: 0;">
                This deletion is <strong>irreversible</strong>. All your data has been permanently removed from our systems. 
                You can now register again with the same email address if you choose to do so.
              </p>
            </div>
            
            <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Want to Use SkillSync Again?</h3>
              <p style="margin-bottom: 0;">
                Since your account has been completely removed, you can register as a new user with the same email address. 
                You will need to create a fresh profile and upload your resume again.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/jobseeker" 
                 style="background-color: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Register New Account
              </a>
            </div>
            
            <p>Thank you for using SkillSync. If you have any questions, please contact our support team.</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              For questions or assistance, please contact our support team.<br>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendInterviewInvitationEmail(applicantEmail, applicantName, jobTitle, companyName, customMessage = null, interviewDetails = {}, employerEmail = null) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log('Email service not configured - Interview invitation would be sent to:', applicantEmail);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const {
      date = 'To be scheduled',
      time = 'To be confirmed',
      location = 'To be confirmed',
      contactPerson = '',
      contactEmail = '',
      contactPhone = '',
      whatToBring = '',
      dressCode = '',
      additionalNotes = '',
      nextSteps = ''
    } = interviewDetails;
    
    // Format date if provided
    const formattedDate = date && date !== 'To be scheduled' 
      ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : date;
    
    // Format time if provided (convert 24h to 12h format)
    const formattedTime = time && time !== 'To be confirmed'
      ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : time;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: applicantEmail,
      bcc: employerEmail || undefined, // Add employer email as BCC
      replyTo: employerEmail || contactEmail || undefined, // Set reply-to as employer or contact email
      subject: `Interview Invitation - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>Interview Invitation</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Congratulations ${applicantName}!</h2>
            
            <p>We are pleased to inform you that you have been selected for an interview for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
            
            ${customMessage ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #059669; margin-top: 0;">Message from ${companyName}:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${customMessage}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669; margin-top: 0;">Interview Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Position:</strong></td>
                  <td style="padding: 8px 0;">${jobTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Company:</strong></td>
                  <td style="padding: 8px 0;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
                  <td style="padding: 8px 0;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
                  <td style="padding: 8px 0;">${location}</td>
                </tr>
                ${contactPerson ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Person:</strong></td>
                  <td style="padding: 8px 0;">${contactPerson}</td>
                </tr>
                ` : ''}
                ${contactEmail ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Email:</strong></td>
                  <td style="padding: 8px 0;">${contactEmail}</td>
                </tr>
                ` : ''}
                ${contactPhone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Phone:</strong></td>
                  <td style="padding: 8px 0;">${contactPhone}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${whatToBring ? `
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">What to Bring:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #065f46;">${whatToBring}</p>
              </div>
            ` : `
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">What to Bring:</h3>
                <ul style="margin-bottom: 0; color: #065f46;">
                  <li>Updated resume/CV</li>
                  <li>Valid government-issued ID</li>
                  <li>Portfolio or work samples (if applicable)</li>
                  <li>Any relevant certificates or credentials</li>
                </ul>
              </div>
            `}
            
            ${dressCode ? `
              <div style="background-color: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
                <h3 style="color: #3730a3; margin-top: 0;">Dress Code:</h3>
                <p style="margin-bottom: 0; color: #3730a3;">${dressCode}</p>
              </div>
            ` : ''}
            
            ${additionalNotes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-top: 0;">Additional Information:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #92400e;">${additionalNotes}</p>
              </div>
            ` : ''}
            
            ${nextSteps ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${nextSteps.split('\n').filter(step => step.trim()).map(step => `<li style="margin: 8px 0;">${step}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul>
                  <li>Please confirm your attendance by replying to this email</li>
                  <li>Review the job description and company information</li>
                  <li>Prepare questions you'd like to ask during the interview</li>
                  <li>Arrive 10-15 minutes early</li>
                </ul>
              </div>
            `}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/jobseeker/dashboard" 
                 style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Application Status
              </a>
            </div>
            
            <p>We look forward to meeting you and learning more about your qualifications. Good luck with your interview!</p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            
            <p style="color: #666; font-size: 14px;">
              If you have any questions or need to reschedule, please contact us as soon as possible.<br>
              This is an automated message from SkillSync Job Portal.
            </p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendInitialInterviewEmail(applicantEmail, applicantName, jobTitle, companyName, customMessage = null, interviewDetails = {}, employerEmail = null) {
    if (!this.isConfigured) {
      console.log('Email service not configured - Initial interview invitation would be sent to:', applicantEmail);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const {
      date = 'To be scheduled',
      time = 'To be confirmed',
      location = 'To be confirmed',
      contactPerson = '',
      contactEmail = '',
      contactPhone = '',
      whatToBring = '',
      dressCode = '',
      additionalNotes = '',
      nextSteps = ''
    } = interviewDetails;
    
    const formattedDate = date && date !== 'To be scheduled' 
      ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : date;
    
    const formattedTime = time && time !== 'To be confirmed'
      ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : time;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: applicantEmail,
      bcc: employerEmail || undefined,
      replyTo: employerEmail || contactEmail || undefined,
      subject: `Initial Interview Invitation - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>Initial Interview Invitation</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Congratulations ${applicantName}!</h2>
            
            <p>We are pleased to invite you for an <strong>initial interview</strong> for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>.</p>
            
            ${customMessage ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #059669; margin-top: 0;">Message from ${companyName}:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${customMessage}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669; margin-top: 0;">Initial Interview Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Position:</strong></td>
                  <td style="padding: 8px 0;">${jobTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Company:</strong></td>
                  <td style="padding: 8px 0;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
                  <td style="padding: 8px 0;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
                  <td style="padding: 8px 0;">${location}</td>
                </tr>
                ${contactPerson ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Person:</strong></td>
                  <td style="padding: 8px 0;">${contactPerson}</td>
                </tr>
                ` : ''}
                ${contactEmail ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Email:</strong></td>
                  <td style="padding: 8px 0;">${contactEmail}</td>
                </tr>
                ` : ''}
                ${contactPhone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Phone:</strong></td>
                  <td style="padding: 8px 0;">${contactPhone}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${whatToBring ? `
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">What to Bring:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #065f46;">${whatToBring}</p>
              </div>
            ` : `
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">What to Bring:</h3>
                <ul style="margin-bottom: 0; color: #065f46;">
                  <li>Updated resume/CV</li>
                  <li>Valid government-issued ID</li>
                  <li>Portfolio or work samples (if applicable)</li>
                  <li>Any relevant certificates or credentials</li>
                </ul>
              </div>
            `}
            
            ${dressCode ? `
              <div style="background-color: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
                <h3 style="color: #3730a3; margin-top: 0;">Dress Code:</h3>
                <p style="margin-bottom: 0; color: #3730a3;">${dressCode}</p>
              </div>
            ` : ''}
            
            ${additionalNotes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-top: 0;">Additional Information:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #92400e;">${additionalNotes}</p>
              </div>
            ` : ''}
            
            ${nextSteps ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${nextSteps.split('\n').filter(step => step.trim()).map(step => `<li style="margin: 8px 0;">${step}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul>
                  <li>Please confirm your attendance by replying to this email</li>
                  <li>Review the job description and company information</li>
                  <li>Prepare questions you'd like to ask during the interview</li>
                  <li>Arrive 10-15 minutes early</li>
                </ul>
              </div>
            `}
            
            <p style="margin-top: 30px;">We look forward to meeting you!</p>
            
            <p>Best regards,<br>
            <strong>${companyName}</strong></p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated message from ${companyName}. Please do not reply directly to this email.</p>
            <p>If you have any questions, please contact us using the information provided above.</p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendFinalInterviewEmail(applicantEmail, applicantName, jobTitle, companyName, customMessage = null, interviewDetails = {}, employerEmail = null) {
    if (!this.isConfigured) {
      console.log('Email service not configured - Final interview invitation would be sent to:', applicantEmail);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const {
      date = 'To be scheduled',
      time = 'To be confirmed',
      location = 'To be confirmed',
      contactPerson = '',
      contactEmail = '',
      contactPhone = '',
      whatToBring = '',
      dressCode = '',
      additionalNotes = '',
      nextSteps = ''
    } = interviewDetails;
    
    const formattedDate = date && date !== 'To be scheduled' 
      ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : date;
    
    const formattedTime = time && time !== 'To be confirmed'
      ? new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      : time;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: applicantEmail,
      bcc: employerEmail || undefined,
      replyTo: employerEmail || contactEmail || undefined,
      subject: `Final Interview Invitation - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #8b5cf6; color: white; padding: 20px; text-align: center;">
            <h1>🎯 Final Interview Invitation</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Excellent News, ${applicantName}!</h2>
            
            <p>We are excited to invite you for the <strong>final interview</strong> for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. You're one step closer to joining our team!</p>
            
            ${customMessage ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
                <h3 style="color: #7c3aed; margin-top: 0;">Message from ${companyName}:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${customMessage}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #7c3aed; margin-top: 0;">Final Interview Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 120px;"><strong>Position:</strong></td>
                  <td style="padding: 8px 0;">${jobTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Company:</strong></td>
                  <td style="padding: 8px 0;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Date:</strong></td>
                  <td style="padding: 8px 0;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Time:</strong></td>
                  <td style="padding: 8px 0;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Location:</strong></td>
                  <td style="padding: 8px 0;">${location}</td>
                </tr>
                ${contactPerson ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Person:</strong></td>
                  <td style="padding: 8px 0;">${contactPerson}</td>
                </tr>
                ` : ''}
                ${contactEmail ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Email:</strong></td>
                  <td style="padding: 8px 0;">${contactEmail}</td>
                </tr>
                ` : ''}
                ${contactPhone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Contact Phone:</strong></td>
                  <td style="padding: 8px 0;">${contactPhone}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${whatToBring ? `
              <div style="background-color: #ddd6fe; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0;">
                <h3 style="color: #5b21b6; margin-top: 0;">What to Bring:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #5b21b6;">${whatToBring}</p>
              </div>
            ` : `
              <div style="background-color: #ddd6fe; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0;">
                <h3 style="color: #5b21b6; margin-top: 0;">What to Bring:</h3>
                <ul style="margin-bottom: 0; color: #5b21b6;">
                  <li>Updated resume/CV</li>
                  <li>Valid government-issued ID</li>
                  <li>Portfolio or work samples (if applicable)</li>
                  <li>Any relevant certificates or credentials</li>
                  <li>References (if requested)</li>
                </ul>
              </div>
            `}
            
            ${dressCode ? `
              <div style="background-color: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0;">
                <h3 style="color: #3730a3; margin-top: 0;">Dress Code:</h3>
                <p style="margin-bottom: 0; color: #3730a3;">${dressCode}</p>
              </div>
            ` : ''}
            
            ${additionalNotes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-top: 0;">Additional Information:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #92400e;">${additionalNotes}</p>
              </div>
            ` : ''}
            
            ${nextSteps ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${nextSteps.split('\n').filter(step => step.trim()).map(step => `<li style="margin: 8px 0;">${step}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul>
                  <li>Please confirm your attendance by replying to this email</li>
                  <li>Prepare for in-depth discussions about your experience and skills</li>
                  <li>Be ready to meet with senior team members or decision-makers</li>
                  <li>Prepare thoughtful questions about the role and company</li>
                  <li>Arrive 10-15 minutes early</li>
                </ul>
              </div>
            `}
            
            <p style="margin-top: 30px;">This is an important step in our hiring process. We're excited to learn more about you!</p>
            
            <p>Best regards,<br>
            <strong>${companyName}</strong></p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated message from ${companyName}. Please do not reply directly to this email.</p>
            <p>If you have any questions, please contact us using the information provided above.</p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendHireConfirmationEmail(applicantEmail, applicantName, jobTitle, companyName, customMessage = null, hireDetails = {}, employerEmail = null) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log('Email service not configured - Hire confirmation would be sent to:', applicantEmail);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const {
      startDate = 'To be confirmed',
      salary = '',
      location = 'To be confirmed',
      contactPerson = '',
      contactEmail = '',
      contactPhone = '',
      whatToBring = '',
      additionalNotes = '',
      nextSteps = ''
    } = hireDetails;
    
    // Format start date if provided
    const formattedStartDate = startDate && startDate !== 'To be confirmed' 
      ? new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : startDate;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@skillsync.com',
      to: applicantEmail,
      bcc: employerEmail || undefined, // Add employer email as BCC
      replyTo: employerEmail || contactEmail || undefined, // Set reply-to as employer or contact email
      subject: `Congratulations! Job Offer - ${jobTitle} at ${companyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1>🎉 Congratulations!</h1>
          </div>
          
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2>Welcome to ${companyName}!</h2>
            
            <p>Dear ${applicantName},</p>
            
            <p>We are thrilled to offer you the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>. After careful consideration, we believe you will be an excellent addition to our team!</p>
            
            ${customMessage ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #059669; margin-top: 0;">Message from ${companyName}:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0;">${customMessage}</p>
              </div>
            ` : ''}
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #059669; margin-top: 0;">Employment Details:</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Position:</strong></td>
                  <td style="padding: 8px 0;">${jobTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Company:</strong></td>
                  <td style="padding: 8px 0;">${companyName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Start Date:</strong></td>
                  <td style="padding: 8px 0;">${formattedStartDate}</td>
                </tr>
                ${salary ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Salary:</strong></td>
                  <td style="padding: 8px 0;">${salary}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>Work Location:</strong></td>
                  <td style="padding: 8px 0;">${location}</td>
                </tr>
                ${contactPerson ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>HR Contact:</strong></td>
                  <td style="padding: 8px 0;">${contactPerson}</td>
                </tr>
                ` : ''}
                ${contactEmail ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>HR Email:</strong></td>
                  <td style="padding: 8px 0;">${contactEmail}</td>
                </tr>
                ` : ''}
                ${contactPhone ? `
                <tr>
                  <td style="padding: 8px 0; color: #666;"><strong>HR Phone:</strong></td>
                  <td style="padding: 8px 0;">${contactPhone}</td>
                </tr>
                ` : ''}
              </table>
            </div>
            
            ${whatToBring ? `
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">Required Documents for First Day:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #065f46;">${whatToBring}</p>
              </div>
            ` : `
              <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                <h3 style="color: #065f46; margin-top: 0;">Required Documents for First Day:</h3>
                <ul style="margin-bottom: 0; color: #065f46;">
                  <li>Valid government-issued ID (2 copies)</li>
                  <li>Birth certificate (photocopy)</li>
                  <li>TIN ID or TIN number</li>
                  <li>SSS/PhilHealth/Pag-IBIG numbers</li>
                  <li>2x2 ID pictures (2 pcs)</li>
                  <li>NBI Clearance (if required)</li>
                  <li>Medical certificate</li>
                </ul>
              </div>
            `}
            
            ${additionalNotes ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-top: 0;">Additional Information:</h3>
                <p style="white-space: pre-wrap; margin-bottom: 0; color: #92400e;">${additionalNotes}</p>
              </div>
            ` : ''}
            
            ${nextSteps ? `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  ${nextSteps.split('\n').filter(step => step.trim()).map(step => `<li style="margin: 8px 0;">${step}</li>`).join('')}
                </ul>
              </div>
            ` : `
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Next Steps:</h3>
                <ul>
                  <li>Please confirm your acceptance by replying to this email</li>
                  <li>Complete any required pre-employment paperwork</li>
                  <li>Attend orientation on your first day</li>
                  <li>Bring required documents for HR processing</li>
                </ul>
              </div>
            `}
            
            <p style="margin-top: 30px;">We look forward to having you as part of our team!</p>
            
            <p>Best regards,<br>
            <strong>${companyName}</strong></p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated message from ${companyName}. Please do not reply directly to this email.</p>
            <p>If you have any questions, please contact the HR department using the contact information provided above.</p>
          </div>
        </div>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendOTPWithResend(email, otp, userRole = 'user') {
    try {
      console.log(`📤 Sending OTP email via Resend to ${email}...`);
      
      const { data, error } = await this.resend.emails.send({
        from: 'SkillSync <noreply@peso.gov.ph>',
        to: [email],
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
      });

      if (error) {
        console.error(`❌ Resend error:`, error);
        return { success: false, error: error.message };
      }

      console.log(`✅ OTP email sent successfully via Resend to ${email}, ID: ${data.id}`);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error(`❌ Failed to send OTP email via Resend to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
