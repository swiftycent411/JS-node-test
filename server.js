const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();

// ✅ Force the use of the correct database connection
const isProduction = process.env.NODE_ENV === "production";
const connectionString = isProduction
  ? `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.DB_PUBLIC_IP}:${process.env.PGPORT}/${process.env.PGDATABASE}`
  : process.env.DATABASE_URL;

// ✅ Print debug info
console.log("⚡ NODE_ENV:", process.env.NODE_ENV);
console.log("🔗 Using Connection String:", connectionString.replace(/:\/\/.*@/, "://[REDACTED]@"));

// ✅ Configure PostgreSQL Pool
const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false, // Cloud Run needs SSL
});

// ✅ Function to test database connection
async function testDatabaseConnection() {
  try {
    const result = await pool.query("SELECT VERSION()");
    console.log("✅ Connected to PostgreSQL:", result.rows[0].version);
  } catch (err) {
    console.error(`❌ Database connection error: ${err.message}`);
  }
}
testDatabaseConnection(); // Run on startup

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "public", "about.html")));
app.get("/contact", (req, res) => res.render("contact", { name: "Guest" }));

// Handle Contact Form Submission
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

// Admin Panel Route
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Unexpected Error:", err.message);
  res.status(500).send("Something went wrong. Check server logs for details.");
});

// Start Server (Cloud Run requires PORT 8080)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
