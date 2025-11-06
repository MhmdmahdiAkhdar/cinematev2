import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import db from "./db.js";
import fetch from "node-fetch";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import multer from "multer";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../frontend")));
app.set("views", path.join(__dirname, "../frontend/ejs"));
app.set("view engine", "ejs");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "../frontend/uploads")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

const verifyJWT = (req,res,next)=>{
  const token = req.cookies.token;
  if(!token){
    return res.redirect("/login");
  }

  try{
    const decoded = jwt.verify(token,JWT_SECRET);
    req.user =decoded;
    next();
  }catch(err){
    return res.redirect("/login");
  }
};

app.get("/", (req, res) => res.redirect("/signup"));

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/api/auth/signup", async(req, res) => {
  const defaultAvatar = "/assets/avatar.png";
  const { firstName, lastName, email, password, theme } = req.body;
  const checkUsersql="SELECT id FROM users WHERE email = ?";
  const sql ="INSERT INTO users (first_name, last_name, email, password, theme, avatar) VALUES (?, ?, ?, ?, ?, ?)";
  const criptedPassword = bcrypt.hashSync(password);
  db.query(checkUsersql,[email],(err,results)=>{
   if (err) {
      console.error("Signup DB error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }else if(results.length != 0){
      console.log("Email already registered:", email);
      return res.status(400).json({ success: false, message: "Email already registered" });
    }else{
      db.query(sql, [firstName, lastName, email, criptedPassword, theme || "light", defaultAvatar], (err, result) => {
        if (err) {
          return res.status(400).json({ success: false, message: "Error saving user" });
        }
        console.log("✅ User inserted");
        return res.json({ success: true,message: "User registered successfully"});
      });
    }
  });
});

app.get("/login", (req,res)=>{
    res.render("login");
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT id, email, password FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    if (results.length === 0) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });
    const token = jwt.sign({id:user.id,email:user.email}, JWT_SECRET,{expiresIn:"2h"});
    res.cookie("token",token,{
      httpOnly: true,
      secure:false,
      sameSite:"lax",
      maxAge:2*60*60*1000,
    });
    res.json({ success: true, message: "Login successful", user: { id: user.id, email: user.email } });
  });
});



app.get("/dashboard",verifyJWT, (req, res) => {
  res.render("dashboard");
});

app.get("/api/media",verifyJWT, (req, res) => {
  const sql = "SELECT * FROM media ORDER BY release_date DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error fetching data:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }
    res.json({ success: true, movies: results });
  });
});

