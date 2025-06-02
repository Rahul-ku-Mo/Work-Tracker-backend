const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendTeamInvitation(email, teamName, joinCode, inviterName, frontendUrl) {
    const inviteLink = `${frontendUrl}/join?code=${joinCode}`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'EzTrack'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `You're invited to join ${teamName} on EzTrack`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .invitation-box { background-color: #f8fafc; border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center; border: 2px dashed #e2e8f0; }
            .team-name { font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 10px; }
            .join-code { font-family: 'Monaco', 'Menlo', monospace; font-size: 32px; font-weight: bold; color: #667eea; background-color: white; padding: 15px 25px; border-radius: 8px; border: 2px solid #e2e8f0; margin: 20px 0; display: inline-block; letter-spacing: 2px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
            .btn:hover { transform: translateY(-2px); }
            .alternative { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            .highlight { color: #667eea; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Team Invitation</h1>
            </div>
            
            <div class="content">
              <h2>Hi there! 👋</h2>
              <p><strong>${inviterName}</strong> has invited you to join their team on <strong>EzTrack</strong> - a powerful project management and time tracking platform.</p>
              
              <div class="invitation-box">
                <div class="team-name">${teamName}</div>
                <p>Join Code:</p>
                <div class="join-code">${joinCode}</div>
                <a href="${inviteLink}" class="btn">Join Team Now</a>
              </div>
              
              <h3>What you can do with EzTrack:</h3>
              <ul style="line-height: 1.8; color: #4a5568;">
                <li>📊 Track time on projects and tasks</li>
                <li>📋 Manage boards and collaborate with team members</li>
                <li>📈 View detailed analytics and performance insights</li>
                <li>🎯 Set goals and monitor progress</li>
                <li>💬 Communicate with your team effectively</li>
              </ul>
              
              <div class="alternative">
                <h4>Alternative ways to join:</h4>
                <p>1. <strong>Click the button above</strong> to join automatically</p>
                <p>2. <strong>Manual process:</strong></p>
                <ul style="color: #64748b;">
                  <li>Visit <a href="${frontendUrl}" class="highlight">${frontendUrl}</a></li>
                  <li>Create an account or sign in</li>
                  <li>Enter the join code: <span class="highlight">${joinCode}</span></li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; color: #64748b;">
                This invitation was sent by ${inviterName}. If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EzTrack. All rights reserved.</p>
              <p>Streamline your workflow, track your progress, achieve your goals.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        You're invited to join ${teamName} on EzTrack!
        
        ${inviterName} has invited you to join their team.
        
        Join Code: ${joinCode}
        
        To join:
        1. Visit ${frontendUrl}
        2. Create an account or sign in
        3. Enter the join code: ${joinCode}
        
        Or click this link: ${inviteLink}
        
        This invitation was sent by ${inviterName}.
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Team invitation email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending team invitation email:', error);
      throw error;
    }
  }

  async sendBoardInvitation(email, boardName, teamName, inviteLink, inviterName, frontendUrl) {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'EzTrack'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `You're invited to collaborate on ${boardName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Board Invitation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .board-box { background-color: #f0fdf4; border-radius: 12px; padding: 30px; margin: 20px 0; text-align: center; border: 2px solid #bbf7d0; }
            .board-name { font-size: 24px; font-weight: 700; color: #1a202c; margin-bottom: 10px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; transition: transform 0.2s; }
            .btn:hover { transform: translateY(-2px); }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
            .highlight { color: #10b981; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Board Invitation</h1>
            </div>
            
            <div class="content">
              <h2>Hi there! 👋</h2>
              <p><strong>${inviterName}</strong> has invited you to collaborate on a board in <strong>${teamName}</strong>.</p>
              
              <div class="board-box">
                <div class="board-name">${boardName}</div>
                <p>You've been granted access to collaborate on this board</p>
                <a href="${inviteLink}" class="btn">Access Board</a>
              </div>
              
              <h3>What you can do on this board:</h3>
              <ul style="line-height: 1.8; color: #4a5568;">
                <li>📝 Create and manage tasks</li>
                <li>🏷️ Add labels and organize work</li>
                <li>💬 Comment and collaborate with team members</li>
                <li>⏱️ Track time spent on tasks</li>
                <li>📊 View progress and analytics</li>
              </ul>
              
              <p style="margin-top: 30px; color: #64748b;">
                This invitation was sent by ${inviterName}. If you didn't expect this invitation, please contact your team administrator.
              </p>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} EzTrack. All rights reserved.</p>
              <p>Collaborate better, achieve more.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        You're invited to collaborate on ${boardName}!
        
        ${inviterName} has invited you to collaborate on a board in ${teamName}.
        
        Board: ${boardName}
        
        To access the board, click this link: ${inviteLink}
        
        This invitation was sent by ${inviterName}.
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Board invitation email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending board invitation email:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service is ready');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService(); 