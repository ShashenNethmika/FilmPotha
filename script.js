document.addEventListener("DOMContentLoaded", () => {
    // --- API Configuration ---
    const tmdbApiKey = typeof CONFIG !== 'undefined' ? CONFIG.tmdbApiKey : '70d39d783bf0ed1a77563490c832c0a2';
    const omdbApiKey = typeof CONFIG !== 'undefined' ? CONFIG.omdbApiKey : '84c5ac60';
    
    const baseApiUrl = 'https://api.themoviedb.org/3';
    const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
    const omdbApiUrl = 'https://www.omdbapi.com/';

    // Genre/Category mapping
    const genres = [
        { id: 28, name: 'Action', emoji: '💥' },
        { id: 12, name: 'Adventure', emoji: '🏝️' },
        { id: 16, name: 'Animation', emoji: '🎬' },
        { id: 35, name: 'Comedy', emoji: '😂' },
        { id: 80, name: 'Crime', emoji: '🕵️' },
        { id: 18, name: 'Drama', emoji: '🎭' },
        { id: 14, name: 'Fantasy', emoji: '✨' },
        { id: 27, name: 'Horror', emoji: '👻' },
        { id: 10402, name: 'Music', emoji: '🎵' },
        { id: 9648, name: 'Mystery', emoji: '🔍' },
        { id: 10749, name: 'Romance', emoji: '❤️' },
        { id: 878, name: 'Sci-Fi', emoji: '🚀' },
        { id: 53, name: 'Thriller', emoji: '😱' },
        { id: 10752, name: 'War', emoji: '⚔️' }
    ];

    // --- DOM Elements ---
    const themeToggleButton = document.getElementById("theme-toggle");
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const categoriesContainer = document.getElementById("categories-container");
    const popularContainer = document.getElementById("popular-container");
    const resultsContainer = document.getElementById("results-container");
    const categoryMoviesContainer = document.getElementById("category-movies-container");
    const popularSection = document.getElementById("popular-movies");
    const searchSection = document.getElementById("search-results");
    const categorySection = document.getElementById("category-movies");
    const categoryTitle = document.getElementById("category-title");

    // Modal Elements
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCloseButton = document.getElementById("modal-close");
    const modalBody = document.getElementById("modal-body");

    // State management
    let currentModalId = null;
    let searchDebounceTimer = null;
    let currentGenreId = null;

    // --- Theme Toggle ---
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark-mode") {
        document.body.classList.add("dark-mode");
        themeToggleButton.textContent = "Light Mode";
    } else {
        themeToggleButton.textContent = "Dark Mode";
    }

    themeToggleButton.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDarkMode = document.body.classList.contains("dark-mode");
        themeToggleButton.textContent = isDarkMode ? "Light Mode" : "Dark Mode";
        localStorage.setItem("theme", isDarkMode ? "dark-mode" : "");
    });

    // --- Utility Functions ---

    function showLoading(container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">Loading...</p>
            </div>
        `;
    }

    function showError(container, message) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }

    // --- Core Functions ---

    async function fetchFromApi(endpoint) {
        if (!tmdbApiKey || tmdbApiKey === 'YOUR_API_KEY_HERE') {
            console.error("TMDb API Key not set!");
            throw new Error("TMDb API key is not configured. Please add your API key.");
        }
        // FIX: support endpoints with and without query params
        let url;
        if (endpoint.includes('?')) {
            url = `${baseApiUrl}${endpoint}&api_key=${tmdbApiKey}&language=en-US`;
        } else {
            url = `${baseApiUrl}${endpoint}?api_key=${tmdbApiKey}&language=en-US`;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("API key is invalid or expired. Please check your TMDb API key.");
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to fetch data:", error);
            throw error;
        }
    }

    async function fetchFromOmdb(imdbId) {
        if (!omdbApiKey || omdbApiKey === 'YOUR_OMDB_API_KEY_HERE') {
            return null; // OMDb is optional
        }
        try {
            const url = `${omdbApiUrl}?apikey=${omdbApiKey}&i=${imdbId}`;
            const response = await fetch(url);
            if (!response.ok) return null;
            const data = await response.json();
            return data.Response === "True" ? data : null;
        } catch (error) {
            console.error("Failed to fetch OMDb data:", error);
            return null;
        }
    }

    function getRatingClass(rating) {
        if (rating >= 7.5) return "green";
        if (rating >= 6.0) return "orange";
        return "red";
    }

    function createMovieCard(movie) {
        const card = document.createElement("div");
        card.className = "movie-card";
        card.dataset.id = movie.id;

        const posterPath = movie.poster_path 
            ? `${baseImageUrl}${movie.poster_path}` 
            : "https://via.placeholder.com/200x300?text=No+Image";

        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
        const ratingClass = movie.vote_average ? getRatingClass(movie.vote_average) : "";

        card.innerHTML = `
            <img src="${posterPath}" alt="${movie.title || movie.name}" loading="lazy">
            <div class="movie-info">
                <h3>${movie.title || movie.name}</h3>
                <span class="${ratingClass}">⭐ ${rating}</span>
            </div>
        `;

        card.addEventListener("click", () => openModal(movie.id));
        return card;
    }

    function displayMovies(movies, container) {
        container.innerHTML = "";
        if (!movies || movies.length === 0) {
            showError(container, "No movies found.");
            return;
        }
        movies.forEach(movie => {
            const card = createMovieCard(movie);
            container.appendChild(card);
        });
    }

    // --- Popular Movies ---
    async function loadPopularMovies() {
        showLoading(popularContainer);
        try {
            const data = await fetchFromApi('/movie/popular');
            displayMovies(data.results, popularContainer);
        } catch (error) {
            showError(popularContainer, error.message || "Failed to load popular movies.");
        }
    }

    // --- Search Functionality ---
    async function searchMovies(query) {
        if (!query.trim()) {
            // If search is empty, show popular movies again
            searchSection.style.display = "none";
            categorySection.style.display = "none";
            popularSection.style.display = "block";
            loadPopularMovies();
            return;
        }

        showLoading(resultsContainer);
        searchSection.style.display = "block";
        categorySection.style.display = "none";
        popularSection.style.display = "none";

        try {
            const data = await fetchFromApi(`/search/movie?query=${encodeURIComponent(query)}`);
            displayMovies(data.results, resultsContainer);
        } catch (error) {
            showError(resultsContainer, error.message || "Failed to search movies.");
        }
    }

    searchButton.addEventListener("click", () => {
        const query = searchInput.value;
        searchMovies(query);
    });

    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const query = searchInput.value;
            searchMovies(query);
        }
    });

    // Optional: Debounced search as user types
    searchInput.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = searchInput.value;
            if (query.trim().length > 2) {
                searchMovies(query);
            }
        }, 500);
    });

    // --- Category Buttons ---
    function renderCategoryButtons() {
        categoriesContainer.innerHTML = "";
        genres.forEach(genre => {
            const button = document.createElement("button");
            button.className = "category-btn";
            button.textContent = `${genre.emoji} ${genre.name}`;
            button.dataset.genreId = genre.id;
            
            button.addEventListener("click", () => {
                // Remove active class from all buttons
                document.querySelectorAll(".category-btn").forEach(btn => {
                    btn.classList.remove("active");
                });
                // Add active class to clicked button
                button.classList.add("active");
                
                loadMoviesByGenre(genre.id, genre.name);
            });
            
            categoriesContainer.appendChild(button);
        });
    }

    // --- Load Movies by Genre ---
    async function loadMoviesByGenre(genreId, genreName) {
        currentGenreId = genreId;
        categoryTitle.textContent = `${genreName} Movies`;
        
        showLoading(categoryMoviesContainer);
        categorySection.style.display = "block";
        searchSection.style.display = "none";
        popularSection.style.display = "none";

        try {
            const data = await fetchFromApi(`/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`);
            displayMovies(data.results, categoryMoviesContainer);
        } catch (error) {
            showError(categoryMoviesContainer, error.message || "Failed to load movies by category.");
        }
    }

    // --- Modal (Movie Details) ---
    async function openModal(movieId) {
        currentModalId = movieId;
        modalOverlay.style.display = "flex";
        modalBody.innerHTML = '<div class="loading-spinner"></div>';

        try {
            // Fetch movie details
            const movie = await fetchFromApi(`/movie/${movieId}`);
            
            // Fetch trailer
            const videosData = await fetchFromApi(`/movie/${movieId}/videos`);
            const trailer = videosData.results.find(
                video => video.type === "Trailer" && video.site === "YouTube"
            );

            // Optionally fetch OMDb data for additional info
            let omdbData = null;
            if (movie.imdb_id && omdbApiKey && omdbApiKey !== 'YOUR_OMDB_API_KEY_HERE') {
                omdbData = await fetchFromOmdb(movie.imdb_id);
            }

            // Build modal content
            const posterPath = movie.poster_path 
                ? `${baseImageUrl}${movie.poster_path}` 
                : "https://via.placeholder.com/300x450?text=No+Image";

            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";
            const releaseYear = movie.release_date ? movie.release_date.split("-")[0] : "Unknown";
            const runtime = movie.runtime ? `${movie.runtime} min` : "N/A";
            const genreNames = movie.genres.map(g => g.name).join(", ") || "N/A";

            let modalHTML = `
                <img src="${posterPath}" alt="${movie.title}">
                <div class="modal-details">
                    <h2 id="modal-title">${movie.title} (${releaseYear})</h2>
                    <p>${movie.overview || "No description available."}</p>
                    <div class="info-item"><strong>Rating:</strong> ⭐ ${rating}/10</div>
                    <div class="info-item"><strong>Runtime:</strong> ${runtime}</div>
                    <div class="info-item"><strong>Genres:</strong> ${genreNames}</div>
            `;

            // Add OMDb data if available
            if (omdbData) {
                if (omdbData.imdbRating && omdbData.imdbRating !== "N/A") {
                    modalHTML += `<div class="info-item"><strong>IMDb Rating:</strong> ${omdbData.imdbRating}/10</div>`;
                }
                if (omdbData.Metascore && omdbData.Metascore !== "N/A") {
                    modalHTML += `<div class="info-item"><strong>Metascore:</strong> ${omdbData.Metascore}/100</div>`;
                }
                if (omdbData.Director && omdbData.Director !== "N/A") {
                    modalHTML += `<div class="info-item"><strong>Director:</strong> ${omdbData.Director}</div>`;
                }
                if (omdbData.Actors && omdbData.Actors !== "N/A") {
                    modalHTML += `<div class="info-item"><strong>Cast:</strong> ${omdbData.Actors}</div>`;
                }
            }

            modalHTML += `</div>`;

            // Add trailer if available
            if (trailer) {
                modalHTML += `
                    <div class="modal-trailer">
                        <h3>🎬 Trailer</h3>
                        <iframe 
                            src="https://www.youtube.com/embed/${trailer.key}" 
                            allowfullscreen
                            title="${movie.title} Trailer">
                        </iframe>
                    </div>
                `;
            }

            modalBody.innerHTML = modalHTML;

        } catch (error) {
            console.error("Failed to load movie details:", error);
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
                    <p>⚠️ Failed to load movie details.</p>
                </div>
            `;
        }
    }

    function closeModal() {
        modalOverlay.style.display = "none";
        modalBody.innerHTML = "";
        currentModalId = null;
    }

    modalCloseButton.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalOverlay.style.display === "flex") {
            closeModal();
        }
    });

    // --- Initialize App ---
    renderCategoryButtons();
    loadPopularMovies();
});
