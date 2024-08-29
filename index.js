const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const json = require("jsonwebtoken");
const bodyParser = require("body-parser");
const path = require("path");

require("dotenv").config();
const app = express();
app.use(express.urlencoded({ extended: false }));
const routes = require("./Routes");
app.use(cors());
app.use(bodyParser.json());
app.use(routes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/deploy", (req, res) => {
  const payload = req.body;

  // Optionally, verify the payload using a secret key

  if (payload.ref === "refs/heads/main") {
    // Ensure it's the correct branch
    exec("/root/ADYPU/deploy.sh", (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return res.status(500).send("Deployment failed.");
      }
      if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return res.status(500).send("Deployment error.");
      }
      console.log(`Stdout: ${stdout}`);
      res.status(200).send("Deployment successful.");
    });
  } else {
    res.status(400).send("Not a main branch push.");
  }
});

app.use(
  cors({
    origin: "https://www.adypjiet.in/",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// mongoose.connect(process.env.MONGO_URL).then(()=>{
//     console.log("Succesfully connected to database")
// }).catch((err)=>{
//     console.log("Failed to connected to database")
//     console.log(err)
// })

app.listen(process.env.PORT, () => {
  console.log("Server Started Successfully");
});
