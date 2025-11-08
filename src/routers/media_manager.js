import dotenv from "dotenv";
import express from 'express';
import pool from "../db/db_init.js";
import { verifyJWT } from '../routers/auth.js';


dotenv.config();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;


const mediaManagerRouter = express.Router();


mediaManagerRouter.get("/", verifyJWT, async (req, res) => {
	const sql = "SELECT * FROM media ORDER BY release_date DESC";
	pool.query(sql, (err, results) => {
		if (err) {
			console.error("❌ Error fetching data:", err);
			return res.status(500).json({ success: false, message: "Server error" });
		}
		res.json({ success: true, movies: results });
	});
});


mediaManagerRouter.get("/search", verifyJWT, async (req, res) => {
	try {
		const query = req.query.q?.trim();
		let sql = "SELECT * FROM media ORDER BY release_date DESC";
		let params = [];
		
		if (query) {
			sql = "SELECT * FROM media WHERE title LIKE ? ORDER BY release_date DESC";
			params = [`%${query}%`];
		}
		
		pool.query(sql, params, async (err, results) => {
			if (err) {
				console.error("❌ Error fetching movies:", err);
				return res.render("movie-grid", { movies: [] });
			}
			
			// if local DB empty then fallback to tmdb
			if ((!results || results.length === 0) && query) {
				try {
					const tmdbRes = await fetch(
						`${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
							query
						)}`
					);
					const tmdbData = await tmdbRes.json();
					
					if (!tmdbData.results?.length) {
						return res.render("movie-grid", { movies: [] });
					}
					
					// insert data into DB (async to avoid blocking)
					const insertSQL = `
						INSERT INTO media (id, title, type, description, release_date, poster_url)
						VALUES (?, ?, ?, ?, ?, ?)
						ON DUPLICATE KEY UPDATE
						description = VALUES(description),
						release_date = VALUES(release_date),
						poster_url = VALUES(poster_url)
					`;
					
					for (const m of tmdbData.results) {
						const data = [
							m.id,
							m.title,
							"MOVIE",
							m.overview || "",
							m.release_date || null,
							m.poster_path
							? `https://image.tmdb.org/t/p/w500${m.poster_path}`
							: null,
						];
						pool.query(insertSQL, data, (err) => {
							if (err) console.error("❌ Insert error:", err);
						});
					}
					
					const formatted = tmdbData.results.map((m) => ({
						title: m.title,
						type: "MOVIE",
						description: m.overview,
						release_date: m.release_date,
						poster_url: m.poster_path
						? `https://image.tmdb.org/t/p/w500${m.poster_path}`
						: null,
					}));
					
					return res.render("movie-grid", { movies: formatted });
				} catch (apiErr) {
					console.error("❌ TMDB API error:", apiErr);
					return res.render("movie-grid", { movies: [] });
				}
			}
			
			res.render("movie-grid", { movies: results });
		});
	} catch (err) {
		console.error("❌ Render error:", err);
		res.render("movie-grid", { movies: [] });
	}
});


mediaManagerRouter.get("/sync",verifyJWT, async (req, res) => {
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
		var existingMediaIds = {};
		
		for (const { path, type } of endpoints) {
			const response = await fetch(`${TMDB_BASE_URL}${path}?api_key=${TMDB_API_KEY}&language=en-US&page=1`);
			const data = await response.json();
			
			if (data && Array.isArray(data.results)) {
				const formatted = data.results.map(item => ({
					...item,
					media_type: type
				}));
				for (const item of formatted) {
					const key = `${item.id}-${item.media_type}`;
					if (existingMediaIds[key]) {
						continue;
					}
					existingMediaIds[key] = true;
					allMedia.push(item);
				}
			} else {
				console.warn(`⚠️ Skipped ${path} — invalid TMDB response:`, data);
			}
		}
		
		if (allMedia.length === 0) {
			return res.status(400).json({ success: false, message: "No media fetched from TMDB" });
		}
		console.log('First 10 media:', allMedia.slice(0, 10));
		
		let insertedCount = 0;
		
		for (const media of allMedia) {
			const title = media.title || media.name;
			if (!title) continue;
			
			const posterUrl = media.poster_path
			? `https://image.tmdb.org/t/p/w500${media.poster_path}`
			: null;
			
			const releaseDate = media.release_date || media.first_air_date || null;
			
			const insertSQL = `
				INSERT INTO media (id, title, type, description, release_date, poster_url)
				VALUES (?, ?, ?, ?, ?, ?)
				ON DUPLICATE KEY UPDATE
					description = VALUES(description),
					release_date = VALUES(release_date),
					poster_url = VALUES(poster_url)
			`;
			
			await new Promise(async (resolve) => {
				pool.query(
					insertSQL,
					[media.id, title, media.media_type, media.overview || "", releaseDate, posterUrl],
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


export default mediaManagerRouter;
