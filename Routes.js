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
require('dotenv').config()

const pdfSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
});
const PDF = mongoose.model("PDF", pdfSchema);
const generateUserId = () => uuidv4();
const userDataPath = path.join(__dirname, "userData.json");

function readUserData() {
  if (!fs.existsSync(userDataPath)) {
    fs.writeFileSync(userDataPath, JSON.stringify([]), "utf8"); // Create the file if it doesn't exist
  }
  const data = fs.readFileSync(userDataPath, "utf8");
  return JSON.parse(data);
}

function writeUserData(data) {
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2), "utf8");
}

function saveUserDetails(userDetails) {
  const data = readUserData();
  data.push(userDetails);
  writeUserData(data);
}

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     const userId = req.userId;
//     const dest = path.join(__dirname, "uploads", userId);
//     // fs.ensureDir(dest);
//     fs.mkdirSync(dest, { recursive: true });
//     cb(null, dest);
//   },

//   filename: function (req, file, cb) {
//     cb(null, `${file.fieldname}-${Date.now()}-${file.originalname}`);
//   },
// });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure userId is correctly generated or provided
    if (!req.userId) {
      req.userId = generateUserId(); // Generate or fetch a valid userId
    }

    const dest = path.join(__dirname, 'uploads', req.userId);

    // Check if the directory exists, if not, create it
    fs.mkdirSync(dest, { recursive: true });

    cb(null, dest);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

routes.get("/getPDF/:dir/:filename", (req, res) => {
  // console.log("hi harsh");
  // console.log(req.params)
  const { dir, filename } = req.params;
  const filepath = path.join(__dirname, "uploads", dir, filename);

  if (fs.existsSync(filepath)) {
    res.setHeader("Content-Type", "application/pdf");
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    console.log("DATA", fileStream.pipe(res));
  } else {
    return res.send("File Not Found");
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

    const pdf = [];
    const dir = [];
    files.forEach((Files) => {
      // console.log(Files)
      dir.push({ name: Files });
      const folderPath = path.join(__dirname, "uploads", Files);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath);
        const pdfFilesInUserFolder = files.filter((file) =>
          file.endsWith(".pdf")
        );
        pdfFilesInUserFolder.forEach((files) => {
          pdf.push({ user: Files, filename: files });
        });
      }
    });

    console.log(pdf);
    res.json({ data: pdf, dir: dir });
  });
});

const sendEmail = async (email) => {
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
    subject: "Research Paper Upload successfull",
    text: `Paper Uploaded Successfully`,
  };

  try {
    console.log("Email",email)
    await transporter.sendMail(mailOptions);
    console.log("Mail Sent successfully to user");
  } catch (error){
    console.log("Failed to send email",error);
  }
};

routes.post("/v1/sendEmail", async (req, res) => {
  sendEmail(req.body.email);
  return res.send({ Message: "Email Sent Successfully" });
});


routes.post('/v1/uploadPDF', upload.array('file',10), (req, res) => {
  // console.log('Email:', req.body.email); // Access and log the email address
  if(!req.body.email){
    return res.send("Email Address Not Valid")
  }
  res.send('Files Uploaded');
});

routes.get("/directories", (req, res) => {
  const uploadsDir = path.join(__dirname, "uploads");

  // Read the contents of the uploads directory
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error listing directories" });
    }

    // Filter out only directories
    const directories = files.filter((file) =>
      fs.statSync(path.join(uploadsDir, file)).isDirectory()
    );
    console.log(directories);
    res.json(directories);
  });
});

routes.get("/files/:directoryName", (req, res) => {
  const directoryName = req.params.directoryName;
  const directoryPath = path.join(__dirname, "uploads", directoryName);

  // Read the contents of the directory
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "Error listing files in directory" });
    }

    res.json(files);
  });
});

// routes.post("/v1/signup", async (req, res) => {
//   const { name, email, password } = req.body;
//   try {
//     User.findOne({ email: email }).then(async (savedUser) => {
//       if (savedUser) {
//         return res.send({ Error: "User Already Exists" });
//       } else {
//         const user = new User({
//           name: name,
//           email: email,
//           password: password,
//           verified: true,
//         });

//         try {
//           await user.save();
//           return res.send({ Message: "User Registered Successfully" });
//         } catch {
//           return res.send({ Error: "Failed to save user" });
//         }
//       }
//     });
//   } catch {
//     res.send({ Error: "Something went wrong" });
//   }
// });

// routes.post("/v1/signin", async (req, res) => {
//   const { email, password } = req.body;
//   try {
//     await User.findOne({ email: email }).then(async (savedUser) => {
//       if (savedUser) {
//         bcrypt.compare(password, savedUser.password, (err, result) => {
//           if (result) {
//             return res.send({ Message: "Logged in" });
//           } else {
//             return res.send({ Message: "Invalid Credentials" });
//           }
//         });
//       } else {
//         return res.send({ Error: "User doesnt exist" });
//       }
//     });
//   } catch {
//     return res.send({ Error: "Something went wrong" });
//   }
// });

module.exports = routes;
