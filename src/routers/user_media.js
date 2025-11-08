import express from 'express';
import pool from "../db/db_init.js";
import { verifyJWT } from '../routers/auth.js';


const userMediaRouter = express.Router();


userMediaRouter.get('/watchlist', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT media.* FROM media
        JOIN watchlist ON media.id = watchlist.media_id
        WHERE watchlist.user_id = ?
        ORDER BY watchlist.added_at DESC
    `;
    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).send("Server error");
        }
        res.render("watchlist", { movies: results });
    });
});
userMediaRouter.delete('/watchlist/:mediaId', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const mediaId = req.params.mediaId;
    const sql = "DELETE FROM watchlist WHERE user_id = ? AND media_id = ?";
    pool.query(sql, [userId, mediaId], (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).send("Server error");
        }
        res.json({ success: true });
    });
})


userMediaRouter.get('/finished', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT media.*, progress.progress_percent FROM media
        JOIN progress ON media.id = progress.media_id
        WHERE progress.user_id = ?
        AND progress.progress_percent = 100
        ORDER BY progress.updated_at DESC
    `
    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).send("Server error");
        }
        res.render("finished", { movies: results });
    });
})


userMediaRouter.get('/watching', verifyJWT, async (req, res) => {
    const userId = req.user.id;
    const sql = `
        SELECT
            media.*,
            progress.progress_percent
        FROM media
        JOIN progress ON media.id = progress.media_id
        WHERE progress.user_id = ?
        AND progress.progress_percent < 100
        ORDER BY progress.updated_at DESC
    `
    pool.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("DB error:", err);
            return res.status(500).send("Server error");
        }
        res.render("watching", { movies: results });
    });
})


export default userMediaRouter;
