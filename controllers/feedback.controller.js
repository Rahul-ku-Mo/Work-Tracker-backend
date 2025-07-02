const emailService = require("../services/emailService");

// Submit feedback (feature requests, bug reports, improvements, testimonials)
exports.submitFeedback = async (req, res) => {
  try {
    const { type, description, email, allowContact, rating } = req.body;

    // Validate required fields
    if (!type || !description) {
      return res.status(400).json({
        status: 400,
        message: "Type and description are required",
      });
    }

    // Validate feedback type
    const validTypes = ['feature', 'bug', 'improvement', 'testimonial'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        status: 400,
        message: "Invalid feedback type",
      });
    }

    // Send feedback email to support team
    try {
      const subject = `New ${type.charAt(0).toUpperCase() + type.slice(1)} ${type === 'bug' ? 'Report' : type === 'feature' ? 'Request' : type === 'testimonial' ? 'Review' : 'Suggestion'} - PulseBoard`;
      
      const emailBody = `
        <h2>New ${type.charAt(0).toUpperCase() + type.slice(1)} ${type === 'bug' ? 'Report' : type === 'feature' ? 'Request' : type === 'testimonial' ? 'Review' : 'Suggestion'}</h2>
        
        <p><strong>Type:</strong> ${type}</p>
        ${email ? `<p><strong>User Email:</strong> ${email}</p>` : '<p><strong>User Email:</strong> Anonymous</p>'}
        <p><strong>Allow Contact:</strong> ${allowContact ? 'Yes' : 'No'}</p>
        ${rating ? `<p><strong>Rating:</strong> ${rating}/5 stars</p>` : ''}
        
        <h3>Description:</h3>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
          ${description.replace(/\n/g, '<br>')}
        </div>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Submitted at: ${new Date().toLocaleString()}<br>
          From: PulseBoard Feedback System
        </p>
      `;

      await emailService.transporter.sendMail({
        from: `"PulseBoard Feedback" <${process.env.SMTP_USER}>`,
        to: process.env.SUPPORT_EMAIL || process.env.SMTP_USER,
        subject: subject,
        html: emailBody,
        text: `
New ${type} from PulseBoard:

Type: ${type}
User Email: ${email || 'Anonymous'}
Allow Contact: ${allowContact ? 'Yes' : 'No'}
${rating ? `Rating: ${rating}/5 stars` : ''}

Description:
${description}

Submitted at: ${new Date().toLocaleString()}
        `
      });

      // Send confirmation email to user if they provided email and allowed contact
      if (email && allowContact) {
        const confirmationSubject = `Thank you for your ${type} - PulseBoard`;
        const confirmationBody = `
          <h2>Thank you for your feedback!</h2>
          
          <p>Hi there,</p>
          
          <p>Thank you for taking the time to share your ${type} with us. Your input is invaluable in helping us improve PulseBoard.</p>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 5px; border-left: 4px solid #0ea5e9;">
            <p><strong>What you submitted:</strong></p>
            <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)}</p>
            ${rating ? `<p><strong>Rating:</strong> ${rating}/5 stars</p>` : ''}
            <p><strong>Description:</strong> ${description}</p>
          </div>
          
          <p>We review all feedback carefully and will get back to you if we need any clarification or have updates to share.</p>
          
          <p>Thanks again for helping us make PulseBoard better!</p>
          
          <p>Best regards,<br>
          The PulseBoard Team</p>
          
          <hr>
          <p style="color: #666; font-size: 12px;">
            This is an automated confirmation email. Please do not reply directly to this email.
          </p>
        `;

        await emailService.transporter.sendMail({
          from: `"PulseBoard Team" <${process.env.SMTP_USER}>`,
          to: email,
          subject: confirmationSubject,
          html: confirmationBody,
          text: `
Thank you for your ${type}!

Hi there,

Thank you for taking the time to share your ${type} with us. Your input is invaluable in helping us improve PulseBoard.

What you submitted:
Type: ${type.charAt(0).toUpperCase() + type.slice(1)}
${rating ? `Rating: ${rating}/5 stars` : ''}
Description: ${description}

We review all feedback carefully and will get back to you if we need any clarification or have updates to share.

Thanks again for helping us make PulseBoard better!

Best regards,
The PulseBoard Team
          `
        });
      }

      console.log(`✅ Feedback ${type} submitted successfully${email ? ` by ${email}` : ' anonymously'}`);

      return res.status(200).json({
        status: 200,
        message: "Thank you for your feedback! We've received your submission and will review it carefully.",
        data: {
          type,
          submitted: true,
          confirmationSent: email && allowContact
        }
      });

    } catch (emailError) {
      console.error('❌ Failed to send feedback email:', emailError);
      return res.status(500).json({
        status: 500,
        message: "We received your feedback but couldn't send confirmation emails. Please try again or contact support directly.",
      });
    }

  } catch (error) {
    console.error('Error in submitFeedback:', error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error. Please try again later." 
    });
  }
};

