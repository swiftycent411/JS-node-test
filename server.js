const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config(); // Load environment variables

const app = express();

// Determine Database Connection (Cloud SQL or Local)
const isProduction = process.env.NODE_ENV === "production";
const connectionString = isProduction ? process.env.CLOUD_DATABASE_URL : process.env.DATABASE_URL;

console.log("⚡ Database Connection Mode:", isProduction ? "Google Cloud SQL" : "Local PostgreSQL");

// Configure PostgreSQL Pool
const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // Enable SSL for Cloud SQL, disable for local
});

// Test Database Connection with Retry
async function testDatabaseConnection(retries = 5) {
  try {
    const result = await pool.query("SELECT VERSION()");
    console.log("✅ Connected to PostgreSQL:", result.rows[0].version);
  } catch (err) {
    console.error(`❌ Database connection error: ${err.message}`);
    if (retries > 0) {
      console.log(`🔄 Retrying in 5 seconds... (${retries} retries left)`);
      setTimeout(() => testDatabaseConnection(retries - 1), 5000);
    }
  }
}
testDatabaseConnection(); // Run on startup

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Home Route
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "public", "about.html")));
app.get("/contact", (req, res) => res.render("contact", { name: "Guest" }));

// Handle Contact Form Submission (Save to Database)
app.post("/submit-form", async (req, res) => {
  const { name, email, message } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3) RETURNING *",
      [name, email, message]
    );
    console.log("✅ Form Submission Saved:", result.rows[0]);
    res.render("thank-you", { name });
  } catch (err) {
    console.error("❌ Database error on submission:", err.message);
    res.status(500).send("Error saving data.");
  }
});

// Admin Panel Route - Fetch & Display Contact Submissions
app.get("/admin", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM contacts ORDER BY created_at DESC");
    console.log("📊 Retrieved", result.rows.length, "submissions.");
    res.render("admin", { contacts: result.rows });
  } catch (err) {
    console.error("❌ Database error on fetch:", err.message);
    res.status(500).send("Error fetching data.");
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
