// Resend Email Service Integration
const RESEND_API_KEY = 're_T4wHxoNo_C2o46yGFHeTfprThZEXc8KSg';
const RESEND_API_URL = 'https://api.resend.com/emails';

// Email templates for queue management
const EMAIL_TEMPLATES = {
    welcome: {
        subject: '🎟️ Welcome to Your Virtual Queue - QueueManager',
        template: (data) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
                    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { padding: 20px; }
                    .ticket-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎟️ QueueManager</h1>
                        <p>Your Virtual Queue Ticket</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.customerName},</h2>
                        <p>You have successfully joined the queue at <strong>${data.queueName}</strong>.</p>
                        
                        <div class="ticket-info">
                            <h3>📋 Queue Details:</h3>
                            <p><strong>Service:</strong> ${data.serviceType}</p>
                            <p><strong>Current Position:</strong> #${data.position}</p>
                            <p><strong>Estimated Wait Time:</strong> ${data.estimatedWait}</p>
                            <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
                        </div>
                        
                        <p>You can track your queue status in real-time using the link below:</p>
                        <a href="${data.trackingLink}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Track Your Queue
                        </a>
                        
                        <p style="margin-top: 20px;">We'll notify you when it's almost your turn!</p>
                    </div>
                    <div class="footer">
                        <p>Thank you for using QueueManager</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },
    
    positionUpdate: {
        subject: '📊 Queue Position Update - QueueManager',
        template: (data) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
                    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { padding: 20px; }
                    .position-update { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📊 Queue Update</h1>
                        <p>Your position has changed</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.customerName},</h2>
                        <p>Your queue position at <strong>${data.queueName}</strong> has been updated.</p>
                        
                        <div class="position-update">
                            <h3>🔄 Position Change</h3>
                            <p style="font-size: 24px; font-weight: bold; color: #d97706;">
                                ${data.oldPosition} → ${data.newPosition}
                            </p>
                            <p><strong>Service:</strong> ${data.serviceType}</p>
                        </div>
                        
                        <p>Estimated wait time: <strong>${data.estimatedWait}</strong></p>
                        
                        <a href="${data.trackingLink}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Current Status
                        </a>
                    </div>
                    <div class="footer">
                        <p>QueueManager - Smart Queue Management</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },
    
    readyForService: {
        subject: '🚨 It\'s Your Turn! - QueueManager',
        template: (data) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
                    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { padding: 20px; }
                    .urgent-alert { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; border: 2px solid #10b981; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🚨 It's Your Turn!</h1>
                        <p>Please proceed to the service counter</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.customerName},</h2>
                        
                        <div class="urgent-alert">
                            <h3>✅ Ready for Service</h3>
                            <p style="font-size: 20px; font-weight: bold; color: #059669;">
                                You are now being served!
                            </p>
                            <p><strong>Location:</strong> ${data.queueName}</p>
                            <p><strong>Service Point:</strong> ${data.servicePoint}</p>
                            <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
                        </div>
                        
                        <p>Please proceed to the service counter immediately.</p>
                        
                        <a href="${data.trackingLink}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Details
                        </a>
                    </div>
                    <div class="footer">
                        <p>Thank you for using QueueManager</p>
                    </div>
                </div>
            </body>
            </html>
        `
    },
    
    serviceCompleted: {
        subject: '✅ Service Completed - QueueManager',
        template: (data) => `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }
                    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; }
                    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }
                    .content { padding: 20px; }
                    .completion-message { background: #e0e7ff; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
                    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✅ Service Completed</h1>
                        <p>Thank you for using QueueManager</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${data.customerName},</h2>
                        
                        <div class="completion-message">
                            <h3>🎉 Service Successfully Completed</h3>
                            <p>Your service at <strong>${data.queueName}</strong> has been completed.</p>
                            <p><strong>Ticket ID:</strong> ${data.ticketId}</p>
                            <p><strong>Completed at:</strong> ${data.completedTime}</p>
                        </div>
                        
                        <p>We hope you had a great experience with our virtual queue system!</p>
                        
                        ${data.ratingLink ? `
                        <p>Please take a moment to rate your experience:</p>
                        <a href="${data.ratingLink}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Rate Your Experience
                        </a>
                        ` : ''}
                    </div>
                    <div class="footer">
                        <p>QueueManager - Making waiting better</p>
                    </div>
                </div>
            </body>
            </html>
        `
    }
};

// Main email sending function
async function sendResendEmail(to, subject, html, from = 'QueueManager <notifications@queuemanager.dev>') {
    try {
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: from,
                to: to,
                subject: subject,
                html: html,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Resend API error: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        console.log('Email sent successfully:', data);
        return { success: true, data: data };
        
    } catch (error) {
        console.error('Error sending email via Resend:', error);
        return { success: false, error: error.message };
    }
}

// Specific email functions for queue events
async function sendWelcomeEmail(queueData, userData) {
    const templateData = {
        customerName: userData.name || 'Customer',
        queueName: queueData.locationName,
        serviceType: queueData.service,
        position: queueData.position,
        estimatedWait: queueData.estimatedWait || '15-20 minutes',
        ticketId: queueData.ticketId,
        trackingLink: `${window.location.origin}/track.html?ticket=${queueData.ticketId}`
    };

    const html = EMAIL_TEMPLATES.welcome.template(templateData);
    return await sendResendEmail(
        userData.email,
        EMAIL_TEMPLATES.welcome.subject,
        html
    );
}

async function sendPositionUpdateEmail(queueData, userData, oldPosition) {
    const templateData = {
        customerName: userData.name || 'Customer',
        queueName: queueData.locationName,
        serviceType: queueData.service,
        oldPosition: oldPosition,
        newPosition: queueData.position,
        estimatedWait: queueData.estimatedWait || '10-15 minutes',
        ticketId: queueData.ticketId,
        trackingLink: `${window.location.origin}/track.html?ticket=${queueData.ticketId}`
    };

    const html = EMAIL_TEMPLATES.positionUpdate.template(templateData);
    return await sendResendEmail(
        userData.email,
        EMAIL_TEMPLATES.positionUpdate.subject,
        html
    );
}

async function sendReadyForServiceEmail(queueData, userData) {
    const templateData = {
        customerName: userData.name || 'Customer',
        queueName: queueData.locationName,
        servicePoint: queueData.servicePoint || 'Counter 1',
        ticketId: queueData.ticketId,
        trackingLink: `${window.location.origin}/track.html?ticket=${queueData.ticketId}`
    };

    const html = EMAIL_TEMPLATES.readyForService.template(templateData);
    return await sendResendEmail(
        userData.email,
        EMAIL_TEMPLATES.readyForService.subject,
        html
    );
}

async function sendServiceCompletedEmail(queueData, userData) {
    const templateData = {
        customerName: userData.name || 'Customer',
        queueName: queueData.locationName,
        ticketId: queueData.ticketId,
        completedTime: new Date().toLocaleString(),
        ratingLink: `${window.location.origin}/rate.html?ticket=${queueData.ticketId}`
    };

    const html = EMAIL_TEMPLATES.serviceCompleted.template(templateData);
    return await sendResendEmail(
        userData.email,
        EMAIL_TEMPLATES.serviceCompleted.subject,
        html
    );
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendWelcomeEmail,
        sendPositionUpdateEmail,
        sendReadyForServiceEmail,
        sendServiceCompletedEmail,
        sendResendEmail
    };
}