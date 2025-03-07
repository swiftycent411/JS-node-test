const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config(); // Load environment variables

const app = express();

// ✅ Determine if running in production (Cloud Run) or local development
const isProduction = process.env.NODE_ENV === "production";

// ✅ Configure PostgreSQL Connection (Disable SSL for Cloud SQL)
const dbConfig = {
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  host: process.env.PGHOST || process.env.DB_PUBLIC_IP,
  port: process.env.PGPORT || 5432,
  ssl: false, // ✅ Explicitly disable SSL
};

console.log("⚡ Database Connection Mode:", isProduction ? "Google Cloud SQL" : "Local PostgreSQL");
console.log("🔗 Database Host:", dbConfig.host);

console.log("⚡ Database Connection Mode:", isProduction ? "Google Cloud SQL" : "Local PostgreSQL");
console.log("🔗 Database Host:", dbConfig.host);

// ✅ Initialize PostgreSQL Pool
const pool = new Pool(dbConfig);

// ✅ Function to test database connection with retries
async function testDatabaseConnection(retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Attempting DB Connection (${attempt}/${retries})...`);
      const result = await pool.query("SELECT VERSION()");
      console.log("✅ Connected to PostgreSQL:", result.rows[0].version);
      return;
    } catch (err) {
      console.error(`❌ Database connection failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`🔁 Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error("🚨 All retries failed. Database connection could not be established.");
      }
    }
  }
}
testDatabaseConnection(); // Run on startup

// ✅ Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// ✅ Routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "public", "about.html")));
app.get("/contact", (req, res) => res.render("contact", { name: "Guest" }));

// ✅ Handle Contact Form Submission
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

// ✅ Admin Panel Route (View Contact Submissions)
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

// ✅ Global Error Handler (Prevents Server Crash)
app.use((err, req, res, next) => {
  console.error("🚨 Unexpected Error:", err.message);
  res.status(500).send("Something went wrong. Check server logs for details.");
});

// ✅ Start Server (Cloud Run requires PORT 8080)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