app.get("/api/media/search",verifyJWT, async (req, res) => {
  try {
    const query = req.query.q?.trim();
    if (!query) return res.json({ success: false, movies: [] });

    const dbSql = "SELECT * FROM media WHERE title LIKE ? ORDER BY release_date DESC";
    db.query(dbSql, [`%${query}%`], async (err, results) => {
      if (err) {
        console.error("❌ DB search error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }

      if (results.length > 0) {
        return res.json({ success: true, movies: results });
      }

      try {
        const tmdbRes = await fetch(`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        const tmdbData = await tmdbRes.json();

        if (!tmdbData.results || tmdbData.results.length === 0) {
          return res.json({ success: true, movies: [] });
        }

        const moviesToInsert = tmdbData.results.map(movie => [
          movie.title,
          'MOVIE',
          movie.overview || "",
          movie.release_date || null,
          movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
        ]);

        const insertSQL = `
          INSERT INTO media (title, type, description, release_date, poster_url)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            description = VALUES(description),
            release_date = VALUES(release_date),
            poster_url = VALUES(poster_url)
        `;

        for (const movie of moviesToInsert) {
          db.query(insertSQL, movie, err => {
            if (err) console.error("❌ DB insert error:", err);
          });
        }

        return res.json({ success: true, movies: tmdbData.results.map(m => ({
          title: m.title,
          description: m.overview,
          release_date: m.release_date,
          poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null
        })) });

      } catch (tmdbErr) {
        console.error("❌ TMDB search error:", tmdbErr);
        return res.status(500).json({ success: false, message: "TMDB search error" });
      }
    });

  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



app.get("/api/media/sync",verifyJWT, async (req, res) => {
  try {
    const endpoints = [
      { path: "/movie/popular", type: "MOVIE" },
      { path: "/movie/top_rated", type: "MOVIE" },
      { path: "/movie/now_playing", type: "MOVIE" },
      { path: "/movie/upcoming", type: "MOVIE" },
      { path: "/tv/popular", type: "SHOW" },
      { path: "/tv/top_rated", type: "SHOW" },
      { path: "/tv/on_the_air", type: "SHOW" },
      { path: "/tv/airing_today", type: "SHOW" },
    ];

    let allMedia = [];

    for (const { path, type } of endpoints) {
      const response = await fetch(`${TMDB_BASE_URL}${path}?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
      const data = await response.json();

      if (data && Array.isArray(data.results)) {
        const formatted = data.results.map(item => ({
          ...item,
          media_type: type
        }));
        allMedia = allMedia.concat(formatted);
      } else {
        console.warn(`⚠️ Skipped ${path} — invalid TMDB response:`, data);
      }
    }

    if (allMedia.length === 0) {
      return res.status(400).json({ success: false, message: "No media fetched from TMDB" });
    }

    let insertedCount = 0;

    for (const media of allMedia) {
      const title = media.title || media.name;
      if (!title) continue;

      const posterUrl = media.poster_path
        ? `https://image.tmdb.org/t/p/w500${media.poster_path}`
        : null;

      const releaseDate = media.release_date || media.first_air_date || null;

      const insertSQL = `
        INSERT INTO media (title, type, description, release_date, poster_url)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          description = VALUES(description),
          release_date = VALUES(release_date),
          poster_url = VALUES(poster_url)
      `;

      await new Promise((resolve) => {
        db.query(
          insertSQL,
          [title, media.media_type, media.overview || "", releaseDate, posterUrl],
          (err) => {
            if (err) {
              console.error("❌ DB insert error:", err);
              return resolve();
            }
            insertedCount++;
            resolve();
          }
        );
      });
    }

    console.log(`✅ Synced ${insertedCount} items from TMDB`);
    res.json({ success: true, message: `Synced ${insertedCount} media items` });

  } catch (error) {
    console.error("❌ TMDB sync error:", error);
    res.status(500).json({ success: false, message: "Error syncing media" });
  }
});

app.get("/settings", verifyJWT, (req,res) => {
  res.render("settings");
});

app.get("/settings/password",verifyJWT, (req, res) => {
  res.render("password");
});

app.post("/api/auth/change-password",verifyJWT, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const email= req.user.email;

  if (currentPassword === newPassword) {
    return res.status(400).json({ success: false, message: "Passwords should not match" });
  }

  const sql = "SELECT id, password FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "DB error" });
    if (results.length === 0) return res.status(404).json({ success: false, message: "User not found" });

    const user = results[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    const newHashedPassword = bcrypt.hashSync(newPassword, 10);
    db.query("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, user.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: "Error updating password" });
      return res.json({ success: true, message: "Password updated successfully" });
    });
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true, message: "Logged out successfully" });
});

app.delete("/api/auth/delete",verifyJWT,(req,res)=>{
    const userId= req.user.id;
    const sql="Delete FROM users WHERE id=?";

    db.query(sql,[userId],(err,result)=>{
        if(err){
            console.error("could not delete account");
            return res.status(500).json({ success: false, message: "Server error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ success: false, message: "User not found" });
        }
        res.clearCookie("token");
        res.json({ success: true, message: "Account deleted successfully" });
    });
});

const upload = multer({ dest: path.join(__dirname, "../frontend/uploads/") });


app.get("/settings/profile", verifyJWT, (req,res) => {
  const userId = req.user.id;

  const sql = "SELECT id, first_name, last_name, email, avatar FROM users WHERE id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).send("Server error");
    }

    if (results.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = results[0];
    res.render("profile", { user });
  });
});

app.put("/api/auth/profile/pfp", verifyJWT, upload.single("avatar"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  const userId = req.user.id;
  const filePath = `/uploads/${req.file.filename}`;

  const sql = "UPDATE users SET avatar = ? WHERE id = ?";

  db.query(sql, [filePath, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    } else {
      res.json({
        success: true,
        message: "Profile picture updated successfully",
        avatar: filePath,
      });
    }
  });
});

app.use("/uploads", express.static("uploads"));








app.listen(5000, () => console.log(" Server running on http://localhost:5000"));
