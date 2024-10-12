const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session"); // Import express-session for handling sessions
const authRoutes = require("./routes/auth"); // Import authentication routes
const dramaRoutes = require("./routes/dramas"); // Import drama-related routes
const hbs = require("hbs");
const path = require("path");

const app = express();

// Register the 'eq' helper
hbs.registerHelper("eq", function (a, b) {
  return a === b;
});

hbs.registerHelper("arrayContains", function (array, value) {
  return array && array.includes(value);
});

// Session setup
app.use(
  session({
    secret: "sheona", // Use a strong secret key in production
    resave: false, // Do not force session save if unmodified
    saveUninitialized: true, // Save uninitialized sessions
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Body parser middleware to handle form data
app.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(express.json()); // Parse JSON bodies

// Serve static files from the 'public' directory (for CSS, images, JS)
app.use(express.static(path.join(__dirname, "public")));

// Set the view engine to hbs (Handlebars)
app.set("view engine", "hbs");

// Optional: Register partials if you're using Handlebars partials
// hbs.registerPartials(path.join(__dirname, "views", "partials"));

// Routes
app.use("/auth", authRoutes); // Authentication-related routes
app.use("/dramas", dramaRoutes); // Drama-related routes

// Default route to render the login page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html")); // Serve the login page from the 'views' directory
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
