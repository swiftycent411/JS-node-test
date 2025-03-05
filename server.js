const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
require("dotenv").config(); // Load environment variables

const app = express();

// PostgreSQL Connection (Google Cloud SQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Disable SSL verification for Google Cloud
  },
});

// Test Database Connection
pool.query("SELECT VERSION()", (err, result) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to Google Cloud SQL:", result.rows[0].version);
  }
});

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
    await pool.query(
      "INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)",
      [name, email, message]
    );
    console.log("Saved to database:", { name, email, message });
    res.render("thank-you", { name });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).send("Error saving data.");
  }
});

// Admin Panel Route - Fetch & Display Contact Submissions
app.get("/admin", async (req, res) => {
    try {
      const result = await pool.query("SELECT * FROM contacts ORDER BY created_at DESC");
      res.render("admin", { contacts: result.rows }); // Pass data to EJS template
    } catch (err) {
      console.error("Database error:", err);
      res.status(500).send("Error fetching data.");
    }
  });
  

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));