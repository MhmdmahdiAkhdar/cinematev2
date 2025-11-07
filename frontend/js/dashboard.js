const moviesContainer = document.getElementById("movies-container");

async function fetchMedia() {
  moviesContainer.innerHTML = "<p>Loading...</p>";
  try {
    const res = await fetch("/api/media");
    const data = await res.json();
    moviesContainer.innerHTML = "";
    if (!data.success || data.movies.length === 0) {
      moviesContainer.innerHTML = "<p>No media found.</p>";
      return;
    }
    data.movies.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("movie-card");
      card.addEventListener("click", () => {
        window.location.href = `/series/${item.id}`;
      });
      const typeLabel = item.type === "MOVIE" ? "Movie" : "TV Show";
      card.innerHTML = `
        <img src="${item.poster_url || 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${item.title}">
        <div class="overlay">
          <h4>${item.title}</h4>
          <p>${typeLabel} | ${item.release_date ? item.release_date.slice(0,4) : "N/A"}</p>
        </div>
      `;
      moviesContainer.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    moviesContainer.innerHTML = "<p>Failed to load media.</p>";
  }
}

async function searchMedia(query) {
  moviesContainer.innerHTML = "<p>Searching...</p>";
  try {
    const res = await fetch(`/api/media/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    moviesContainer.innerHTML = "";
    if (!data.success || data.movies.length === 0) {
      moviesContainer.innerHTML = "<p>No results found.</p>";
      return;
    }
    data.movies.forEach(item => {
      const card = document.createElement("div");
      card.classList.add("movie-card");
      card.addEventListener("click", () => {
        window.location.href = `/pages/series-details.ejs?id=${item.id}`;
      });
      const typeLabel = item.type === "MOVIE" ? "Movie" : "TV Show";
      card.innerHTML = `
        <img src="${item.poster_url || 'https://via.placeholder.com/500x750?text=No+Image'}" alt="${item.title}">
        <div class="overlay">
          <h4>${item.title}</h4>
          <p>${typeLabel} | ${item.release_date ? item.release_date.slice(0,4) : "N/A"}</p>
        </div>
      `;
      moviesContainer.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    moviesContainer.innerHTML = "<p>Error loading search results.</p>";
  }
}

document.getElementById("search-btn").addEventListener("click", () => {
  const query = document.getElementById("search-input").value.trim();
  if (query) searchMedia(query);
});

document.getElementById("search-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = e.target.value.trim();
    if (query) searchMedia(query);
  }
});

fetchMedia();
