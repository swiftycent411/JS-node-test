const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const app = express();

// ✅ Configure PostgreSQL Connection (No .env file)
const dbConfig = {
  user: process.env.PGUSER || "default_user",
  password: process.env.PGPASSWORD || "default_password",
  database: process.env.PGDATABASE || "default_db",
  host: process.env.PGHOST || `/cloudsql/geocode-02282024:us-west3:node-postgres`,
  port: process.env.PGPORT || 5432,
  ssl: false,  // ✅ Explicitly disable SSL for Cloud SQL
};

console.log("⚡ Database Connection Mode:", process.env.NODE_ENV);
console.log("🔗 Database Host:", dbConfig.host);

// ✅ Initialize PostgreSQL Pool
const pool = new Pool(dbConfig);

// ✅ Function to test database connection
async function testDatabaseConnection() {
  try {
    console.log("🔄 Testing DB Connection...");
    const result = await pool.query("SELECT VERSION()");
    console.log("✅ Connected to PostgreSQL:", result.rows[0].version);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
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

// ✅ Admin Panel Route
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

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🚨 Unexpected Error:", err.message);
  res.status(500).send("Something went wrong. Check server logs for details.");
});

// ✅ Start Server (Cloud Run requires PORT 8080)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
