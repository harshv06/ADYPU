const express = require("express");
const mongoose = require("mongoose");
const routes = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { time } = require("console");
require("dotenv").config();

// Define allowed file types (in this case, only PDFs)
const ALLOWED_FILE_TYPES = ["application/pdf"];

// Max file size (e.g., 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const pdfSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
});

// const PDF = mongoose.model("PDF", pdfSchema);
const generateUserId = () => uuidv4();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure userId is correctly generated or provided
    if (!req.userId) {
      req.userId = generateUserId(); // Generate or fetch a valid userId
    }

    // Get the current timestamp
    const timestamp = Date.now(); // e.g., 1693567890123 (milliseconds)

    // Create folder path using userId and timestamp (for uniqueness)
    const folderName = `${req.userId}-${timestamp}`;
    const dest = path.join(__dirname, "uploads", folderName);

    // Check if the directory exists, if not, create it
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    cb(null, dest); // Save to the generated folder
  },

  filename: function (req, file, cb) {
    const timestamp = Date.now(); // Adds timestamp for uniqueness and precision

    // Remove spaces from the original file name and strip off the extension
    const originalFileName = path.basename(
      file.originalname,
      path.extname(file.originalname)
    );

    // Format the new filename: originalFileName-timestamp.ext
    const TempFilename = `${originalFileName}-${timestamp}${path.extname(
      file.originalname
    )}`;
    const filename = TempFilename.split(" ").join("");
    cb(null, filename);
  },

});

// File filter to allow only PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true); // Accept PDF files
  } else {
    cb(new Error('Only PDF files are allowed'), false); // Reject non-PDF files
  }
};


const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: fileFilter
});

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
  const uploadsDir = path.join(__dirname, "uploads");

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Error listing files" });
    }

    const pdf = [];
    const dir = [];

    files.map((file) => {
      const folderPath = path.join(uploadsDir, file);

      // Check if the path is a directory
      if (fs.statSync(folderPath).isDirectory()) {
        dir.push({ name: file }); // Push directory name to the dir array

        // Read all files within the directory
        const userFiles = fs.readdirSync(folderPath);
        console.log(userFiles);

        // Filter out PDF files
        const pdfFilesInUserFolder = userFiles.filter((file) =>
          file.endsWith(".pdf")
        );

        // Push each PDF file found to the pdf array
        pdfFilesInUserFolder.forEach((pdfFile) => {
          pdf.push({ user: file, filename: pdfFile });
        });
      }
    });
    console.log(pdf);
    res.json({ data: pdf, dir: dir });
  });
});

// const sendEmail = async (email) => {
//   const transporter = mailer.createTransport({
//     service: "gmail.com",
//     host: "smtp.gmail.com",
//     port: 465,
//     secure: false,
//     requireTLS: true,
//     auth: {
//       user: process.env.USER_ID,
//       pass: process.env.USER_PASS,
//     },
//   });

//   const mailOptions = {
//     from: "ADYPU.com",
//     to: email,
//     subject: "Research Paper Upload successfull",
//     text: `Paper Uploaded Successfully`,
//   };

//   try {
//     console.log("Email", email);
//     await transporter.sendMail(mailOptions);
//     console.log("Mail Sent successfully to user");
//   } catch (error) {
//     console.log("Failed to send email", error);
//   }
// };

// routes.post("/v1/sendEmail", async (req, res) => {
//   sendEmail(req.body.email);
//   return res.send({ Message: "Email Sent Successfully" });
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
            console.log(fileDateStr);

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

// API to upload PDF file
routes.post("/v1/uploadPaper", upload.single("pdf"), (req, res) => {
  // Validate if a file is uploaded
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded or invalid file type. Please upload a PDF." });
  }

  // Successful upload
  res.status(200).json({ message: "File uploaded successfully", file: req.file });
});

// Error handling middleware
routes.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred when uploading.
    return res.status(500).json({ error: "An unknown error occurred during file upload." });
  }
  next();
});

routes.get("/v1/getAllPaper", async (req, res) => {
  res.send(200);
});

routes.post("/TestAPI", (req, res) => {
  res.send("Api Working");
});

routes.post("/TestAPI2", (req, res) => {
  res.send("Api Working");
});

routes.get("/getLatestPDF", async (req, res) => {
  try {
    const directoryPath = path.join(__dirname, "uploads"); // Adjust to your directory structure
    let latestFile = null;
    let latestTimestamp = 0;

    // Read all files in the uploads directory
    const userDirs = fs.readdirSync(directoryPath);

    // Iterate through each user directory
    userDirs.forEach((userDir) => {
      const userDirPath = path.join(directoryPath, userDir);
      const files = fs.readdirSync(userDirPath);

      files.forEach((file) => {
        // Extract the timestamp from the filename (assuming format: filename-timestamp.pdf)
        const fileParts = file.split("-");
        if (fileParts.length > 1) {
          const timestamp = parseInt(
            fileParts[fileParts.length - 1].split(".")[0]
          );

          // Check if this file has the latest timestamp
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            latestFile = path.join(userDirPath, file);
          }
        }
      });
    });

    // If a file was found, send it
    if (latestFile) {
      console.log(latestFile);
      return res.sendFile(latestFile);
    } else {
      return res.status(404).json({ error: "No PDF found" });
    }
  } catch (err) {
    console.error("Error reading directories:", err);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the PDF" });
  }
});

routes.get("/getLatest3PDF", async (req, res) => {
  const directoryPath = path.join(__dirname, "uploads"); // Path to the uploads directory
  const allFiles = [];

  try {
    // Read all user directories
    const userDirs = await fs.promises.readdir(directoryPath);

    // Create an array of promises for reading files in each user directory
    const filePromises = userDirs.map(async (userId) => {
      const userDirPath = path.join(directoryPath, userId);
      const files = await fs.promises.readdir(userDirPath);

      // Filter and collect only PDF files with their timestamps
      for (const file of files) {
        const filePath = path.join(userDirPath, file);
        const fileStats = await fs.promises.stat(filePath); // Get file stats to access timestamps

        if (path.extname(file) === '.pdf') {
          allFiles.push({
            path: filePath,
            mtime: fileStats.mtime // Last modified time
          });
        }
      }
    });

    // Wait for all file reading promises to resolve
    await Promise.all(filePromises);

    // Sort the collected files based on the modified time in descending order
    allFiles.sort((a, b) => b.mtime - a.mtime);

    // If we have more than 3 PDFs, slice the results to exclude the most recent
    if (allFiles.length > 3) {
      const latestThreePDFs = allFiles.slice(1, 4); // Get top 2, 3, 4 PDFs
      return res.status(200).json(latestThreePDFs);
    } else {
      return res.status(404).json({ error: "Not enough PDF files found." });
    }
  } catch (error) {
    console.error("Error reading directories:", error);
    return res.status(500).json({ error: "Unable to read directories" });
  }
});

routes.get('/getAnyPDF', (req, res) => {
  const filePath = req.query.filePath; // Get the file path from the query string
  if (!filePath) {
    return res.status(400).json({ error: "File path not provided" });
  }

  // Make sure the file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({ error: "File not found" });
    }

    // Send the file to the client
    res.sendFile(path.resolve(filePath), (err) => {
      if (err) {
        console.error("Error sending file:", err);
        res.status(500).json({ error: "Failed to send the file" });
      }
    });
  });
});

module.exports = routes;
