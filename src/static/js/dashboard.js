const moviesContainer = document.getElementById("movies-container");


async function loadMedia(query = "") {
	try {
		const res = await fetch(`/api/media/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
		const html = await res.text();
		moviesContainer.innerHTML = html;
	} catch (err) {
		console.error(err);
		moviesContainer.innerHTML = "<p>Failed to load media.</p>";
	}
}


const searchBtn = document.getElementById("search-btn");
const searchInput = document.getElementById("search-input");
searchBtn.addEventListener("click", () => {
	const query = searchInput.value.trim();
	loadMedia(query);
});
searchInput.addEventListener("keypress", (e) => {
	if (e.key === "Enter") {
		const query = e.target.value.trim();
		loadMedia(query);
	}
});


loadMedia();
