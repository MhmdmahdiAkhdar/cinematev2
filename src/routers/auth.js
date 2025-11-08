import path from "path";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import express from 'express';
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import pool from "../db/db_init.js";


dotenv.config();


const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;


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


authRouter.post("/signup", async(req, res) => {
	const defaultAvatar = "/assets/avatar.png";
	const { firstName, lastName, email, password, theme } = req.body;
	const checkUsersql="SELECT id FROM users WHERE email = ?";
	const sql ="INSERT INTO users (first_name, last_name, email, password, theme, avatar) VALUES (?, ?, ?, ?, ?, ?)";
	const criptedPassword = bcrypt.hashSync(password);
	pool.query(checkUsersql,[email], async(err,results)=>{
		if (err) {
			console.error("Signup DB error:", err);
			return res.status(500).json({ success: false, message: "Server error" });
		} else if(results.length != 0){
			console.log("Email already registered:", email);
			return res.status(400).json({ success: false, message: "Email already registered" });
		} else{
			pool.query(sql, [firstName, lastName, email, criptedPassword, theme || "light", defaultAvatar], (err, result) => {
				if (err) {
					return res.status(400).json({ success: false, message: "Error saving user" });
				}
				console.log("✅ User inserted");
				return res.json({ success: true,message: "User registered successfully"});
			});
		}
	});
});


authRouter.post("/login", async (req, res) => {
	const { email, password } = req.body;
	
	const sql = "SELECT id, email, password FROM users WHERE email = ?";
	pool.query(sql, [email], async (err, results) => {
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


authRouter.post("/change-password",verifyJWT, async (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const email= req.user.email;
	
	if (currentPassword === newPassword) {
		return res.status(400).json({ success: false, message: "Passwords should not match" });
	}
	
	const sql = "SELECT id, password FROM users WHERE email = ?";
	pool.query(sql, [email], async (err, results) => {
		if (err) return res.status(500).json({ success: false, message: "DB error" });
		if (results.length === 0) return res.status(404).json({ success: false, message: "User not found" });
		
		const user = results[0];
		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) return res.status(401).json({ success: false, message: "Current password is incorrect" });
		
		const newHashedPassword = bcrypt.hashSync(newPassword, 10);
		pool.query("UPDATE users SET password = ? WHERE id = ?", [newHashedPassword, user.id], (err) => {
			if (err) return res.status(500).json({ success: false, message: "Error updating password" });
			return res.json({ success: true, message: "Password updated successfully" });
		});
	});
});


authRouter.post("/logout", (req, res) => {
	res.clearCookie("token");
	res.json({ success: true, message: "Logged out successfully" });
});


authRouter.delete("/delete",verifyJWT, async (req,res)=>{
	const userId= req.user.id;
	const sql="Delete FROM users WHERE id=?";
	
	pool.query(sql,[userId],(err,result)=>{
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


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ dest: path.join(__dirname, "../../users_profiles") });

authRouter.put("/profile/pfp", verifyJWT, upload.single("avatar"), async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ success: false, message: "No file uploaded" });
	}
	
	const userId = req.user.id;
	const filePath = `/users_profiles/${req.file.filename}`;
	
	const sql = "UPDATE users SET avatar = ? WHERE id = ?";
	
	pool.query(sql, [filePath, userId], (err, result) => {
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


export default authRouter;
export { authRouter, verifyJWT };
