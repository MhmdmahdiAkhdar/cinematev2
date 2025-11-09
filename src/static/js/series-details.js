// ====== Share Button ======
const shareBtn = document.getElementById("sharebtn");
if (shareBtn) {
  shareBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => alert("✅ Page URL copied to clipboard!"))
      .catch(() => alert("❌ Failed to copy link."));
  });
}

// ====== Star Rating Logic ======
const stars = document.querySelectorAll("#starRating span");
const ratingValue = document.getElementById("ratingValue");
const submitRating = document.getElementById("submitRating");
let selectedRating = 0;

function updateStarsDisplay(value) {
  stars.forEach(star => {
    star.style.color = star.dataset.value <= value ? "#FFD700" : "#888";
  });
}

if (stars.length > 0) {
  stars.forEach(star => {
    star.addEventListener("mouseenter", () => updateStarsDisplay(parseInt(star.dataset.value)));
    star.addEventListener("mouseleave", () => updateStarsDisplay(selectedRating));
    star.addEventListener("click", () => {
      selectedRating = parseInt(star.dataset.value);
      ratingValue.textContent = `Your rating: ${selectedRating} / 10`;
    });
  });
}

if (submitRating) {
  submitRating.addEventListener("click", async () => {
    if (selectedRating === 0) return alert("Please select a rating first!");
    const mediaId = document.body.dataset.mediaId;

    try {
      const res = await fetch(`/ratings/${mediaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selectedRating })
      });
      if (res.ok) alert("⭐ Rating submitted successfully!");
      else alert("❌ Error submitting rating.");
    } catch (err) {
      console.error("Rating error:", err);
      alert("⚠️ Network error submitting rating.");
    }
  });
}

const addCommentBtn = document.getElementById("addCommentBtn");
const newComment = document.getElementById("newComment");
const commentsContainer = document.querySelector(".comments-container");
const mediaId = document.body.dataset.mediaId;
const currentUserId = localStorage.getItem("userId");

// Load comments on page load
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

      if (c.user_id == currentUserId) {
        commentCard.classList.add("user-right");
      }

      commentCard.innerHTML = `
        <p class="comment-user"><strong>${c.username}:</strong></p>
        <p class="comment-text">${c.comment_text}</p>
        <p class="comment-date">${new Date(c.created_at).toLocaleDateString()}</p>
      `;
      commentsContainer.appendChild(commentCard);
    });
  } catch (err) {
    console.error(err);
  }
}

// Post a new comment
if (addCommentBtn) {
  addCommentBtn.addEventListener("click", async () => {
    const text = newComment.value.trim();
    if (!text) return alert("Please write a comment first!");

    try {
      const res = await fetch(`/series/${mediaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: text }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      const comment = await res.json();
      newComment.value = "";

      // Append new comment to container
      const commentCard = document.createElement("div");
      commentCard.classList.add("comment-card");
      if (comment.user_id == currentUserId) commentCard.classList.add("user-right");

      commentCard.innerHTML = `
        <p class="comment-user"><strong>${comment.username}:</strong></p>
        <p class="comment-text">${comment.comment_text}</p>
        <p class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</p>
      `;
      commentsContainer.prepend(commentCard);
    } catch (err) {
      console.error(err);
      alert("Error posting comment.");
    }
  });
}

// Initial load
loadComments();
