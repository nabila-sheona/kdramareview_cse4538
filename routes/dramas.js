const express = require("express");
const fs = require("fs");
const router = express.Router();
const path = require("path");

router.get("/home", (req, res) => {
  const { username } = req.session;

  if (!username) {
    return res.redirect("/auth/login");
  }

  // Fetch user data from the CSV file
  const users = fs
    .readFileSync("./data/users.csv", "utf-8")
    .split("\n")
    .map((line) => {
      const [user, pass, genres] = line.split(",");
      return {
        user,
        genres: genres ? genres.split(/[ ,]+/).map((g) => g.trim()) : [],
      };
    });

  // Find the user
  const foundUser = users.find((u) => u.user === username);

  if (!foundUser) {
    return res.status(404).send("User not found");
  }

  // Get user's preferred genres (lowercased for comparison)
  const userGenres = foundUser.genres.map((genre) => genre.toLowerCase());

  // Fetch all dramas from the CSV file
  const dramas = fs
    .readFileSync("./data/dramas.csv", "utf-8")
    .split("\n")
    .map((line) => {
      const [name, genres, year, review] = line.split(",");
      if (!name || !genres) return null; // Skip invalid lines
      const genreArray = genres
        .split(/[ ,]+/)
        .map((g) => g.trim().toLowerCase()); // Split genres
      return {
        name,
        genres: genreArray,
        year,
        review,
        genreString: genreArray.join(", "), // Create a comma-separated genre string
      };
    })
    .filter((drama) => drama !== null); // Filter out invalid entries

  // Filter dramas based on user's preferred genres
  const matchedDramas = dramas.filter((drama) => {
    return drama.genres.some((genre) => userGenres.includes(genre)); // Check for matching genres
  });

  // Render the homepage with the matched dramas
  res.render("homepage", {
    username: username,
    dramas: matchedDramas, // Pass the matched dramas
  });
});

router.use((req, res, next) => {
  if (!req.session.username) {
    return res.redirect("/auth/login");
  }
  next();
});

// Helper function to check if a drama is in a specific status list
function isDramaInStatusList(username, dramaName, statusFile) {
  const filePath = path.join(__dirname, `../data/${statusFile}`);
  if (!fs.existsSync(filePath)) return false;
  const data = fs.readFileSync(filePath, "utf-8").trim();
  if (!data) return false;
  const lines = data.split("\n");
  return lines.some((line) => {
    const [user, drama] = line.split(",");
    return user === username && drama === dramaName;
  });
}
// Route to remove drama from wishlist
router.post("/remove-from-wishlist", (req, res) => {
  const { dramaName } = req.body; // Get the drama name from the request body
  const username = req.session.username;

  removeDramaFromStatusList(username, dramaName, "wishlist.csv");

  // Redirect back to the profile page
  res.redirect("/dramas/profile");
});

// Function to remove a drama from a specific status list
function removeDramaFromStatusList(username, dramaName, statusFile) {
  const filePath = path.join(__dirname, `../data/${statusFile}`);

  // Check if the file exists
  if (!fs.existsSync(filePath)) return;

  // Read the contents of the file
  const data = fs.readFileSync(filePath, "utf-8").trim();

  // Split the content into lines
  const lines = data.split("\n");

  // Filter the lines to remove the specified drama for the user
  const filteredLines = lines.filter((line) => {
    const [user, drama] = line.split(",").map((item) => item.trim()); // Trim spaces
    return !(user === username && drama === dramaName); // Check for match
  });

  // Write the filtered lines back to the file
  fs.writeFileSync(filePath, filteredLines.join("\n") + "\n");
}

// Route to add drama to wishlist
router.post("/:dramaName/add-to-wishlist", (req, res) => {
  const { dramaName } = req.params;
  const username = req.session.username;

  if (!isDramaInStatusList(username, dramaName, "wishlist.csv")) {
    fs.appendFileSync(
      path.join(__dirname, "../data/wishlist.csv"),
      `${username},${dramaName}\n`
    );
    // Optionally remove from other lists
  }

  res.redirect(`/dramas/${dramaName}`);
});

// Route to mark drama as watching
router.post("/:dramaName/mark-as-watching", (req, res) => {
  const { dramaName } = req.params;
  const username = req.session.username;

  if (!isDramaInStatusList(username, dramaName, "watching.csv")) {
    fs.appendFileSync(
      path.join(__dirname, "../data/watching.csv"),
      `${username},${dramaName}\n`
    );
    // Optionally remove from other lists

    removeDramaFromStatusList(username, dramaName, "watched.csv");
  }

  res.redirect(`/dramas/${dramaName}`);
});

// Route to mark drama as watched
// Route to mark drama as watched
router.post("/:dramaName/mark-as-watched", (req, res) => {
  const { dramaName } = req.params;
  const username = req.session.username;

  // Check if the user has already marked this drama as watched
  if (!isDramaInStatusList(username, dramaName, "watched.csv")) {
    // Add to watched list
    fs.appendFileSync(
      path.join(__dirname, "../data/watched.csv"),
      `${username},${dramaName}\n`
    );

    // Remove from watching list if it's there
    removeDramaFromStatusList(username, dramaName, "watching.csv");
  }

  // Redirect back to the drama page
  res.redirect(`/dramas/${dramaName}`);
});

