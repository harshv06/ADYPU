const express = require("express");
const mongoose = require("mongoose");
const routes = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const User = require("./Models/User");
require("dotenv").config();

var userID = "";
var userID2 = "";

const pdfSchema = new mongoose.Schema({
  name: String,
  data: Buffer,
});

// const PDF = mongoose.model("PDF", pdfSchema);
const generateUserId = () => uuidv4();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure userId is correctly generated or provided
    // if (!req.userId) {
    //   userID = generateUserId(); // Generate or fetch a valid userId
    //   req.userId = userID;
    // }
    userID = generateUserId(); // Generate or fetch a valid userId
    req.userId = userID;
    console.log("userID: ", userID);
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
    // const filename = TempFilename.split(" ").join("");
    cb(null, TempFilename);
  },
});

// File filter to allow only PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true); // Accept PDF files
  } else {
    cb(new Error("Only PDF files are allowed"), false); // Reject non-PDF files
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: fileFilter,
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

routes.post("/saveUser", async (req, res) => {
  console.log(req.body);
  res.send("done");
});

// API to upload PDF file
routes.post("/v1/uploadPaper", upload.single("pdf"), async (req, res) => {
  // Validate if a file is uploaded
  if (!req.file) {
    return res.status(400).json({
      error: "No file uploaded or invalid file type. Please upload a PDF.",
    });
  }
  const { authors, number, email } = req.body;
  console.log(authors, number, email, userID);
  const newUser = new User({
    userID,
    authors,
    number,
    email,
  });

  try {
    await newUser.save();
    res
      .status(200)
      .json({ message: "File uploaded successfully", file: req.file });
    userID = "";
    console.log("done");
  } catch (error) {
    console.error("Error saving user:", error);
    res
      .status(500)
      .json({
        error: "Error saving user Please Enter Unique Email And Phone Number",
      });
  }
});

// Error handling middleware
routes.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred when uploading.
    return res
      .status(500)
      .json({ error: "An unknown error occurred during file upload." });
  }
  next();
});

routes.get("/v1/getAllPaper", async (req, res) => {
  const directoryPath = path.join(__dirname, "uploads");
  const allFiles = [];

  try {
    const userDirs = await fs.promises.readdir(directoryPath);
    
    // Loop over user directories and process files
    const filePromises = userDirs.map(async (userID) => {
      var id=userID.split("-").slice(0,5);
      id=id.join("-").toString();
      console.log(id);
      const userDirPath = path.join(directoryPath, userID);
      const files = await fs.promises.readdir(userDirPath);
      const user=await User.findOne({userID:id})
      for (const file of files) {
        const filePath = path.join(userDirPath, file);
        const fileStats = await fs.promises.stat(filePath); // Get file stats to access timestamps
        console.log("user:",user)
        if (path.extname(file) === ".pdf") {
          var fileName=file.split(".")[0];
          console.log("File:",fileName)
          fileName=fileName.split("-")[0];
          console.log("File:",fileName)
          allFiles.push({
            path: filePath,
            mtime: fileStats.mtime, // Last modified time
            name:fileName,
            author:user.authors
          });
        }
      }
    });

    // Wait for all file processing promises to resolve
    await Promise.all(filePromises);

    // Check if any files were found
    if (allFiles.length > 0) {
      console.log(allFiles.reverse())
      return res.status(200).json(allFiles.reverse());
    } else {
      return res.status(404).json({ error: "No PDF files found." });
    }
  } catch (err) {
    console.error("Error reading directories:", err); // Corrected variable name
    return res.status(500).json({ error: "Unable to read directories" });
  }
});

routes.get("/getLatestPDFMeta", async (req, res) => {
  try {
    const directoryPath = path.join(__dirname, "uploads"); // Adjust to your directory structure
    let latestFile = null;
    let latestTimestamp = 0;

    // Read all files in the uploads directory
    const userDirs = fs.readdirSync(directoryPath);
    console.log(userDirs);
    // Iterate through each user directory
    userDirs.forEach((userDir) => {
      const userDirPath = path.join(directoryPath, userDir);
      const files = fs.readdirSync(userDirPath);
      // console.log(files)
      files.forEach((file) => {
        // Extract the timestamp from the filename (assuming format: filename-timestamp.pdf)
        const fileParts = file.split("-");
        // console.log("File Parts:",fileParts)
        // console.log(fileParts)
        if (fileParts.length > 1) {
          const timestamp = parseInt(
            fileParts[fileParts.length - 1].split(".")[0]
          );
          // console.log(fileParts)
          // Check if this file has the latest timestamp
          if (timestamp > latestTimestamp) {
            latestTimestamp = timestamp;
            var temp = userDir.split("-");
            temp.pop();
            userID2 = temp.join("-").toString();
            console.log(userID2);
            latestFile = path.join(userDirPath, file);
          }
        }
      });
    });

    // If a file was found, send the file path and metadata
    if (latestFile) {
      const user = await User.findOne({ userID: userID2 });
      console.log(user)
      var fileName=path.basename(latestFile).split(".")[0];
      fileName=fileName.split("-")[0]
      console.log(fileName)
      const additionalData = {
        message: "This is the latest PDF file",
        fileName: fileName,
        filePath: `${latestFile}`, // or wherever the file can be accessed from
        authors:user.authors,
      };
      return res.status(200).json(additionalData);
    } else {
      return res.status(404).json({ error: "No PDF found" });
    }
  } catch (err) {
    console.error("Error reading directories:", err);
    return res
      .status(500)
      .json({ error: "An error occurred while fetching the PDF metadata" });
  }
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
        console.log(fileParts)
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

        if (path.extname(file) === ".pdf") {
          allFiles.push({
            path: filePath,
            mtime: fileStats.mtime, // Last modified time
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

routes.get("/getAnyPDF", (req, res) => {
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

routes.post("/TestAPI", (req, res) => {
  res.send("Api Working");
});

routes.post("/TestAPI2", (req, res) => {
  res.send("Api Working");
});

module.exports = routes;
