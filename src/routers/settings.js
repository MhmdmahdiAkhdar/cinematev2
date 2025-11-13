import express from "express";
import pool from "../db/db_init.js";
import { verifyJWT } from "../routers/auth.js";


const settingsRouter = express.Router();


settingsRouter.get("/", verifyJWT, (req,res) => {
    res.render("settings");
});


settingsRouter.get("/password",verifyJWT, (req, res) => {
    res.render("password");
});


settingsRouter.get("/profile", verifyJWT, async (req,res) => {
    const userId = req.user.id;
    
    const sql = "SELECT id, first_name, last_name, email, avatar FROM users WHERE id = ?";
    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).send("Server error");
        }
        
        if (results.length === 0) {
            return res.status(404).send("User not found");
        }
        const userId = req.user.id;
        const user = results[0];
        res.render("profile", { user });
    });
});


export default settingsRouter;
