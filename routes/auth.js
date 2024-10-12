const express = require("express");
const fs = require("fs");
const router = express.Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const users = fs
    .readFileSync("./data/users.csv", "utf-8")
    .split("\n")
    .map((line) => {
      const [user, pass, tags] = line.split(",");
      return { user, pass, tags };
    });

  const foundUser = users.find(
    (u) => u.user === username && u.pass === password
  );

  if (foundUser) {
    req.session.username = username;

    // Check if the user already has selected genres
    if (!foundUser.tags || foundUser.tags.trim() === "") {
      // If no genres are selected, redirect to genre selection page
      res.redirect(`/auth/select-genres`);
    } else {
      // If genres are already selected, proceed to the homepage
      res.redirect(`/dramas/home`);
    }
  } else {
    res.send("Invalid credentials");
  }
});

// Render the genre selection page
router.get("/select-genres", (req, res) => {
  if (!req.session.username) {
    return res.redirect("/auth/login"); // Redirect to login if session doesn't exis
  }

  res.render("select-genres", { username: req.session.username });
});

// Handle genre selection
router.post("/select-genres", (req, res) => {
  const { genres } = req.body;
  const { username } = req.session;

  if (!genres || genres.length < 3) {
    return res.send("Please select at least 3 genres.");
  }

  // Load users and update the genres for the selected user
  let users = fs.readFileSync("./data/users.csv", "utf-8").split("\n");
  users = users.map((line) => {
    const [user, pass, tags] = line.split(",");
    if (user === username) {
      return `${user},${pass},${genres.join(" ")}`;
    }
    return line;
  });

  fs.writeFileSync("./data/users.csv", users.join("\n"));

  res.redirect(`/dramas/home`);
});

router.get("/logout", (req, res) => {
  res.redirect("/");
});

module.exports = router;
