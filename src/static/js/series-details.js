
const shareBtn = document.getElementById("sharebtn");
if (shareBtn) {
  shareBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert("✅ Page URL copied to clipboard!"))
      .catch(() => alert("❌ Failed to copy link."));
  });
}

const stars = document.querySelectorAll("#starRating span");
const ratingValue = document.getElementById("ratingValue");
const submitRating = document.getElementById("submitRating");
let selectedRating = 0;

function updateStarsDisplay(value) {
  stars.forEach(star => {
    star.style.color = star.dataset.value <= value ? "#FFD700" : "#888";
  });
}

stars.forEach(star => {
  star.addEventListener("mouseenter", () => updateStarsDisplay(parseInt(star.dataset.value)));
  star.addEventListener("mouseleave", () => updateStarsDisplay(selectedRating));
  star.addEventListener("click", () => {
    selectedRating = parseInt(star.dataset.value);
    ratingValue.textContent = `Your rating: ${selectedRating} / 10`;
  });
});

async function loadUserRating() {
  const mediaId = document.body.dataset.mediaId;
  try {
    const res = await fetch(`/series/${mediaId}/rating`);
    if (res.ok) {
      const data = await res.json();
      if (data.rating > 0) {
        selectedRating = data.rating;
        updateStarsDisplay(data.rating);
        ratingValue.textContent = `Your rating: ${data.rating} / 10`;
      }
    }
  } catch (err) {
    console.error("Error fetching user rating:", err);
  }
}

if (submitRating) {
  submitRating.addEventListener("click", async () => {
    if (selectedRating === 0) return alert("Please select a rating first!");
    const mediaId = document.body.dataset.mediaId;
    try {
      const res = await fetch(`/series/${mediaId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating })
      });
      if (res.ok) alert(`⭐ Rating submitted successfully! (${selectedRating}/10)`);
      else alert("❌ Error submitting rating.");
    } catch (err) {
      console.error("Rating error:", err);
      alert("⚠️ Network error submitting rating.");
    }
  });
}

loadUserRating();

const addCommentBtn = document.getElementById("addCommentBtn");
const newComment = document.getElementById("newComment");
const commentsContainer = document.querySelector(".comments-container");
const mediaId = document.body.dataset.mediaId;
const currentUserId = localStorage.getItem("userId");

async function loadComments() {
  if (!commentsContainer) return;
  try {
    const res = await fetch(`/series/${mediaId}/comments`);
    if (!res.ok) throw new Error("Failed to fetch comments");
    const comments = await res.json();
    commentsContainer.innerHTML = "";
    comments.forEach(c => {
      const commentCard = document.createElement("div");
      commentCard.classList.add("comment-card");
      commentCard.classList.add(c.user_id == currentUserId ? "user-right" : "user-left");
      commentCard.innerHTML = `
        <p class="comment-user"><strong>${c.username}:</strong></p>
        <p class="comment-text">${c.comment_text}</p>
        <p class="comment-date">${new Date(c.created_at).toLocaleDateString()}</p>
      `;
      commentsContainer.appendChild(commentCard);
    });
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

if (addCommentBtn) {
  addCommentBtn.addEventListener("click", async () => {
    const text = newComment.value.trim();
    if (!text) return alert("Comment cannot be empty");
    try {
      const res = await fetch(`/series/${mediaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: text })
      });
      if (res.ok) {
        newComment.value = "";
        await loadComments();
      } else alert("❌ Error adding comment.");
    } catch (err) {
      console.error("Add comment error:", err);
      alert("⚠️ Network error adding comment.");
    }
  });
}

loadComments();

const watchlistBtn = document.querySelector(".btn-primary");
const favoriteBtn = document.querySelector("#favoriteBtn");
const watchedBtn = document.querySelector(".btn-watched");
const episodeBtns = document.querySelectorAll(".btn-watched-ep");
const progressBar = document.querySelector(".progress-bar .progress span");

