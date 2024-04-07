/**
 * Shared code which can be used across the code bases.
 * This is for code which can only be run in a node environment (i.e not in a browser)
 * Due to the different environments each part of the code is run in this file has the following restrictions:
 *     - No typescript; put the typescript definitions in helpers.d.ts
 */
'use strict';
class HelpersNode {
    /**
     * Send an email with the given config.
     *
     */
    static sendEmail({ receiver, subject, payload, attachments, sender = 'no-reply@ti.com', html = true }, callback = () => { }) {
        const nodemailer = require('nodemailer');
        if (receiver.trim().length === 0) {
            return setImmediate(callback);
        }
        if (!exports.sendEmail.transporter) {
            // create reusable transporter object using the default SMTP transport
            const smtpConfig = {
                host: 'smtp.mail.ti.com',
                port: 25
            };
            exports.sendEmail.transporter = nodemailer.createTransport(smtpConfig);
        }
        // setup e-mail data with unicode symbols
        const mailOptions = {
            from: sender,
            to: receiver,
            subject,
            attachments
        };
        if (html) {
            mailOptions.html = payload;
        }
        else {
            mailOptions.text = payload;
        }
        // send mail with defined transport object
        exports.sendEmail.transporter.sendMail(mailOptions, callback);
    }
}
exports.sendEmail = HelpersNode.sendEmail;
// To enable spies / stubs in tests (can't use them on standalone functions)
exports._object = HelpersNode;
