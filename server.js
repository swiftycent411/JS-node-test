const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config(); // Load environment variables

const app = express();

// ✅ Load Environment Variables
const API_USERNAME = process.env.API_USERNAME;
const API_PASSWORD = process.env.API_PASSWORD;
const API_ENDPOINT = process.env.API_ENDPOINT;
const SURVEY_CODE = process.env.SURVEY_CODE;
const NOTIFICATION_EMAILS = process.env.NOTIFICATION_EMAILS;

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

// ✅ Function to Get API Token
async function getAuthToken() {
  try {
    const url = `${API_ENDPOINT}/Authenticate?username=${encodeURIComponent(API_USERNAME)}&password=${encodeURIComponent(API_PASSWORD)}`;
    const response = await axios.post(url, {}, { headers: { "Content-Type": "application/json" } });
    return response.data.replace(/\"/g, ""); // Remove wrapping quotes
  } catch (error) {
    console.error("❌ Error getting API token:", error.message);
    return null;
  }
}

// ✅ Function to Push Data to API
async function pushDataToAPI(submission) {
  try {
    const authToken = await getAuthToken();
    if (!authToken) {
      console.error("🚨 No Auth Token: Aborting API request.");
      return;
    }

    const payload = {
      surveyCode: SURVEY_CODE,
      sendAlerts: true,
      name: "Contact Form Submission",
      notificationEmails: NOTIFICATION_EMAILS,
      UniqueRequestKey: `UniqueKey-${new Date().toISOString()}`,
      Respondents: [
        {
          CompletedDate: new Date().toISOString(),
          StartedDate: new Date().toISOString(),
          Language: "en",
          Responses: submission,
        },
      ],
    };

    const response = await axios.post(`${API_ENDPOINT}/importRequest`, payload, {
      headers: {
        "Content-Type": "application/json",
        "authentication-Token": authToken,
      },
    });

    console.log("✅ API Response:", response.data);
  } catch (error) {
    console.error("❌ Error sending data:", error.response ? error.response.data : error.message);
  }
}

// ✅ Home Route
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// ✅ Contact Page Route
app.get("/contact", (req, res) => res.render("contact", { name: "Guest" }));

// ✅ Resume Page Route
app.get("/resume", (req, res) => res.sendFile(path.join(__dirname, "public", "resume.html")));

// ✅ Handle Contact Form Submission
app.post("/submit-form", async (req, res) => {
  const { name, email, message } = req.body;
  const submissions = readData();
  const newEntry = { id: submissions.length + 1, name, email, message, createdAt: new Date() };

  submissions.push(newEntry);
  writeData(submissions);

  console.log("✅ Form Submission Saved:", newEntry);

  // ✅ Push to API
  await pushDataToAPI(newEntry);

  res.render("thank-you", { name });
});

// ✅ Admin Panel Route
app.get("/admin", (req, res) => {
  const submissions = readData();
  res.render("admin", { contacts: submissions });
});

// ✅ Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