// Route to display user profile with all reviewed dramas and their statuses
router.get("/profile", (req, res) => {
  const username = req.session.username;

  // Function to get dramas from a status file
  function getDramasFromStatusList(username, statusFile) {
    const filePath = path.join(__dirname, `../data/${statusFile}`);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, "utf-8").trim();
    if (!data) {
      return [];
    }
    const lines = data.split("\n");
    return lines
      .map((line) => {
        const [user, dramaName] = line.split(",");
        return user === username ? dramaName : null;
      })
      .filter((dramaName) => dramaName !== null);
  }

  // Function to get user's genres
  function getUserGenres() {
    const users = fs.readFileSync("./data/users.csv", "utf-8").split("\n");
    const foundUser = users.find((line) => {
      const [user] = line.split(",");
      return user === username;
    });
    if (!foundUser) return [];
    const [, , genres] = foundUser.split(",");
    return genres ? genres.split(/[ ,]+/).map((g) => g.trim()) : [];
  }

  const wishlist = getDramasFromStatusList(username, "wishlist.csv");
  const watching = getDramasFromStatusList(username, "watching.csv");
  const watched = getDramasFromStatusList(username, "watched.csv");
  const userGenres = getUserGenres();

  res.render("profile", {
    username,
    wishlist,
    watching,
    watched,
    userGenres,
  });
});

// Route to update user genres
router.post("/update-genres", (req, res) => {
  const { username } = req.session;
  const genres = req.body.genres || [];

  if (genres.length < 3) {
    return res.send("Please select at least 3 genres."); // Ensure at least 3 genres are selected
  }

  // Update genres in the users.csv
  let users = fs.readFileSync("./data/users.csv", "utf-8").split("\n");
  users = users.map((line) => {
    const [user, pass, existingGenres] = line.split(",");
    if (user === username) {
      return `${user},${pass},${genres.join(" ")}`;
    }
    return line;
  });

  fs.writeFileSync("./data/users.csv", users.join("\n"));
  res.redirect("/dramas/profile"); // Redirect back to profile
});
// Route to display all dramas with search functionality
// Route to display all dramas with search functionality
router.get("/all-dramas", (req, res) => {
  const username = req.session.username;
  const genreQuery = req.query.genre
    ? req.query.genre.trim().toLowerCase()
    : ""; // Get the genre from query

  // Fetch all dramas from the CSV file
  const dramas = fs
    .readFileSync(path.join(__dirname, "../data/dramas.csv"), "utf-8")
    .split("\n")
    .map((line) => {
      const [name, genres, year, review] = line.split(",");

      // Check if all required fields are present
      if (!name || !genres || !year || !review) {
        return null; // Skip this line if it's missing any field
      }

      return {
        name: name.trim(),
        genres: genres.trim(),
        year: year.trim(),
        review: review.trim(),
      };
    })
    .filter((drama) => drama !== null); // Filter out invalid entries

  // Filter dramas based on genre search if provided
  const filteredDramas = genreQuery
    ? dramas.filter((drama) => drama.genres.toLowerCase().includes(genreQuery))
    : dramas;

  // Render the all dramas page
  res.render("all-dramas", {
    username,
    dramas: filteredDramas,
  });
});

// Dynamic route for viewing and reviewing a drama
router.get("/:dramaName", (req, res) => {
  const { dramaName } = req.params;
  const username = req.session.username;

  // Fetch drama details
  const dramas = fs
    .readFileSync(path.join(__dirname, "../data/dramas.csv"), "utf-8")
    .split("\n")
    .map((line) => {
      const [name, genres, year, review] = line.split(","); // Ensure to include review
      return { name, genres, year, review }; // Return all fields
    });

  const drama = dramas.find((d) => d.name === dramaName);
  if (!drama) {
    return res.status(404).send("Drama not found");
  }

  // Fetch all reviews from reviews.csv
  const reviews = fs
    .readFileSync(path.join(__dirname, "../data/reviews.csv"), "utf-8")
    .split("\n")
    .map((line) => {
      const [user, drama, review, rating] = line.split(",");
      return { user, drama, review, rating };
    });

  // Find the user's review if it exists
  const userReview = reviews.find(
    (r) => r.user === username && r.drama === dramaName
  );
  // Route to add a review for a specific drama
  router.post("/:dramaName/add-review", (req, res) => {
    const { dramaName } = req.params;
    const username = req.session.username;
    const { review, rating } = req.body;

    // Check if the user has already reviewed this drama
    const reviews = fs
      .readFileSync(path.join(__dirname, "../data/reviews.csv"), "utf-8")
      .split("\n")
      .map((line) => {
        const [user, drama, review, rating] = line.split(",");
        return { user, drama, review, rating };
      });

    const existingReviewIndex = reviews.findIndex(
      (r) => r.user === username && r.drama === dramaName
    );

    if (existingReviewIndex !== -1) {
      // If review exists, update it
      reviews[existingReviewIndex].review = review;
      reviews[existingReviewIndex].rating = rating;
    } else {
      // If review does not exist, add new review
      reviews.push({ user: username, drama: dramaName, review, rating });
    }

    // Write the updated reviews back to the file
    const updatedReviews = reviews
      .map((r) => `${r.user},${r.drama},${r.review},${r.rating}`)
      .join("\n");
    fs.writeFileSync(
      path.join(__dirname, "../data/reviews.csv"),
      updatedReviews + "\n"
    );

    // Redirect back to the drama details page
    res.redirect(`/dramas/${dramaName}`);
  });

  // Check status
  const isInWishlist = isDramaInStatusList(username, dramaName, "wishlist.csv");
  const isWatching = isDramaInStatusList(username, dramaName, "watching.csv");
  const isWatched = isDramaInStatusList(username, dramaName, "watched.csv");

  // Display the page with drama details, the user's review (if exists), and all reviews
  res.render("drama-details", {
    drama,
    userReview: userReview || null,
    allReviews: reviews.filter((r) => r.drama === dramaName),
    username,
    isInWishlist,
    isWatching,
    isWatched,
  });
});

module.exports = router;
