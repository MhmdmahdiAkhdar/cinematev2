import path from "path";
import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { createDatabase } from "./db/db_setup.js";
import seriesRouter from "./routers/series.js";
import settingsRouter from "./routers/settings.js";
import { authRouter, verifyJWT } from "./routers/auth.js";
import mediaManagerRouter from "./routers/media_manager.js";


dotenv.config();

createDatabase();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "./static")));
app.set("views", path.join(__dirname, "./pages"));
app.set("view engine", "ejs");
app.use("/users_profiles", express.static(path.join(__dirname, "../users_profiles")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Basic pages
app.get("/signup", (req, res) => {
	res.render("signup");
});
app.get("/login", (req,res)=>{
	res.render("login");
});
app.get("/dashboard",verifyJWT, (req, res) => {
	res.render("dashboard");
});


// Routing
app.get("/home", (req, res) => res.redirect("/dashboard"));
app.get("/", (req, res) => res.redirect("/signup"));
app.use("/api/auth", authRouter);
app.use('/series', seriesRouter);
app.use("/settings", settingsRouter);
app.use("/api/media", mediaManagerRouter);


app.listen(
	process.env.PORT,
	() => console.log(`Server is running on http://localhost:${process.env.PORT}`)
);
