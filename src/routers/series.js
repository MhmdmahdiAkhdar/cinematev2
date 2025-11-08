import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";


dotenv.config();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;


const seriesRouter = express.Router();


seriesRouter.get("/:id", async (req, res) => {
	try {
		const seriesId = req.params.id;
		
		const seriesRes = await fetch(
			`${TMDB_BASE_URL}/tv/${seriesId}?api_key=${TMDB_API_KEY}&language=en-US`
		);
		const series = await seriesRes.json();
		
		series.genres = series.genres ? series.genres.map(g => g.name) : [];
		series.poster = `https://image.tmdb.org/t/p/w500${series.poster_path}`;
		series.backdrop = `https://image.tmdb.org/t/p/original${series.backdrop_path}`;
		series.language = series.original_language
		? series.original_language.toUpperCase()
		: "N/A";
		series.rating = series.vote_average || 0;
		series.status = series.status || "Unknown";
		series.seasons = Array.isArray(series.seasons) ? series.seasons : [];
		series.episode_count =
		series.number_of_episodes ||
		(series.seasons ? series.seasons.reduce((sum, s) => sum + (s.episode_count || 0), 0) : 0);
		
		
		const creditsRes = await fetch(
			`${TMDB_BASE_URL}/tv/${seriesId}/credits?api_key=${TMDB_API_KEY}&language=en-US`
		);
		const credits = await creditsRes.json();
		
		series.cast = credits.cast ? credits.cast.slice(0, 10) : [];
		res.render("series-details", { series });
	} catch (err) {
		console.error("❌ Error fetching series details:", err);
		res.status(500).send("Internal Server Error");
	}
});


export default seriesRouter;
