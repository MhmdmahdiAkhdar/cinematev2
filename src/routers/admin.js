import express from 'express';
import pool from '../db/db_init.js';
import { verifyJWT } from '../routers/auth.js';


const adminRouter = express.Router();


function verifyAdmin(userId) {
	return new Promise((resolve, reject) => {
		const sql = "SELECT id FROM users WHERE id = ? AND role = 'ADMIN'";
		pool.query(sql, [userId], (err, results) => {
			if (err) {
				console.error("DB error:", err);
				return reject(err);
			}
			resolve(results.length > 0);
		});
	});
}



adminRouter.get("/", verifyJWT, async (req, res) => {
	try {
		const isAdmin = await verifyAdmin(req.user.id);
		if (!isAdmin) {
			res.status(403).send("Forbidden");
		}
		const queries = {
			numUsers: "SELECT COUNT(*) AS total FROM users",
			numFinished: "SELECT COUNT(*) AS total FROM progress WHERE progress_percent = 100",
			numWatching: "SELECT COUNT(*) AS total FROM progress WHERE progress_percent > 0 AND progress_percent < 100",
			numPlanned: "SELECT COUNT(*) AS total FROM progress WHERE progress_percent = 0"
		};
		const results = await Promise.all([
			new Promise((resolve, reject) => pool.query(queries.numUsers, (err, rows) => err ? reject(err) : resolve(rows[0].total))),
			new Promise((resolve, reject) => pool.query(queries.numFinished, (err, rows) => err ? reject(err) : resolve(rows[0].total))),
			new Promise((resolve, reject) => pool.query(queries.numWatching, (err, rows) => err ? reject(err) : resolve(rows[0].total))),
			new Promise((resolve, reject) => pool.query(queries.numPlanned, (err, rows) => err ? reject(err) : resolve(rows[0].total))),
		]);
		const [numUsers, numFinished, numWatching, numPlanned] = results;
		res.render("admin", { numUsers, numFinished, numWatching, numPlanned });
	} catch (err) {
		console.error("Admin dashboard error:", err);
		res.status(500).send("Server error");
	}
});


adminRouter.post('/make_admin', verifyJWT, (req, res) => {
	if (verifyAdmin(req.user.id)) {
		const userEmail = req.body.userEmail;
		const sql = "UPDATE users SET role = 'ADMIN' WHERE email = ?";
		pool.query(sql, [userEmail], (err, results) => {
			if (err) {
				console.error("DB error:", err);
				return res.status(500).send("Server error");
			}
			if (results.affectedRows === 0) {
				return res.status(404).send("User not found");
			}
			res.redirect("/admin");
		});
	} else {
		res.status(403).send("Forbidden");
	}
});


export default adminRouter;