// Submit support request (contact form)
exports.submitSupportRequest = async (req, res) => {
  try {
    const { name, email, description } = req.body;

    // Validate required fields
    if (!name || !email || !description) {
      return res.status(400).json({
        status: 400,
        message: "Name, email, and description are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: 400,
        message: "Please provide a valid email address",
      });
    }

    // Send support request email to support team
    try {
      const subject = `New Support Request from ${name} - PulseBoard`;
      
      const emailBody = `
        <h2>New Support Request</h2>
        
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        
        <h3>Message:</h3>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; border-left: 4px solid #dc2626;">
          ${description.replace(/\n/g, '<br>')}
        </div>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Submitted at: ${new Date().toLocaleString()}<br>
          From: PulseBoard Support System
        </p>
      `;

      await emailService.transporter.sendMail({
        from: `"PulseBoard Support" <${process.env.SMTP_USER}>`,
        to: process.env.SUPPORT_EMAIL || process.env.SMTP_USER,
        subject: subject,
        html: emailBody,
        replyTo: email, // Allow direct reply to user
        text: `
New Support Request from PulseBoard:

Name: ${name}
Email: ${email}

Message:
${description}

Submitted at: ${new Date().toLocaleString()}
        `
      });

      // Send confirmation email to user
      const confirmationSubject = `We've received your support request - PulseBoard`;
      const confirmationBody = `
        <h2>Thanks for contacting us!</h2>
        
        <p>Hi ${name},</p>
        
        <p>We've received your support request and will get back to you as soon as possible. Our team typically responds within 2-4 hours during business hours.</p>
        
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; border-left: 4px solid #f59e0b;">
          <p><strong>Your message:</strong></p>
          <p>${description}</p>
        </div>
        
        <p>If your issue is urgent, please don't hesitate to reach out to us again with "URGENT" in the subject line.</p>
        
        <p>Thank you for using PulseBoard!</p>
        
        <p>Best regards,<br>
        The PulseBoard Support Team</p>
        
        <hr>
        <p style="color: #666; font-size: 12px;">
          Reference: SUP-${Date.now()}<br>
          This is an automated confirmation email.
        </p>
      `;

      await emailService.transporter.sendMail({
        from: `"PulseBoard Support" <${process.env.SMTP_USER}>`,
        to: email,
        subject: confirmationSubject,
        html: confirmationBody,
        text: `
Thanks for contacting us!

Hi ${name},

We've received your support request and will get back to you as soon as possible. Our team typically responds within 2-4 hours during business hours.

Your message:
${description}

If your issue is urgent, please don't hesitate to reach out to us again with "URGENT" in the subject line.

Thank you for using PulseBoard!

Best regards,
The PulseBoard Support Team

Reference: SUP-${Date.now()}
        `
      });

      console.log(`✅ Support request submitted successfully by ${name} (${email})`);

      return res.status(200).json({
        status: 200,
        message: "Your message has been sent! We'll get back to you within 24 hours.",
        data: {
          name,
          email,
          submitted: true,
          reference: `SUP-${Date.now()}`
        }
      });

    } catch (emailError) {
      console.error('❌ Failed to send support request email:', emailError);
      return res.status(500).json({
        status: 500,
        message: "Failed to send your message. Please try again or contact us directly at support@pulseboard.co.in",
      });
    }

  } catch (error) {
    console.error('Error in submitSupportRequest:', error);
    res.status(500).json({ 
      status: 500, 
      message: "Internal Server Error. Please try again later." 
    });
  }
}; 