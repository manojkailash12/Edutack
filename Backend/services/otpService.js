const transporter = require('../config/emailConfig');
const crypto = require('crypto');

class OTPService {
  constructor() {
    this.otpStore = new Map(); // In production, use Redis or database
    this.maxAttempts = 3;
    this.otpExpiry = 10 * 60 * 1000; // 10 minutes
    this.resendDelay = 60 * 1000; // 1 minute
  }

  // Generate 6-digit OTP
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate secure token
  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store OTP with metadata
  storeOTP(email, otp, purpose = 'verification') {
    const token = this.generateToken();
    const otpData = {
      otp,
      email,
      purpose,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.otpExpiry,
      lastSentAt: Date.now()
    };
    
    this.otpStore.set(token, otpData);
    
    // Auto-cleanup after expiry
    setTimeout(() => {
      this.otpStore.delete(token);
    }, this.otpExpiry);
    
    return token;
  }

  // Send OTP via email with retry mechanism
  async sendOTP(email, purpose = 'verification', customMessage = null) {
    try {
      console.log('=== OTP SENDING DEBUG ===');
      console.log('Email:', email);
      console.log('Purpose:', purpose);
      console.log('Environment:', process.env.NODE_ENV);

      // Check if we can send (rate limiting)
      const existingOTP = Array.from(this.otpStore.values())
        .find(data => data.email === email && data.purpose === purpose);
      
      if (existingOTP && (Date.now() - existingOTP.lastSentAt) < this.resendDelay) {
        const remainingTime = Math.ceil((this.resendDelay - (Date.now() - existingOTP.lastSentAt)) / 1000);
        throw new Error(`Please wait ${remainingTime} seconds before requesting another OTP`);
      }

      const otp = this.generateOTP();
      const token = this.storeOTP(email, otp, purpose);

      // Prepare email content based on purpose
      let subject, htmlContent;
      
      switch (purpose) {
        case 'password-reset':
          subject = 'EDUTRACK - Password Reset OTP';
          htmlContent = this.getPasswordResetEmailTemplate(otp);
          break;
        case 'registration':
          subject = 'EDUTRACK - Registration Verification OTP';
          htmlContent = this.getRegistrationEmailTemplate(otp);
          break;
        case 'login':
          subject = 'EDUTRACK - Login Verification OTP';
          htmlContent = this.getLoginEmailTemplate(otp);
          break;
        default:
          subject = 'EDUTRACK - Verification OTP';
          htmlContent = this.getDefaultEmailTemplate(otp);
      }

      if (customMessage) {
        htmlContent = this.getCustomEmailTemplate(otp, customMessage);
      }

      const mailOptions = {
        from: process.env.EMAIL_USER || 'libroflow8@gmail.com',
        to: email,
        subject: subject,
        html: htmlContent
      };

      console.log('Sending OTP email...');
      
      // Send with retry mechanism
      const info = await this.sendEmailWithRetry(mailOptions);
      
      console.log('OTP sent successfully:', info.messageId);

      return {
        success: true,
        token: token,
        expiresIn: this.otpExpiry / 1000, // seconds
        message: 'OTP sent successfully'
      };

    } catch (error) {
      console.error('OTP sending failed:', error);
      throw new Error(`Failed to send OTP: ${error.message}`);
    }
  }

