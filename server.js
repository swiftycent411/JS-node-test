const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data.json");

// ✅ Function to Read Data from JSON File
function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Error reading data file:", err);
    return [];
  }
}

// ✅ Function to Write Data to JSON File
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Error writing data file:", err);
  }
}

// ✅ Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "public", "about.html")));
app.get("/contact", (req, res) => res.render("contact", { name: "Guest" }));
app.get("/resume", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "resume.html"));
});
// ✅ Handle Contact Form Submission (Save to Local File)
app.post("/submit-form", (req, res) => {
  const { name, email, message } = req.body;
  
  // Read existing data and append new submission
  const submissions = readData();
  const newEntry = { id: submissions.length + 1, name, email, message, createdAt: new Date() };
  submissions.push(newEntry);
  
  // Write to local file
  writeData(submissions);
  
  console.log("✅ Form Submission Saved:", newEntry);
  res.render("thank-you", { name });
});

// ✅ Admin Panel Route (Read from Local File)
app.get("/admin", (req, res) => {
  const submissions = readData();
  console.log("📊 Retrieved", submissions.length, "submissions.");
  res.render("admin", { contacts: submissions });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Unexpected Error:", err.message);
  res.status(500).send("Something went wrong. Check server logs for details.");
});

// ✅ Start Server (Default Port 8080)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
