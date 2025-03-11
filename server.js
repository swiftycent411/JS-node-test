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

// New API Variables for Maritz API
const MARITZ_API_ENDPOINT = "https://sampleapi.allegiancetech.com";
const COMPANY_NAME = "maritzresearch.allegiancetech.com";

const DATA_FILE = path.join(__dirname, "data.json");
const RESPONSES_FILE = path.join(__dirname, "responses.json");

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// ✅ Function to Read Data from JSON File
function readData(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("❌ Error reading data file:", err);
    return [];
  }
}

// ✅ Function to Write Data to JSON File
function writeData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Error writing data file:", err);
  }
}

// ✅ Function to Get API Token for Maritz API
async function getMaritzAuthToken() {
  try {
    console.log("🔍 Fetching Maritz API Token...");
    const url = `${MARITZ_API_ENDPOINT}/EmailImport.HttpService.svc/web/authenticate`;

    const payload = {
      userName: API_USERNAME,
      password: API_PASSWORD,
      companyName: COMPANY_NAME
    };

    const response = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("🔍 Raw API Response:", response.data);

    if (!response.data || !response.data.AuthenticateResult) {
      throw new Error("❌ Invalid token response from Maritz API");
    }

    const token = response.data.AuthenticateResult;
    console.log("✅ Authentication token received:", token);
    return token;
  } catch (error) {
    console.error("❌ Error getting Maritz API token:", error.message);
    return null;
  }
}

// ✅ Function to Fetch Survey Responses
const { parseStringPromise } = require("xml2js"); // Import XML parser

async function fetchSurveyResponses() {
  try {
    const authToken = await getMaritzAuthToken();
    if (!authToken) {
      console.error("🚨 No Auth Token: Aborting fetch request.");
      return [];
    }

    function formatDate(date) {
      return new Date(date).toISOString().replace("T", " ").split(".")[0]; // Convert to 'YYYY-MM-DD HH:mm:ss'
    }

    const fromDate = formatDate(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const toDate = formatDate(Date.now()); // Current date

    // ✅ Correctly formatted filter XML
    const filterXML = `<FilterDefinition>
      <FilterGroup GroupOperator="AND">
        <FilterCriteria>
          <FilterColumn>CompletedDate</FilterColumn>
          <FilterOperator>Between</FilterOperator>
          <FilterValue>${fromDate}</FilterValue>
          <FilterValue>${toDate}</FilterValue>
        </FilterCriteria>
      </FilterGroup>
    </FilterDefinition>`;

    const payload = JSON.stringify({
      token: authToken,
      surveyId: "312",
      filterXml: filterXML
    });

    console.log("🔍 Fetch Survey Payload:", payload);

    const response = await axios.post(
      `${MARITZ_API_ENDPOINT}/EmailImport.HttpService.svc/web/getResponsesBySurveyId`,
      payload,
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    console.log("✅ Raw API Response:", response.data);

    if (!response.data || typeof response.data !== "object") {
      console.error("❌ Unexpected response format:", response.data);
      return [];
    }

    const xmlString = response.data.GetResponsesBySurveyIdResult;
    if (!xmlString) {
      console.error("❌ No responses found in API response.");
      return [];
    }

    const parsedXml = await parseStringPromise(xmlString, { explicitArray: false });

    if (!parsedXml.Responses || !parsedXml.Responses.Response) {
      console.error("❌ No valid responses in parsed XML:", parsedXml);
      return [];
    }

    const responses = Array.isArray(parsedXml.Responses.Response)
      ? parsedXml.Responses.Response
      : [parsedXml.Responses.Response];

    console.log("✅ Parsed Responses:", responses);

    writeData(RESPONSES_FILE, responses);
    console.log("✅ Responses Fetched & Stored:", responses.length);

    return responses;
  } catch (error) {
    console.error("❌ Error fetching responses:", error.message, "| Full Error:", error.response ? error.response.data : "No response data");
    return [];
  }
}

// ✅ Function to Get API Token for Submission API
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
      sendAlerts: false,
      name: "Contact Form Submission",
      notificationEmails: NOTIFICATION_EMAILS,
      UniqueRequestKey: "UniqueKey-" + new Date().toISOString(),
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
  const submissions = readData(DATA_FILE);
  const newEntry = { id: submissions.length + 1, name, email, message, createdAt: new Date() };

  submissions.push(newEntry);
  writeData(DATA_FILE, submissions);

  console.log("✅ Form Submission Saved:", newEntry);

  // ✅ Push to API
  await pushDataToAPI(newEntry);

  res.render("thank-you", { name });
});

// ✅ Admin Panel Route
app.get("/admin", (req, res) => {
  const submissions = readData(DATA_FILE);
  res.render("admin", { contacts: submissions });
});

// ✅ Fetch responses and return JSON
app.get("/fetch-responses", async (req, res) => {
  console.log("🔍 Fetching survey responses...");
  const responses = await fetchSurveyResponses();
  console.log("🔍 API Fetched Responses:", responses.length);
  res.json(responses);
});

// ✅ Fetch Survey Responses and Display in EJS
app.get("/responses", async (req, res) => {
  console.log("📢 Fetching Responses...");

  let responses = readData(RESPONSES_FILE);
  if (responses.length === 0) {
    responses = await fetchSurveyResponses();
    writeData(RESPONSES_FILE, responses);
  }

  res.render("responses", { responses });
});

// ✅ Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
