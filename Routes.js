const express = require("express");
const mongoose = require("mongoose");
const routes = express.Router();
const mailer = require("nodemailer");
const User=require('./Models/User')
const bcrypt=require('bcrypt')

const sendVerificationMail = async (email, code) => {
  const transporter = mailer.createTransport({
    service: "gmail.com",
    host: "smtp.gmail.com",
    port: 465,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.USER_ID,
      pass: process.env.USER_PASS,
    },
  });

  const mailOptions = {
    from: "ADYPU.com",
    to: email,
    subject: "Verify Your Account",
    text: `Please Enter This code to verify you're account ${code}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Mail Sent successfully to user");
  } catch {
    console.log("Failed to send email");
  }
};

routes.post("/v1/sendVerificationMail", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.send({ error: "Missing Credentials" });
  }

  let verificationCode = Math.floor(100000 + Math.random() * 900000);
  console.log(verificationCode);
  sendVerificationMail(email,verificationCode)
  let user=[
    name,
    email,
    password,
    verificationCode
  ]
  return res.send({message:"Email Sent Successfully",data:user});
});

routes.post("/v1/signup",async(req,res)=>{
    const {name,email,password}=req.body
    try{
        User.findOne({email:email}).then(async(savedUser)=>{
            if(savedUser){
                return res.send({Error:"User Already Exists"})
            }else{
                const user=new User({
                    name:name,
                    email:email,
                    password:password,
                    verified:true
                })

                try{
                    await user.save()
                    return res.send({Message:"User Registered Successfully"})
                }catch{
                    return res.send({Error:"Failed to save user"})
                }
            }
        })
    }catch{
        res.send({Error:"Something went wrong"})
    }
})

routes.post("/v1/signin",async(req,res)=>{
    const {email,password}=req.body
    try{
        await User.findOne({email:email}).then(async(savedUser)=>{
            if(savedUser){
                bcrypt.compare(password,savedUser.password,(err,result)=>{
                    if(result){
                        return res.send({Message:"Logged in"})
                    }else{
                        return res.send({Message:"Invalid Credentials"})
                    }
                })
            }else{
                return res.send({Error:"User doesnt exist"})
            }
        })
    }catch{
        return res.send({Error:"Something went wrong"})
    }
})
module.exports = routes;
