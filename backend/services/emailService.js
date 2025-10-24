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
      this.useResend = true;
      console.log('✅ Resend email service configured successfully');
      
      // Also configure SMTP fallback for sandbox limitations
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        console.log('📧 Configuring SMTP fallback for Resend sandbox limitations...');
        try {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });
          console.log('✅ SMTP fallback configured successfully');
        } catch (error) {
          console.error('❌ Failed to configure SMTP fallback:', error.message);
        }
      }
      
      this.isConfigured = true;
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
          
          this.transporter = nodemailer.createTransport({
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
          this.transporter = nodemailer.createTransport({
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
          this.transporter = nodemailer.createTransport({
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
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
          from: 'SkillSync <noreply@skill-sync.org>',
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
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
          from: 'SkillSync <noreply@skill-sync.org>',
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
        from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
        from: 'SkillSync <noreply@skill-sync.org>',
        to: [email],
        subject: mailOptions.subject,
        html: mailOptions.html
      });
      
      // Check if Resend returned an error in the response
      if (result.error) {
        console.error('❌ Resend API Error:', result.error);
        if (result.error.name === 'validation_error') {
          console.log('🔍 RESEND SANDBOX MODE: Falling back to SMTP for unverified emails');
          console.log('📧 Attempting to send via Gmail SMTP fallback...');
          
          // Fallback to SMTP for sandbox limitation
          if (this.transporter) {
            try {
              const result = await this.transporter.sendMail(mailOptions);
              console.log(`✅ OTP email sent via SMTP fallback to ${email}, MessageID: ${result.messageId}`);
              return { success: true, messageId: result.messageId, method: 'smtp_fallback' };
            } catch (smtpError) {
              console.error('❌ SMTP fallback also failed:', smtpError.message);
              console.log(`📝 OTP for ${email}: ${otp} (both Resend and SMTP failed)`);
              return { 
                success: true, 
                message: 'Email service in sandbox mode - OTP logged to console',
                sandboxMode: true 
              };
            }
          } else {
            console.log(`📝 OTP for ${email}: ${otp} (logged due to sandbox limitation)`);
            return { 
              success: true, 
              message: 'Email service in sandbox mode - OTP logged to console',
              sandboxMode: true 
            };
          }
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

  async sendJobRemovalEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendJobPauseEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
                <li> Contact our team for assistance or clarification</li>
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendJobFlagEmail(employerEmail, companyName, jobTitle, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendJobseekerSuspensionEmail(jobseekerEmail, jobseekerName, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
                <strong>⚠️ Important:</strong> If you don't log in within 30 days from today, 
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendJobseekerRemovalEmail(jobseekerEmail, jobseekerName, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
                <li>✗ Your account and all associated data have been permanently deleted</li>
                <li>✗ All job applications and saved jobs have been removed</li>
                <li>✗ You will no longer be able to access your previous account</li>
                <li>✗ You will no longer receive notifications from our platform</li>
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendJobseekerCompleteRemovalEmail(jobseekerEmail, jobseekerName, reason) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
                <li>✗ Your user account and login credentials</li>
                <li>✗ Your complete jobseeker profile and resume data</li>
                <li>✗ All job applications and application history</li>
                <li>✗ All saved jobs and preferences</li>
                <li>✗ Your authentication data from Firebase</li>
                <li>✗ All associated analytics and activity data</li>
              </ul>
            </div>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">⚠️ Important Notice</h3>
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendAccountDeactivationEmail(userEmail, userName) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`Account deactivation email would be sent to: ${userEmail}`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  async sendAccountDeletionEmail(userEmail, userName) {
    // If email service is not configured, just log the action
    if (!this.isConfigured) {
      console.log(`Account deletion email would be sent to: ${userEmail}`);
      return { success: true, message: 'Email service not configured - notification logged to console' };
    }

    const mailOptions = {
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
              </table>
            </div>
            
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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
      from: process.env.NODE_ENV === 'production' ? 'noreply@skill-sync.org' : (process.env.EMAIL_USER || 'noreply@skill-sync.org'),
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
              </table>
            </div>
            
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
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
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

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, userRole = 'user') {
    const resetUrl = `${process.env.NODE_ENV === 'production' ? 'https://skillsync-frontend.onrender.com' : 'http://localhost:3000'}/#/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: this.senderEmail,
      to: email,
      subject: 'Reset Your SkillSync Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Password Reset</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Reset your SkillSync account password</p>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to reset the password for your SkillSync account associated with this email address.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                        font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Reset Your Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 14px; color: #667eea; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #856404;">
                <strong>Security Notice:</strong> This password reset link will expire in 1 hour for your security. 
                If you didn't request this password reset, please ignore this email or contact our support team.
              </p>
            </div>
            
            <p style="font-size: 16px; margin-top: 30px;">
              If you have any questions or need assistance, please don't hesitate to contact our support team.
            </p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The SkillSync Team</strong></p>
          </div>
          
          <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated message from SkillSync. Please do not reply directly to this email.</p>
            <p>  ${new Date().getFullYear()} SkillSync. All rights reserved.</p>
          </div>
        </div>
      `
    };

    try {
      if (this.useResend) {
        const result = await this.resend.emails.send({
          from: 'SkillSync <noreply@skill-sync.org>',
          to: [mailOptions.to],
          subject: mailOptions.subject,
          html: mailOptions.html
        });
        return { success: true, messageId: result.data?.id };
      } else {
        if (!this.transporter) {
          await this.initializeTransporter();
        }
        const info = await this.transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Send employer complete removal email
  async sendEmployerCompleteRemovalEmail(email, companyName) {
    const mailOptions = {
      from: this.senderEmail,
      to: email,
      subject: 'Account Permanently Removed - SkillSync',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Account Removed</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your SkillSync employer account has been permanently deleted</p>
          </div>
          
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <p style="font-size: 16px; margin-bottom: 20px;">Dear ${companyName} Team,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We are writing to inform you that your employer account with SkillSync has been permanently removed from our platform by our administration team.
            </p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
              <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">What has been deleted:</h3>
              <ul style="color: #856404; margin: 0; padding-left: 20px;">
                <li>Your employer account and profile</li>
                <li>All job postings created by your company</li>
                <li>All job applications received</li>
                <li>All uploaded documents and verification materials</li>
                <li>Your authentication credentials</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>Important:</strong> Since your account has been completely removed from all our systems, you can now register again with the same email address if needed.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              If you believe this action was taken in error or if you have any questions, please contact our support team immediately.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="mailto:support@skill-sync.org" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                        font-weight: bold; font-size: 16px;">
                Contact Support
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Thank you for your understanding.
            </p>
            
            <p style="font-size: 14px; color: #666;">
              Best regards,<br>
              The SkillSync Administration Team
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
            <p style="font-size: 12px; color: #6c757d; margin: 0;">
              This is an automated message from SkillSync. Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    try {
      // Use Resend if available and configured
      if (this.useResend && this.resend) {
        try {
          const result = await this.resend.emails.send({
            from: 'SkillSync <noreply@skill-sync.org>',
            to: email,
            subject: mailOptions.subject,
            html: mailOptions.html
          });
          console.log(`✅ Employer removal email sent via Resend to ${email}, ID: ${result.data?.id}`);
          return { success: true, messageId: result.data?.id, method: 'resend' };
        } catch (resendError) {
          console.error('❌ Resend email failed:', resendError.message);
          
          // Fallback to SMTP for sandbox limitation
          if (this.transporter) {
            try {
              const result = await this.transporter.sendMail(mailOptions);
              console.log(`✅ Employer removal email sent via SMTP fallback to ${email}, MessageID: ${result.messageId}`);
              return { success: true, messageId: result.messageId, method: 'smtp_fallback' };
            } catch (smtpError) {
              console.error('❌ SMTP fallback also failed:', smtpError.message);
              throw smtpError;
            }
          } else {
            throw resendError;
          }
        }
      }

      // Use SMTP transporter
      if (!this.transporter) {
        return { success: false, error: 'Email transporter not configured' };
      }
      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Employer removal email sent successfully to ${email}, MessageID: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send employer removal email:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
