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
    const toggleMoviesBtn = document.getElementById("toggle-movies");
    const toggleTvBtn = document.getElementById("toggle-tv");
    const myWatchlistBtn = document.getElementById("my-watchlist-btn");
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const categoriesContainer = document.getElementById("categories-container");
    const popularContainer = document.getElementById("popular-container");
    const resultsContainer = document.getElementById("results-container");
    const categoryMoviesContainer = document.getElementById("category-movies-container");
    const watchlistContainer = document.getElementById("watchlist-container");
    const popularSection = document.getElementById("popular-section");
    const searchSection = document.getElementById("search-section");
    const categorySection = document.getElementById("category-section");
    const watchlistSection = document.getElementById("watchlist-section");
    const categoryTitle = document.getElementById("category-title");
    const popularTitle = document.getElementById("popular-title");
    const homeTitle = document.getElementById("home-title");

    // Modal Elements
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCloseButton = document.getElementById("modal-close");
    const modalBody = document.getElementById("modal-body");

    // State management
    let currentMode = 'movie'; // 'movie' or 'tv'
    let currentModalId = null;
    let currentModalMediaType = null;
    let searchDebounceTimer = null;
    let currentGenreId = null;

    // --- Theme Toggle ---
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark-mode") {
        document.body.classList.add("dark-mode");
        themeToggleButton.textContent = "☀️";
    } else {
        themeToggleButton.textContent = "🌙";
    }

    themeToggleButton.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");
        const isDarkMode = document.body.classList.contains("dark-mode");
        themeToggleButton.textContent = isDarkMode ? "☀️" : "🌙";
        localStorage.setItem("theme", isDarkMode ? "dark-mode" : "");
    });

    // --- Toggle Movies/TV ---
    toggleMoviesBtn.addEventListener("click", () => {
        if (currentMode !== 'movie') {
            currentMode = 'movie';
            updateToggleButtons();
            loadPopular();
            if (currentGenreId) loadByGenre(currentGenreId);
        }
    });

    toggleTvBtn.addEventListener("click", () => {
        if (currentMode !== 'tv') {
            currentMode = 'tv';
            updateToggleButtons();
            loadPopular();
            if (currentGenreId) loadByGenre(currentGenreId);
        }
    });

    function updateToggleButtons() {
        toggleMoviesBtn.classList.toggle("active", currentMode === "movie");
        toggleTvBtn.classList.toggle("active", currentMode === "tv");
        const modeText = currentMode === 'movie' ? 'Movies' : 'TV Shows';
        popularTitle.textContent = `🔥 Popular ${modeText}`;
        if (currentGenreId) {
            const genre = genres.find(g => g.id === currentGenreId);
            if (genre) categoryTitle.textContent = `${genre.name} ${modeText}`;
        }
    }

    // --- Watchlist Functions ---
    function getWatchlist() {
        return JSON.parse(localStorage.getItem("watchlist") || "[]");
    }

    function saveWatchlist(watchlist) {
        localStorage.setItem("watchlist", JSON.stringify(watchlist));
    }

    function isInWatchlist(id, type) {
        const watchlist = getWatchlist();
        return watchlist.some(item => item.id === id && item.type === type);
    }

    function addToWatchlist(id, type) {
        const watchlist = getWatchlist();
        if (!isInWatchlist(id, type)) {
            watchlist.push({ id, type });
            saveWatchlist(watchlist);
        }
    }

    function removeFromWatchlist(id, type) {
        let watchlist = getWatchlist();
        watchlist = watchlist.filter(item => !(item.id === id && item.type === type));
        saveWatchlist(watchlist);
    }

    myWatchlistBtn.addEventListener("click", () => {
        showWatchlist();
        searchInput.value = ""; // Clear search input
    });

    async function showWatchlist() {
        popularSection.style.display = "none";
        searchSection.style.display = "none";
        categorySection.style.display = "none";
        watchlistSection.style.display = "block";

        showLoading(watchlistContainer);
        
        const watchlist = getWatchlist();
        if (watchlist.length === 0) {
            watchlistContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
                    <p>❤️ Your watchlist is empty</p>
                </div>
            `;
            return;
        }

        try {
            const promises = watchlist.map(item => fetchFromApi(`/${item.type}/${item.id}`));
            const items = await Promise.all(promises);
            displayMovies(items, watchlistContainer);
        } catch (error) {
            showError(watchlistContainer, "Failed to load watchlist");
        }
    }

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
            return null;
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
        const mediaType = movie.media_type || currentMode;
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
        card.addEventListener("click", () => openModal(movie.id, mediaType));
        return card;
    }

    function displayMovies(movies, container) {
        container.innerHTML = "";
        if (!movies || movies.length === 0) {
            showError(container, "No results found.");
            return;
        }
        movies.forEach(movie => {
            const card = createMovieCard(movie);
            container.appendChild(card);
        });
    }

    // --- Popular Movies/TV ---
    async function loadPopular() {
        showLoading(popularContainer);
        popularSection.style.display = "block";
        watchlistSection.style.display = "none";
        const url = currentMode === "movie" ? '/movie/popular' : '/tv/popular';
        try {
            const data = await fetchFromApi(url);
            displayMovies(data.results, popularContainer);
        } catch (error) {
            showError(popularContainer, error.message || "Failed to load popular content.");
        }
    }

    // --- Search Functionality ---
    async function searchMovies(query) {
        if (!query.trim()) {
            searchSection.style.display = "none";
            categorySection.style.display = "none";
            watchlistSection.style.display = "none";
            popularSection.style.display = "block";
            loadPopular();
            return;
        }
        showLoading(resultsContainer);
        searchSection.style.display = "block";
        categorySection.style.display = "none";
        popularSection.style.display = "none";
        watchlistSection.style.display = "none";
        try {
            const data = await fetchFromApi(`/search/multi?query=${encodeURIComponent(query)}`);
            const filteredResults = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
            displayMovies(filteredResults, resultsContainer);
        } catch (error) {
            showError(resultsContainer, error.message || "Failed to search.");
        }
    }

    searchButton.addEventListener("click", () => searchMovies(searchInput.value));
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") searchMovies(searchInput.value);
    });
    searchInput.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            const query = searchInput.value;
            if (query.trim().length > 2) searchMovies(query);
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
                document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
                button.classList.add("active");
                searchInput.value = ""; // Clear search input
                loadByGenre(genre.id);
            });
            categoriesContainer.appendChild(button);
        });
    }

    // --- Load by Genre ---
    async function loadByGenre(genreId) {
        currentGenreId = genreId;
        const genre = genres.find(g => g.id === genreId);
        const modeText = currentMode === 'movie' ? 'Movies' : 'TV Shows';
        categoryTitle.textContent = `${genre.name} ${modeText}`;
        showLoading(categoryMoviesContainer);
        categorySection.style.display = "block";
        searchSection.style.display = "none";
        popularSection.style.display = "none";
        watchlistSection.style.display = "none";
        const endpoint = currentMode === 'movie' ? '/discover/movie' : '/discover/tv';
        try {
            const data = await fetchFromApi(`${endpoint}?with_genres=${genreId}&sort_by=popularity.desc`);
            displayMovies(data.results, categoryMoviesContainer);
        } catch (error) {
            showError(categoryMoviesContainer, error.message || "Failed to load by category.");
        }
    }

    // --- Modal (Details) ---
    async function openModal(itemId, mediaType = 'movie') {
        currentModalId = itemId;
        currentModalMediaType = mediaType;
        modalOverlay.style.display = "flex";
        modalBody.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const item = await fetchFromApi(`/${mediaType}/${itemId}`);
            const videosData = await fetchFromApi(`/${mediaType}/${itemId}/videos`);
            const creditsData = await fetchFromApi(`/${mediaType}/${itemId}/credits`);
            const similarData = await fetchFromApi(`/${mediaType}/${itemId}/similar`);
            const trailer = videosData.results.find(video => video.type === "Trailer" && video.site === "YouTube");
            
            let omdbData = null;
            if (item.imdb_id && omdbApiKey && omdbApiKey !== 'YOUR_OMDB_API_KEY_HERE') {
                omdbData = await fetchFromOmdb(item.imdb_id);
            }

            const posterPath = item.poster_path ? `${baseImageUrl}${item.poster_path}` : "https://via.placeholder.com/300x450?text=No+Image";
            const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
            const title = item.title || item.name;
            const releaseDate = item.release_date || item.first_air_date;
            const releaseYear = releaseDate ? releaseDate.split("-")[0] : "Unknown";
            let runtime = "N/A";
            
            if (mediaType === 'movie' && item.runtime) {
                runtime = `${item.runtime} min`;
            } else if (mediaType === 'tv' && item.episode_run_time && item.episode_run_time.length > 0) {
                runtime = `${item.episode_run_time[0]} min (episode)`;
            }
            
            const genreNames = item.genres.map(g => g.name).join(", ") || "N/A";
            const inWatchlist = isInWatchlist(itemId, mediaType);
            const watchlistBtnText = inWatchlist ? "✓ In Watchlist" : "❤️ Add to Watchlist";
            const watchlistBtnClass = inWatchlist ? "watchlist-btn in-watchlist" : "watchlist-btn";
            
            let modalHTML = `
                <img src="${posterPath}" alt="${title}">
                <div class="modal-details">
                    <h2 id="modal-title">${title} (${releaseYear})</h2>
                    <p>${item.overview || "No description available."}</p>
                    <div class="info-item"><strong>Rating:</strong> ⭐ ${rating}/10</div>
                    <div class="info-item"><strong>Runtime:</strong> ${runtime}</div>
                    <div class="info-item"><strong>Genres:</strong> ${genreNames}</div>
            `;
            
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
            }
            
            modalHTML += `<button class="${watchlistBtnClass}" id="toggle-watchlist">${watchlistBtnText}</button>`;
            modalHTML += `</div>`;
            
            if (trailer) {
                modalHTML += `<div class="modal-trailer"><h3>🎬 Trailer</h3><iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen title="${title} Trailer"></iframe></div>`;
            }

            // --- CAST SLIDER (CodePen style) ---
            modalHTML += `<div class="modal-cast"><h3>👥 Cast</h3>`;
            if (creditsData.cast && creditsData.cast.length > 0) {
                modalHTML += `<div class="slider-container" id="cast-slider">`;
                modalHTML += `<div class="slide">`;
                creditsData.cast.slice(0, 10).forEach(cast => {
                    const castImg = cast.profile_path ? `${baseImageUrl}${cast.profile_path}` : "https://via.placeholder.com/200x300?text=No+Image";
                    modalHTML += `
                        <div class="item" style="background-image: url(${castImg});">
                            <div class="content">
                                <div class="name">${cast.name}</div>
                                <div class="des">${cast.character}</div>
                            </div>
                        </div>`;
                });
                modalHTML += `</div>`; // end .slide
                modalHTML += `<div class="button">
                                <button class="prev">◁</button>
                                <button class="next">▷</button>
                              </div>`;
                modalHTML += `</div>`; // end .slider-container
            } else {
                modalHTML += `<p>No cast information available.</p>`;
            }
            modalHTML += `</div>`;

            // --- SIMILAR SLIDER (CodePen style) ---
            modalHTML += `<div class="modal-similar"><h3>🎞️ Similar</h3>`;
            if (similarData.results && similarData.results.length > 0) {
                modalHTML += `<div class="slider-container" id="similar-slider">`;
                modalHTML += `<div class="slide">`;
                similarData.results.slice(0, 10).forEach(similar => {
                    const similarImg = similar.poster_path ? `${baseImageUrl}${similar.poster_path}` : "https://via.placeholder.com/200x300?text=No+Image";
                    const simTitle = similar.title || similar.name;
                    const simRating = similar.vote_average ? similar.vote_average.toFixed(1) : "N/A";
                    modalHTML += `
                        <div class="item" style="background-image: url(${similarImg});" data-id="${similar.id}" data-type="${mediaType}">
                            <div class="content">
                                <div class="name">${simTitle}</div>
                                <div class="des">⭐ ${simRating}</div>
                            </div>
                        </div>`;
                });
                modalHTML += `</div>`; // end .slide
                modalHTML += `<div class="button">
                                <button class="prev">◁</button>
                                <button class="next">▷</button>
                              </div>`;
                modalHTML += `</div>`; // end .slider-container
            } else {
                modalHTML += `<p>No similar movies available.</p>`;
            }
            modalHTML += `</div>`;

            // Modal එක render කරන්න
            modalBody.innerHTML = modalHTML;

            // --- CodePen SLIDER LOGIC ---
            function setupCodepenSlider(sliderId) {
                const slider = modalBody.querySelector(`#${sliderId}`);
                if (!slider) return;

                const nextBtn = slider.querySelector('.next');
                const prevBtn = slider.querySelector('.prev');
                const slide = slider.querySelector('.slide');

                if (!nextBtn || !prevBtn || !slide) return;

                nextBtn.addEventListener("click", () => {
                    let items = slide.querySelectorAll(".item");
                    slide.appendChild(items[0]);
                });

                prevBtn.addEventListener("click", () => {
                    let items = slide.querySelectorAll(".item");
                    slide.prepend(items[items.length - 1]);
                });
            }

            // Slider දෙකම initialize කරන්න
            setupCodepenSlider('cast-slider');
            setupCodepenSlider('similar-slider');

            // Watchlist button එක
            document.getElementById("toggle-watchlist").addEventListener("click", (e) => {
                const button = e.target;
                if (isInWatchlist(itemId, mediaType)) {
                    removeFromWatchlist(itemId, mediaType);
                    button.textContent = "❤️ Add to Watchlist";
                    button.classList.remove("in-watchlist");
                } else {
                    addToWatchlist(itemId, mediaType);
                    button.textContent = "✓ In Watchlist";
                    button.classList.add("in-watchlist");
                }
            });

            // Similar movie click කරන එක
            modalBody.querySelectorAll("#similar-slider .item").forEach(card => {
                card.addEventListener("click", () => {
                    // Check if this item is the 'active' one (nth-child(2))
                    const isActive = Array.from(card.parentElement.children).indexOf(card) === 1;
                    
                    if (isActive) {
                        const id = parseInt(card.dataset.id);
                        const type = card.dataset.type;
                        closeModal();
                        openModal(id, type);
                    }
                });
            });

        } catch (error) {
            console.error("Failed to load details:", error);
            modalBody.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--secondary-text-color);"><p>⚠️ Failed to load details.</p></div>`;
        }
    }

    function closeModal() {
        modalOverlay.style.display = "none";
        modalBody.innerHTML = "";
        currentModalId = null;
        currentModalMediaType = null;
    }

    modalCloseButton.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalOverlay.style.display === "flex") {
            closeModal();
        }
    });

    homeTitle.addEventListener("click", () => {
        searchSection.style.display = "none";
        categorySection.style.display = "none";
        watchlistSection.style.display = "none";
        popularSection.style.display = "block";
        searchInput.value = ""; // Clear search input
        loadPopular();
    });

    // --- Initialize App ---
    renderCategoryButtons();
    loadPopular();
});