const express = require("express");
const mongoose = require("mongoose");
const routes = express.Router();
const mailer = require("nodemailer");
const User = require("./Models/User");
const bcrypt = require("bcrypt");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const pdfSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
});
const PDF = mongoose.model("PDF", pdfSchema);

const generateUserId = () => uuidv4();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.userId;
    const dest = path.join(__dirname, "uploads", userId);
    // fs.ensureDir(dest);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },

  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });

routes.get("/getPDF/:dir/:filename", (req, res) => {
  const {dir,filename}=req.params
  const filepath=path.join(__dirname,"uploads",dir,filename)
  
  if(fs.existsSync(filepath)){
    res.setHeader('Content-Type', 'application/pdf');
    const fileStream=fs.createReadStream(filepath)
    fileStream.pipe(res)
    console.log("DATA",fileStream.pipe(res))
  }else{
    return res.send("File Not Found")
  }
  // res.send("Ok");
});

routes.get("/list-all-pdfs", (req, res) => {
  console.log("hi");
  const uploadsDir = path.join(__dirname, "uploads");
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error listing files" });
    }

    const pdf=[]
    const dir=[]
    files.forEach(Files=>{
      dir.push({name:Files})
      const folderPath=path.join(__dirname,"uploads",Files)
      if(fs.statSync(folderPath).isDirectory()){
        const files=fs.readdirSync(folderPath)
        const pdfFilesInUserFolder = files.filter(file => file.endsWith('.pdf'))
        pdfFilesInUserFolder.forEach(files=>{
          pdf.push({user:Files,filename:files})
        })
      }
    })

    console.log(pdf)
    res.json({data:pdf,dir:dir});

  });

});

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
  sendVerificationMail(email, verificationCode);
  let user = [name, email, password, verificationCode];
  return res.send({ message: "Email Sent Successfully", data: user });
});

routes.post("/v1/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
        return res.send({ Error: "User Already Exists" });
      } else {
        const user = new User({
          name: name,
          email: email,
          password: password,
          verified: true,
        });

        try {
          await user.save();
          return res.send({ Message: "User Registered Successfully" });
        } catch {
          return res.send({ Error: "Failed to save user" });
        }
      }
    });
  } catch {
    res.send({ Error: "Something went wrong" });
  }
});

routes.post("/v1/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    await User.findOne({ email: email }).then(async (savedUser) => {
      if (savedUser) {
        bcrypt.compare(password, savedUser.password, (err, result) => {
          if (result) {
            return res.send({ Message: "Logged in" });
          } else {
            return res.send({ Message: "Invalid Credentials" });
          }
        });
      } else {
        return res.send({ Error: "User doesnt exist" });
      }
    });
  } catch {
    return res.send({ Error: "Something went wrong" });
  }
});

routes.post(
  "/v1/uploadPDF",
  (req, res, next) => {
    req.userId = generateUserId();
    next();
  },
  upload.array("file", 10),
  async (req, res) => {
    res.send("Files Uploaded");
  }
);

routes.get('/directories', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  
  // Read the contents of the uploads directory
  fs.readdir(uploadsDir, (err, files) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error listing directories' });
      }

      // Filter out only directories
      const directories = files.filter(file => fs.statSync(path.join(uploadsDir, file)).isDirectory());
      console.log(directories)
      res.json(directories);
  });
});

routes.get('/files/:directoryName', (req, res) => {
  const directoryName = req.params.directoryName;
  const directoryPath = path.join(__dirname, 'uploads', directoryName);

  // Read the contents of the directory
  fs.readdir(directoryPath, (err, files) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Error listing files in directory' });
      }

      res.json(files);
  });
});

module.exports = routes;