  // Verify OTP
  verifyOTP(token, otp) {
    try {
      console.log('=== OTP VERIFICATION DEBUG ===');
      console.log('Token:', token);
      console.log('OTP:', otp);

      const otpData = this.otpStore.get(token);
      
      if (!otpData) {
        throw new Error('Invalid or expired OTP token');
      }

      if (Date.now() > otpData.expiresAt) {
        this.otpStore.delete(token);
        throw new Error('OTP has expired');
      }

      if (otpData.attempts >= this.maxAttempts) {
        this.otpStore.delete(token);
        throw new Error('Maximum OTP attempts exceeded');
      }

      if (otpData.otp !== otp) {
        otpData.attempts++;
        throw new Error(`Invalid OTP. ${this.maxAttempts - otpData.attempts} attempts remaining`);
      }

      // OTP verified successfully
      this.otpStore.delete(token);
      
      console.log('OTP verified successfully');
      
      return {
        success: true,
        email: otpData.email,
        purpose: otpData.purpose,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  }

  // Email sending with retry mechanism
  async sendEmailWithRetry(mailOptions, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Email attempt ${attempt}/${maxRetries}`);
        
        // Verify connection
        await transporter.verify();
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully on attempt ${attempt}`);
        return info;
        
      } catch (error) {
        console.error(`Email attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Email failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Email templates
  getPasswordResetEmailTemplate(otp) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">EDUTRACK</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Educational Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #FF6B35; margin-bottom: 20px;">Password Reset Request</h2>
          
          <p>You have requested to reset your password. Use the OTP below to proceed:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #FF6B35;">
            <h1 style="color: #FF6B35; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Important:</strong><br>
            • This OTP is valid for 10 minutes only<br>
            • Do not share this OTP with anyone<br>
            • If you didn't request this, please ignore this email
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This is an automated email from EDUTRACK. Please do not reply.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  getRegistrationEmailTemplate(otp) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #28A745, #20C997); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Welcome to EDUTRACK!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Educational Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #28A745; margin-bottom: 20px;">Verify Your Registration</h2>
          
          <p>Thank you for joining EDUTRACK! Please verify your email address with the OTP below:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #28A745;">
            <h1 style="color: #28A745; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Next Steps:</strong><br>
            • Enter this OTP in the verification form<br>
            • Complete your profile setup<br>
            • Start using EDUTRACK features
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              This OTP expires in 10 minutes. Welcome aboard!
            </p>
          </div>
        </div>
      </div>
    `;
  }

  getLoginEmailTemplate(otp) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #007BFF, #0056B3); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">EDUTRACK</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure Login Verification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #007BFF; margin-bottom: 20px;">Login Verification</h2>
          
          <p>Someone is trying to log into your EDUTRACK account. If this is you, use the OTP below:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #007BFF;">
            <h1 style="color: #007BFF; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <strong>Security Notice:</strong><br>
            • If you didn't attempt to log in, please secure your account<br>
            • This OTP expires in 10 minutes<br>
            • Never share your OTP with anyone
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              Login attempt from: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  getDefaultEmailTemplate(otp) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6C63FF, #5A52FF); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">EDUTRACK</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Educational Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #6C63FF; margin-bottom: 20px;">Verification Required</h2>
          
          <p>Please use the following OTP to complete your verification:</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #6C63FF;">
            <h1 style="color: #6C63FF; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This OTP is valid for 10 minutes only.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              Generated at: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  getCustomEmailTemplate(otp, message) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">EDUTRACK</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Educational Management System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 40px; border-radius: 0 0 10px 10px;">
          <div style="margin-bottom: 20px;">
            ${message}
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #FF6B35;">
            <h1 style="color: #FF6B35; font-size: 36px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            This OTP is valid for 10 minutes only.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #888; font-size: 12px; margin: 0;">
              Generated at: ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // Get OTP statistics (for debugging)
  getStats() {
    return {
      activeOTPs: this.otpStore.size,
      otps: Array.from(this.otpStore.entries()).map(([token, data]) => ({
        token: token.substring(0, 8) + '...',
        email: data.email,
        purpose: data.purpose,
        attempts: data.attempts,
        expiresIn: Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000))
      }))
    };
  }

  // Clear expired OTPs manually
  clearExpired() {
    const now = Date.now();
    let cleared = 0;
    
    for (const [token, data] of this.otpStore.entries()) {
      if (now > data.expiresAt) {
        this.otpStore.delete(token);
        cleared++;
      }
    }
    
    return { cleared, remaining: this.otpStore.size };
  }
}

module.exports = new OTPService();