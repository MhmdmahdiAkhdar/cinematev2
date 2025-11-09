import dotenv from "dotenv";
import express from "express";
import fetch from "node-fetch";
import pool from "../db/db_init.js";
import { verifyJWT } from "../routers/auth.js";


dotenv.config();
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = process.env.TMDB_BASE_URL;


const seriesRouter = express.Router();


seriesRouter.get("/:id", verifyJWT, async (req, res) => {
  try {
    const mediaId = req.params.id;
    const seasonPage = parseInt(req.query.seasonPage) || 1;
    const seasonsPerPage = 5;
    const episodePage = parseInt(req.query.episodePage) || 1;
    const episodesPerPage = 5;
    const selectedSeason = parseInt(req.query.season) || null;

    const sql = "SELECT * FROM media WHERE id = ?";
    pool.query(sql, [mediaId], async (err, results) => {
      if (err) {
        console.error("❌ Database error:", err);
        return res.status(500).send("Internal Server Error");
      }
      if (!results || results.length === 0) {
        return res.status(404).send("Media not found");
      }

      const media = results[0];

      const mediaRes = await fetch(
        `${TMDB_BASE_URL}/${media.type === "SHOW" ? "tv" : "movie"}/${mediaId}?api_key=${TMDB_API_KEY}&language=en-US`
      );
      const mediaData = await mediaRes.json();

      mediaData.genres = mediaData.genres ? mediaData.genres.map(g => g.name) : [];
      mediaData.poster = `https://image.tmdb.org/t/p/w500${mediaData.poster_path}`;
      mediaData.backdrop = `https://image.tmdb.org/t/p/original${mediaData.backdrop_path}`;
      mediaData.language = mediaData.original_language ? mediaData.original_language.toUpperCase() : "N/A";
      mediaData.rating = mediaData.vote_average || 0;
      mediaData.status = mediaData.status || "N/A";

      if (media.type === "SHOW") {
        mediaData.seasons = Array.isArray(mediaData.seasons) ? mediaData.seasons : [];
        mediaData.episode_count = mediaData.number_of_episodes ||
          (mediaData.seasons ? mediaData.seasons.reduce((sum, s) => sum + (s.episode_count || 0), 0) : 0);

        const totalSeasons = mediaData.seasons.length;
        const startIndex = (seasonPage - 1) * seasonsPerPage;
        const endIndex = startIndex + seasonsPerPage;
        mediaData.paginatedSeasons = mediaData.seasons.slice(startIndex, endIndex);
        mediaData.totalSeasonPages = Math.ceil(totalSeasons / seasonsPerPage);
        mediaData.currentSeasonPage = seasonPage;

        let seasonNumber = selectedSeason || (mediaData.seasons[0] ? mediaData.seasons[0].season_number : 1);
        const seasonRes = await fetch(
          `${TMDB_BASE_URL}/tv/${mediaId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const seasonData = await seasonRes.json();
        let episodes = Array.isArray(seasonData.episodes) ? seasonData.episodes : [];
        episodes.forEach(ep => ep.season_number = seasonNumber);

        const totalEpisodes = episodes.length;
        const episodeStart = (episodePage - 1) * episodesPerPage;
        const episodeEnd = episodeStart + episodesPerPage;
        mediaData.paginatedEpisodes = episodes.slice(episodeStart, episodeEnd);
        mediaData.totalEpisodePages = Math.ceil(totalEpisodes / episodesPerPage);
        mediaData.currentEpisodePage = episodePage;
        mediaData.selectedSeason = seasonNumber;

        const creditsRes = await fetch(
          `${TMDB_BASE_URL}/tv/${mediaId}/credits?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const credits = await creditsRes.json();
        mediaData.cast = credits.cast ? credits.cast.slice(0, 10) : [];

      } else { 
        mediaData.seasons = [];
        mediaData.episode_count = 1;
        mediaData.paginatedEpisodes = [{
          episode_number: 1,
          name: mediaData.title,
          overview: mediaData.overview,
          air_date: mediaData.release_date,
          still_path: mediaData.poster_path
        }];
        mediaData.totalEpisodePages = 1;
        mediaData.currentEpisodePage = 1;
        mediaData.selectedSeason = 1;

        const creditsRes = await fetch(
          `${TMDB_BASE_URL}/movie/${mediaId}/credits?api_key=${TMDB_API_KEY}&language=en-US`
        );
        const credits = await creditsRes.json();
        mediaData.cast = credits.cast ? credits.cast.slice(0, 10) : [];
      }

      res.render("series-details", { series: mediaData });
    });
  } catch (err) {
    console.error("❌ Error fetching media details:", err);
    res.status(500).send("Internal Server Error");
  }
});

// Get all comments for a media item
seriesRouter.get("/:id/comments", (req, res) => {
  const { id } = req.params;

  // Adjust to match your actual users table column (e.g., "name")
  const sql = `
    SELECT 
      c.id, 
      c.comment_text, 
      c.created_at, 
      c.user_id,
      u.first_name AS username
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.media_id = ?
    ORDER BY c.created_at DESC
  `;

  pool.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error fetching comments:", err);
      return res.status(500).json({ message: "Error fetching comments" });
    }
    res.json(results);
  });
});

// Add a new comment
seriesRouter.post("/:id/comments", verifyJWT, (req, res) => {
  const { id } = req.params;
  const { comment_text } = req.body;
  const userId = req.user.id;

  if (!comment_text?.trim()) {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  const sql = "INSERT INTO comments (user_id, media_id, comment_text) VALUES (?, ?, ?)";
  pool.query(sql, [userId, id, comment_text], (err, results) => {
    if (err) {
      console.error("Error adding comment:", err);
      return res.status(500).json({ message: "Error adding comment" });
    }

    // Return the inserted comment
    const insertedComment = {
      id: results.insertId,
      comment_text,
      created_at: new Date(),
      user_id: userId,
      username: req.user.name // make sure JWT has "name"
    };
    res.status(201).json(insertedComment);
  });
});




export default seriesRouter;
