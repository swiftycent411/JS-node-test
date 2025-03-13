# JS-node-test
Jon Swift Node.js Project with live API integration
1️⃣ Project Structure
/node_test
│── public/                # Static assets (CSS, client-side JS, images)
│── views/                 # EJS templates for dynamic pages
│── data.json              # Stores contact form submissions locally
│── server.js              # Main Express.js server file
│── .env                   # Environment variables (API credentials, endpoints)
│── Dockerfile             # Docker containerization for Cloud Run
│── package.json           # Node.js dependencies and scripts
│── README.md              # Project documentation


2️⃣ Backend: Node.js with Express
🟢 Express.js Server (server.js)
Handles static pages, form submissions, and API interactions.
Uses axios for external API calls.
Saves contact form submissions to data.json and sends data to InMoment eSaaS.
🚀 Middleware Setup
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const fs = require("fs");
const axios = require("axios");
require("dotenv").config(); // Load environment variables

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));



3️⃣ Pages & Navigation
🟢 Homepage (index.html)
Displays profile picture, title, and links to other pages.
<header>
    <img src="https://media.licdn.com/.../profile.jpg" class="profile-img">
    <h1>Welcome to Jon Swift's Website</h1>
</header>
<nav>
    <ul>
        <li><a href="/resume">Resume</a></li>
        <li><a href="/contact">Contact</a></li>
        <li><a href="/admin">Admin</a></li>
    </ul>
</nav>

🟢 Resume Page (resume.html)
Displays Jon Swift's resume as a PDF download.
app.get("/resume", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "resume.html"));
});


🟢 Contact Page (contact.ejs)
Includes a contact form that submits data via POST request.
<form action="/submit-form" method="POST">
    <input type="text" name="name" placeholder="Your Name">
    <input type="email" name="email" placeholder="Your Email">
    <textarea name="message" placeholder="Your Message"></textarea>
    <button type="submit">Submit</button>
</form>

🟢 Admin Page (admin.ejs)
Displays submitted contact form entries stored in data.json.



4️⃣ Contact Form Submission & API Integration
✅ Saving Data Locally
When a user submits the contact form, the data is stored in data.json:
function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (err) {
        console.error("❌ Error reading data file:", err);
        return [];
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (err) {
        console.error("❌ Error writing data file:", err);
    }
}




5️⃣ API Integration with InMoment eSaaS
✅ Step 1: Authenticate & Get API Token
Authenticates using API_USERNAME and API_PASSWORD.
Stores the token for subsequent requests.
async function getAuthToken() {
    try {
        const url = `${process.env.API_ENDPOINT}/Authenticate?username=${encodeURIComponent(process.env.API_USERNAME)}&password=${encodeURIComponent(process.env.API_PASSWORD)}`;
        const response = await axios.post(url, {}, { headers: { "Content-Type": "application/json" } });
        return response.data.replace(/\"/g, ""); // Remove wrapping quotes
    } catch (error) {
        console.error("❌ Error getting API token:", error.message);
        return null;
    }
}



✅ Step 2: Send Data to InMoment API
Sends contact form submissions to InMoment eSaaS API.
Includes metadata such as survey code & timestamps.
async function pushDataToAPI(submission) {
    try {
        const authToken = await getAuthToken();
        if (!authToken) {
            console.error("🚨 No Auth Token: Aborting API request.");
            return;
        }

        const payload = {
            surveyCode: process.env.SURVEY_CODE,
            sendAlerts: false,
            name: "Contact Form Submission",
            notificationEmails: process.env.NOTIFICATION_EMAILS,
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

        const response = await axios.post(`${process.env.API_ENDPOINT}/importRequest`, payload, {
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


✅ Step 3: Call API on Form Submission
app.post("/submit-form", async (req, res) => {
    const { name, email, message } = req.body;
    const submissions = readData();
    const newEntry = { id: submissions.length + 1, name, email, message, createdAt: new Date() };

    submissions.push(newEntry);
    writeData(submissions);

    console.log("✅ Form Submission Saved:", newEntry);

    // Push to API
    await pushDataToAPI(newEntry);

    res.render("thank-you", { name });
});




6️⃣ Survey Responses: Fetch & Display
✅ Fetch Responses from API
Retrieves and groups survey responses by RespondentId, organizing them into specific columns.
app.get("/responses", async (req, res) => {
    console.log("📢 Fetching Responses...");

    let responses = await fetchSurveyResponses();

    const groupedResponses = {};
    responses.forEach(response => {
        const respondentId = response.RespondentId;
        if (!groupedResponses[respondentId]) {
            groupedResponses[respondentId] = {
                SurveyId: response.SurveyId,
                RespondentId: response.RespondentId,
                Contact: "",
                Email: "",
                ResponseMemo: ""
            };
        }

        if (response.AnswerId === "101317") {
            groupedResponses[respondentId].Contact = response.ResponseText || "";
        }
        if (response.AnswerId === "101316") {
            groupedResponses[respondentId].Email = response.ResponseText || "";
        }
        if (response.AnswerId === "101315") {
            groupedResponses[respondentId].ResponseMemo = response.ResponseMemo || "";
        }
    });

    console.log("✅ Grouped Responses:", groupedResponses);
    res.render("responses", { groupedResponses });
});

7️⃣ Deployment Process
✅ Version Control with Git
git add .
git commit -m "Updated API integration"
git push origin Main

✅ Build & Push Docker Image
gcloud builds submit --tag gcr.io/geocode-02282024/node-test:latest

✅ Deploy to Cloud Run
gcloud run deploy node-test \
  --image=gcr.io/geocode-02282024/node-test:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="API_USERNAME=XXXXXXXXX,API_PASSWORD=XXXXXXXXX,API_ENDPOINT=https://dataimportapi.allegiancetech.com/api,SURVEY_CODE=XXXXX,NOTIFICATION_EMAILS=XXXX@XXXX>COM"


Expected Outcome
Users visit: Live Site.
Users submit the contact form.
Data is stored locally (data.json).
Data is pushed to InMoment eSaaS API.
InMoment sends alerts confirming receipt.



Final Notes
GitHub Actions or Cloud Build triggers can automate deployment.
Cloud Logging can be used for monitoring:
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=node-test" --limit=50 --format="table(timestamp, severity, textPayload)"