function updateBtn(btn, isActive, textActive, textInactive) {
  if (!btn) return;
  btn.textContent = isActive ? textActive : textInactive;
  btn.style.backgroundColor = isActive ? "#4caf50" : "";
  btn.style.boxShadow = isActive ? "0 2px 6px rgba(0,0,0,0.4)" : "";
}
function updateEpisodeBtn(btn, watched) {
  btn.textContent = watched ? "✓ Watched" : "✓ Mark as Watched";
  btn.style.backgroundColor = watched ? "#4caf50" : "";
  btn.style.boxShadow = watched ? "0 2px 6px rgba(0,0,0,0.4)" : "";
  btn.classList.toggle("watched", watched);
}

async function checkAndUpdate(url, btn, textActive, textInactive) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch button state");
    const data = await res.json();
    let isActive = false;
    if (btn === watchedBtn) isActive = Boolean(data.isWatched);
    else if (btn === watchlistBtn) isActive = Boolean(data.inWatchlist);
    else if (btn === favoriteBtn) isActive = Boolean(data.inFavorites);
    updateBtn(btn, isActive, textActive, textInactive);
  } catch (err) { console.error(err); }
}

if (watchlistBtn) {
  watchlistBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/series/${mediaId}/watchlist/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        updateBtn(watchlistBtn, data.inWatchlist, "✔ In Watchlist", "Add to Watchlist");
      }
    } catch (err) { console.error(err); }
  });
}

if (favoriteBtn) {
  favoriteBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/series/${mediaId}/favorites/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        updateBtn(favoriteBtn, data.inFavorites, "❤ Favorited", "❤ Add to Favorites");
      }
    } catch (err) { console.error(err); }
  });
}

if (watchedBtn) {
  watchedBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/series/${mediaId}/watched/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle watched");
      const data = await res.json();
      updateBtn(watchedBtn, data.isWatched, "✓ Watched", "✓ Mark as Watched");
    } catch (err) { console.error(err); }
  });
}

episodeBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    const season = btn.dataset.season;
    const episode = btn.dataset.episode;
    try {
      const res = await fetch(`/series/${mediaId}/episode/${season}/${episode}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle episode watched");
      const data = await res.json();
      btn.classList.toggle("watched", data.watched);
      updateProgressUI();
    } catch (err) { console.error(err); }
  });
});

function updateProgressUI() {
  const total = episodeBtns.length;
  const watchedCount = document.querySelectorAll(".btn-watched-ep.watched").length;
  const percent = total ? Math.round((watchedCount / total) * 100) : 0;
  if (progressBar) progressBar.textContent = percent + "%";
  const barContainer = document.querySelector(".progress-bar .progress");
  if (barContainer) barContainer.style.width = percent + "%";
}

async function loadWatchedEpisodes() {
  const mediaId = document.body.dataset.mediaId;
  try {
    const res = await fetch(`/series/${mediaId}/progress`);
    if (!res.ok) throw new Error("Failed to fetch progress");
    const data = await res.json();

    episodeBtns.forEach(btn => {
      const season = parseInt(btn.dataset.season);
      const episode = parseInt(btn.dataset.episode);
      const watched = data.watchedEpisodes.some(e => e.season_number === season && e.episode_number === episode);
      updateEpisodeBtn(btn, watched);
    });

    updateProgressUI();
  } catch (err) {
    console.error(err);
  }
}

episodeBtns.forEach(btn => {
  btn.addEventListener("click", async () => {
    const season = btn.dataset.season;
    const episode = btn.dataset.episode;
    if (!season || !episode) return console.error("Season or episode data missing");

    try {
      const res = await fetch(`/series/${mediaId}/episode/${season}/${episode}/toggle`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle episode watched");
      const data = await res.json();
      btn.classList.toggle("watched", data.watched);
      updateProgressUI();
    } catch (err) {
      console.error(err);
      alert("⚠️ Network error toggling episode watched.");
    }
  });
});


checkAndUpdate(`/series/${mediaId}/watchlist/check`, watchlistBtn, "✔ In Watchlist", "Add to Watchlist");
checkAndUpdate(`/series/${mediaId}/favorites/check`, favoriteBtn, "❤ Favorited", "❤ Add to Favorites");
checkAndUpdate(`/series/${mediaId}/watched/check`, watchedBtn, "✓ Watched", "✓ Mark as Watched");

loadWatchedEpisodes();
