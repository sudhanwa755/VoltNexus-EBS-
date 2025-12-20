// Backend Email Service - Node.js / Express Example
// This is a sample implementation for sending consumption alerts
// File: backend/routes/send-alert.js or backend/services/emailService.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure email transporter (example with Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Alternative: SendGrid
// const sgMail = require('@sendgrid/mail');
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Send Consumption Alert Email
 * @param {Object} alert - Alert details
 * @param {string} alert.userEmail - Recipient email
 * @param {string} alert.userName - User's name
 * @param {number} alert.currentUsage - Current kWh usage
 * @param {number} alert.monthlyLimit - Monthly limit in kWh
 * @param {number} alert.percentage - Usage percentage
 * @param {boolean} alert.exceeded - Whether limit is exceeded
 */
export async function sendConsumptionAlert(alert) {
    try {
        const subject = alert.exceeded
            ? '🚨 Your Electricity Consumption Limit Exceeded!'
            : '⚠️ You Are Approaching Your Consumption Limit';

        const htmlContent = generateEmailHTML(alert);

        // Using Nodemailer
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: alert.userEmail,
            subject: subject,
            html: htmlContent
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
        return { success: true, messageId: info.messageId };

        // Alternative: Using SendGrid
        // const msg = {
        //     to: alert.userEmail,
        //     from: process.env.EMAIL_FROM,
        //     subject: subject,
        //     html: htmlContent,
        // };
        // await sgMail.send(msg);
        // return { success: true };

    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

/**
 * Generate HTML email content
 */
function generateEmailHTML(alert) {
    if (alert.exceeded) {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #dc2626; color: white; padding: 20px; border-radius: 8px; }
                    .content { margin: 20px 0; }
                    .alert-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
                    .stats { background-color: #f9fafb; padding: 15px; border-radius: 5px; }
                    .stat-row { display: flex; justify-content: space-between; margin: 10px 0; }
                    .stat-label { font-weight: bold; }
                    .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
                    a { color: #2563eb; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>⚠️ Consumption Limit Exceeded</h2>
                    </div>
                    
                    <div class="content">
                        <p>Hello ${alert.userName},</p>
                        
                        <p>Your monthly electricity consumption has <strong>exceeded your set limit</strong>.</p>
                        
                        <div class="alert-box">
                            <h3 style="color: #dc2626; margin-top: 0;">Alert Details</h3>
                            <div class="stats">
                                <div class="stat-row">
                                    <span class="stat-label">Current Usage:</span>
                                    <span>${alert.currentUsage.toFixed(2)} kWh</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Your Limit:</span>
                                    <span>${alert.monthlyLimit.toFixed(2)} kWh</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Exceeded By:</span>
                                    <span style="color: #dc2626;"><strong>${(alert.currentUsage - alert.monthlyLimit).toFixed(2)} kWh (${Math.round(((alert.currentUsage - alert.monthlyLimit) / alert.monthlyLimit) * 100)}%)</strong></span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Usage Percentage:</span>
                                    <span style="color: #dc2626;"><strong>${alert.percentage}%</strong></span>
                                </div>
                            </div>
                        </div>
                        
                        <h3>Recommended Actions:</h3>
                        <ul>
                            <li>Review your electricity usage for the current month</li>
                            <li>Check for any unusual consumption patterns</li>
                            <li>Consider reducing non-essential appliance usage</li>
                            <li>Update your consumption limit if needed</li>
                        </ul>
                        
                        <p>
                            <a href="https://your-app-domain.com/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
                                View Dashboard
                            </a>
                        </p>
                        
                        <p>
                            <a href="https://your-app-domain.com/profile">Manage your consumption limit →</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated alert from VoltNexus. Please do not reply to this email.</p>
                        <p>If you believe you received this in error, please contact support at support@voltnexus.com</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    } else {
        // Warning alert
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f59e0b; color: white; padding: 20px; border-radius: 8px; }
                    .content { margin: 20px 0; }
                    .alert-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                    .stats { background-color: #f9fafb; padding: 15px; border-radius: 5px; }
                    .stat-row { display: flex; justify-content: space-between; margin: 10px 0; }
                    .stat-label { font-weight: bold; }
                    .progress-bar { background-color: #e5e7eb; height: 10px; border-radius: 5px; margin: 15px 0; overflow: hidden; }
                    .progress-fill { background-color: #f59e0b; height: 100%; width: ${Math.min(alert.percentage, 100)}%; }
                    .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
                    a { color: #2563eb; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📊 Approaching Your Consumption Limit</h2>
                    </div>
                    
                    <div class="content">
                        <p>Hello ${alert.userName},</p>
                        
                        <p>Your electricity consumption has reached <strong>${alert.percentage}%</strong> of your monthly limit. Please monitor your usage to avoid exceeding the limit.</p>
                        
                        <div class="alert-box">
                            <h3 style="color: #f59e0b; margin-top: 0;">Consumption Summary</h3>
                            <div class="stats">
                                <div class="stat-row">
                                    <span class="stat-label">Current Usage:</span>
                                    <span>${alert.currentUsage.toFixed(2)} kWh</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Your Limit:</span>
                                    <span>${alert.monthlyLimit.toFixed(2)} kWh</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Remaining:</span>
                                    <span>${(alert.monthlyLimit - alert.currentUsage).toFixed(2)} kWh</span>
                                </div>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <p style="text-align: center; font-weight: bold;">${alert.percentage}% Used</p>
                        </div>
                        
                        <h3>Tips to Reduce Usage:</h3>
                        <ul>
                            <li>Turn off lights when not in use</li>
                            <li>Adjust air conditioning temperature by 2-3 degrees</li>
                            <li>Unplug devices that are not in active use</li>
                            <li>Use energy-efficient appliances</li>
                            <li>Run heavy appliances during off-peak hours</li>
                        </ul>
                        
                        <p>
                            <a href="https://your-app-domain.com/dashboard" style="display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
                                View Dashboard
                            </a>
                        </p>
                        
                        <p>
                            <a href="https://your-app-domain.com/profile">Review your consumption limit →</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>This is an automated alert from VoltNexus. Please do not reply to this email.</p>
                        <p>If you'd like to adjust your alert threshold or disable alerts, visit your <a href="https://your-app-domain.com/profile">profile settings</a>.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
}

// Express route handler example
export async function handleConsumptionAlert(req, res) {
    try {
        const alert = req.body;

        // Validate required fields
        if (!alert.userEmail || !alert.currentUsage || !alert.monthlyLimit) {
            return res.status(400).json({
                error: 'Missing required fields: userEmail, currentUsage, monthlyLimit'
            });
        }

        // Send email
        const result = await sendConsumptionAlert(alert);

        res.status(200).json({
            success: true,
            message: 'Alert email sent successfully',
            messageId: result.messageId
        });

    } catch (error) {
        console.error('Error handling alert:', error);
        res.status(500).json({
            error: 'Failed to send alert',
            message: error.message
        });
    }
}

// Usage in Express app:
// app.post('/api/send-alert', handleConsumptionAlert);

export default {
    sendConsumptionAlert,
    handleConsumptionAlert
};
