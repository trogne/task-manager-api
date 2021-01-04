const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

// const sendWelcomeEmail = (email, name) => {
const sendWelcomeEmail = (email, name, token) => {
    sgMail.send({
        to: email,
        from: 'patrick.fiset@gmail.com',
        subject: 'Thanks for joining in!',
        // text: `Welcome to the app, ${name}. Let me know how you get along with the app.`
        text: `Welcome to the app, ${name}. Verify : http://${process.env.BASE_URL}:${process.env.PORT}/verify/${token}`
    })
}

const sendCancelationEmail = (email, name) => {
    sgMail.send({
        to: email,
        from: 'patrick.fiset@gmail.com',
        subject: 'Sorry to see you go!',
        text: `Goodbye, ${name}. I hope to see you back sometime soon.`
    })
}

module.exports = {
    sendWelcomeEmail,
    sendCancelationEmail
}