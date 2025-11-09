
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

      if (res.ok) {
        alert(`⭐ Rating submitted successfully! (${selectedRating}/10)`);
      } else {
        alert("❌ Error submitting rating.");
      }
    } catch (err) {
      console.error("Rating error:", err);
      alert("⚠️ Network error submitting rating.");
    }
  });
}

// Initialize
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

      if (c.user_id == currentUserId) commentCard.classList.add("user-right");

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
      } else {
        alert("❌ Error adding comment.");
      }
    } catch (err) {
      console.error("Add comment error:", err);
      alert("⚠️ Network error adding comment.");
    }
  });
}

loadComments();

const watchlistBtn = document.querySelector(".btn-primary");
const favoriteBtn = document.querySelector(".btn-favorite");
const watchedBtn = document.querySelector(".btn-watched");
function updateBtn(btn, isActive, textActive, textInactive) {
  if (!btn) return;
  if (isActive) {
    btn.textContent = textActive;
    btn.style.backgroundColor = "#4caf50";
    btn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.4)";
  } else {
    btn.textContent = textInactive;
    btn.style.backgroundColor = "";
    btn.style.boxShadow = "";
  }
}

// === WATCHLIST ===
async function checkWatchlist() {
  try {
    const res = await fetch(`/series/${mediaId}/watchlist/check`);
    if (res.ok) {
      const data = await res.json();
      updateBtn(watchlistBtn, data.inWatchlist, "✔ In Watchlist", "Add to Watchlist");
    }
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

// === FAVORITES ===
async function checkFavorites() {
  try {
    const res = await fetch(`/series/${mediaId}/favorites/check`);
    if (res.ok) {
      const data = await res.json();
      updateBtn(favoriteBtn, data.inFavorites, "❤ Favorited", "❤ Add to Favorites");
    }
  } catch (err) { console.error(err); }
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

// === WATCHED ===
async function checkWatched() {
  try {
    const res = await fetch(`/series/${mediaId}/watched/check`);
    if (res.ok) {
      const data = await res.json();
      updateBtn(watchedBtn, data.isWatched, "✓ Watched", "✓ Mark as Watched");
    }
  } catch (err) { console.error(err); }
}

if (watchedBtn) {
  watchedBtn.addEventListener("click", async () => {
    try {
      const res = await fetch(`/series/${mediaId}/watched/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        updateBtn(watchedBtn, data.isWatched, "✓ Watched", "✓ Mark as Watched");
      }
    } catch (err) { console.error(err); }
  });
}


checkWatchlist();
checkFavorites();
checkWatched();
