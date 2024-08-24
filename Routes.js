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
const { time } = require("console");
require("dotenv").config();

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure userId is correctly generated or provided
    if (!req.userId) {
      req.userId = generateUserId(); // Generate or fetch a valid userId
    }

    const dest = path.join(__dirname, "uploads", req.userId);

    // Check if the directory exists, if not, create it
    fs.mkdirSync(dest, { recursive: true });

    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Get the current date in YYYY-MM-DD format
    const date = new Date().toISOString().split("T")[0]; // e.g., "2024-08-13"

    // Generate the new filename as userId-date
    const newFilename = `${req.userId}-${date}${path.extname(
      file.originalname
    )}`;

    cb(null, newFilename);
  },
});

const upload = multer({ storage: storage });

routes.get("/v1/latest3Papers", async (req, res) => {
  // console.log("Hi")
  const dest = path.join(__dirname, "uploads");
  try {
    const directories = await fs.promises.readdir(dest, {
      withFileTypes: true,
    });
    let files = [];
    for (const dir of directories) {
      // console.log(dir)
      if (dir.isDirectory()) {
        console.log("Yes");
        const filesInDir = await fs.promises.readdir(
          path.join(dest, dir.name),
          { withFileTypes: true }
        );
        filesInDir.forEach((file) => {
          console.log("Files:", file);
          if (file.isFile() && file.name.endsWith(".jpg")) {
            files.push({
              name: file.name,
              path: path.join("uploads", dir.name, file.name),
              time: fs
                .statSync(path.join(dest, dir.name, file.name))
                .mtime.getTime(),
            });
          }
        });
      }
    }

    files.sort((a, b) => b.time - a.time);
    files = files.slice(0, 3);
    console.log(files);
    res.json(
      files.map((file) => ({
        name: file.name,
        url: `http://${req.headers.host}/${file.path}`,
      }))
    );
  } catch (error) {
    console.error("Failed to read directories:", error);
    res.status(500).send("Error reading paper files.");
  }
});

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
    console.log("Email", email);
    await transporter.sendMail(mailOptions);
    console.log("Mail Sent successfully to user");
  } catch (error) {
    console.log("Failed to send email", error);
  }
};

routes.post("/v1/sendEmail", async (req, res) => {
  sendEmail(req.body.email);
  return res.send({ Message: "Email Sent Successfully" });
});

// routes.post("/v1/uploadPDF", upload.single("file"), (req, res) => {
//   // console.log('Email:', req.body.email); // Access and log the email address
//   if (!req.body.email) {
//     return res.send("Email Address Not Valid");
//   }
//   res.send("Files Uploaded");
// });

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

routes.get("/fetchHomePagePdf", async (req, res) => {
  console.log("Request received");

  const directoryPath = path.join(__dirname, "uploads"); // Root uploads directory
  const currentDate = new Date();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(currentDate.getMonth() - 3);

  try {
    // Read all user directories
    const userDirs = await fs.readdirSync(directoryPath);
    let latestFile = null;
    let latestFileDate = new Date(0); // Start with the earliest possible date

    // Iterate over each user's directory
    for (const userId of userDirs) {
      const userDirPath = path.join(directoryPath, userId);

      try {
        // Read files in the user's directory
        const files = await fs.readdirSync(userDirPath);
        // Iterate over files in the user's directory
        for (const file of files) {
          // Ensure file name is in the format userId-date.PDF
          const fileParts = file.split("-");
          if (fileParts.length > 1) {
            const fileDateStr = fileParts.slice(5).join("-").split(".")[0]; // Extract date part from filename
            const fileDate = new Date(fileDateStr);
            console.log(fileDateStr)

            // Check if the file date is within the last three months
            if (fileDate >= threeMonthsAgo && fileDate <= currentDate) {
              // Update latestFile if this file is more recent
              if (fileDate > latestFileDate) {
                latestFile = path.join(userDirPath, file);
                latestFileDate = fileDate;
              }
            }
          }
        }
      } catch (err) {
        console.error(`Unable to read files for user ${userId}:`, err);
      }
    }

    // If a valid file is found, send it
    if (latestFile) {
      return res.sendFile(latestFile);
    } else {
      return res
        .status(404)
        .json({ error: "No PDF found within the last three months" });
    }
  } catch (err) {
    console.error("Error reading directories:", err);
    return res.status(500).json({ error: "Unable to read directories" });
  }
});

routes.post("/api/uploadPdf", upload.single("pdf"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  res.status(200).send("File uploaded successfully");
});

routes.post("/TestAPI",(req,res)=>{
  res.send("Api Working")
})

module.exports = routes;
