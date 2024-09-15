const nodeMailer=require('nodemailer')
const sendEmail=async(options)=>{

    const transporter= nodeMailer.createTransport({
        host:process.env.SMPT_HOST,   
        port:process.env.SMPT_PORT,

        service:process.env.SMPT_SERVICE,
        auth:{
             user:process.env.SMPT_MAIL,
             pass:"brku mlut bokp qtmz" //App password taken from google account.
               
            }
   
        })
       const mailOptions={
         from:process.env.SMPT_MAIL,
         to:options.email,
         subject:options.subject,
         text:options.message

        }
        await transporter.sendMail(mailOptions)
    
    }
    


    module.exports=sendEmail
      