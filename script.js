document.addEventListener("DOMContentLoaded", () => {
    // --- API Configuration ---
    // Import from config.js for better security
    const tmdbApiKey = typeof CONFIG !== 'undefined' ? CONFIG.tmdbApiKey : '70d39d783bf0ed1a77563490c832c0a2';
    const omdbApiKey = typeof CONFIG !== 'undefined' ? CONFIG.omdbApiKey : '84c5ac60';
    
    const baseApiUrl = 'https://api.themoviedb.org/3';
    const baseImageUrl = 'https://image.tmdb.org/t/p/w500';
    const omdbApiUrl = 'https://www.omdbapi.com/';

    // --- DOM Elements ---
    const themeToggleButton = document.getElementById("theme-toggle");
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const popularContainer = document.getElementById("popular-container");
    const resultsContainer = document.getElementById("results-container");
    const popularSection = document.getElementById("popular-movies");
    const searchSection = document.getElementById("search-results");

    // Modal Elements
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCloseButton = document.getElementById("modal-close");
    const modalBody = document.getElementById("modal-body");

    // State management
    let currentModalId = null;
    let searchDebounceTimer = null;

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

    /**
     * Shows loading spinner in container
     */
    function showLoading(container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">Loading...</p>
            </div>
        `;
    }

    /**
     * Shows error message in container
     */
    function showError(container, message) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--secondary-text-color);">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }

    // --- Core Functions ---

    /**
     * Fetches data from the TMDb API
     * @param {string} endpoint - The API endpoint (e.g., '/movie/popular')
     */
    async function fetchFromApi(endpoint) {
        if (!tmdbApiKey || tmdbApiKey === 'YOUR_API_KEY_HERE') {
            console.error("TMDb API Key not set!");
            throw new Error("TMDb API key is not configured. Please add your API key.");
        }
        
        const url = `${baseApiUrl}${endpoint}?api_key=${tmdbApiKey}&language=en-US`;
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

    /**
     * Fetches data from OMDb API by IMDb ID
     * @param {string} imdbId - The IMDb ID of the movie
     */
    async function fetchFromOmdbApi(imdbId) {
        if (!omdbApiKey || omdbApiKey === 'YOUR_OMDB_API_KEY_HERE') {
            console.warn("OMDb API Key not set. Skipping OMDb details.");
            return null;
        }
        
        const url = `${omdbApiUrl}?i=${imdbId}&apikey=${omdbApiKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`OMDb API Error: ${response.status}`);
                return null;
            }
            const data = await response.json();
            if (data.Response === "False") {
                console.warn("OMDb: ", data.Error);
                return null;
            }
            return data;
        } catch (error) {
            console.error("Failed to fetch OMDb data:", error);
            return null;
        }
    }

    /**
     * Creates and displays movie cards in the grid
     * @param {Array} movies - Array of movie objects from the API
     * @param {HTMLElement} container - The container to inject cards into
     */
    function displayMovies(movies, container) {
        container.innerHTML = "";

        if (!movies || movies.length === 0) {
            container.innerHTML = "<p style='color: var(--secondary-text-color); text-align: center; padding: 40px;'>No movies found.</p>";
            return;
        }

        movies.forEach(movie => {
            const posterPath = movie.poster_path 
                ? `${baseImageUrl}${movie.poster_path}`
                : 'https://placehold.co/500x750/666/FFFFFF?text=No+Image';
            
            const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
            let ratingColor = 'red';
            if (rating === 'N/A') {
                ratingColor = 'secondary-text-color';
            } else if (rating >= 7) {
                ratingColor = 'green';
            } else if (rating >= 5) {
                ratingColor = 'orange';
            }

            const movieCard = document.createElement('div');
            movieCard.classList.add('movie-card');
            movieCard.setAttribute('data-movie-id', movie.id);
            
            movieCard.innerHTML = `
                <img src="${posterPath}" alt="${movie.title}" loading="lazy">
                <div class="movie-info">
                    <h3>${movie.title || 'Title not found'}</h3>
                    <span class="${ratingColor}">${rating} / 10</span>
                </div>
            `;
            container.appendChild(movieCard);
        });
    }

    /**
     * Handles clicks on movie cards
     * @param {Event} event - The click event
     */
    function handleCardClick(event) {
        const card = event.target.closest('.movie-card');
        if (card) {
            const movieId = card.getAttribute('data-movie-id');
            if (movieId) {
                openModal(movieId);
            }
        }
    }

    /**
     * Fetches and displays popular movies on page load
     */
    async function getPopularMovies() {
        showLoading(popularContainer);
        try {
            const data = await fetchFromApi('/movie/popular');
            if (data && data.results) {
                displayMovies(data.results, popularContainer);
            }
        } catch (error) {
            showError(popularContainer, "Failed to load popular movies. Please try again.");
        }
    }

    /**
     * Fetches and displays search results with debouncing
     */
    async function searchMovies() {
        const query = searchInput.value.trim();
        
        if (!query) {
            popularSection.style.display = 'block';
            searchSection.style.display = 'none';
            resultsContainer.innerHTML = "";
            return;
        }

        showLoading(resultsContainer);
        
        try {
            const data = await fetchFromApi(`/search/movie?query=${encodeURIComponent(query)}`);
            if (data && data.results) {
                displayMovies(data.results, resultsContainer);
                popularSection.style.display = 'none';
                searchSection.style.display = 'block';
            }
        } catch (error) {
            showError(resultsContainer, "Failed to search movies. Please try again.");
            searchSection.style.display = 'block';
        }
    }

    /**
     * Debounced search function
     */
    function debouncedSearch() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchMovies();
        }, 500);
    }

    // --- Modal (Popup) Functions ---

    /**
     * Opens the modal with details for a specific movie ID
     * @param {string} movieId - The TMDb movie ID
     */
    async function openModal(movieId) {
        // Store current modal ID to prevent race conditions
        currentModalId = movieId;
        
        // Show modal with loading state
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-color);">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">Loading movie details...</p>
            </div>
        `;
        modalOverlay.style.display = 'flex';

        try {
            // Fetch primary details from TMDb
            const tmdbDetails = await fetchFromApi(`/movie/${movieId}`);
            
            // Check if this is still the current modal request
            if (currentModalId !== movieId) return;
            
            if (!tmdbDetails) {
                throw new Error("Failed to fetch movie details.");
            }

            const imdbId = tmdbDetails.imdb_id;

            // Fetch credits, videos, and OMDb details in parallel
            const [tmdbCredits, tmdbVideos, omdbDetails] = await Promise.all([
                fetchFromApi(`/movie/${movieId}/credits`),
                fetchFromApi(`/movie/${movieId}/videos`),
                imdbId ? fetchFromOmdbApi(imdbId) : Promise.resolve(null)
            ]);

            // Check again if this is still the current modal
            if (currentModalId !== movieId) return;

            if (!tmdbCredits || !tmdbVideos) {
                throw new Error("Failed to fetch all movie details.");
            }
            
            // Find the official YouTube trailer
            const trailer = tmdbVideos.results?.find(video => 
                video.site === 'YouTube' && video.type === 'Trailer'
            );
            
            const posterPath = tmdbDetails.poster_path 
                ? `${baseImageUrl}${tmdbDetails.poster_path}`
                : 'https://placehold.co/500x750/666/FFFFFF?text=No+Image';

            // Get main cast members with safety check
            const cast = tmdbCredits.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'N/A';

            // Build OMDb details string with null checks
            let omdbRatingsHtml = '';
            if (omdbDetails?.Ratings && omdbDetails.Ratings.length > 0) {
                omdbRatingsHtml = omdbDetails.Ratings.map(rating =>
                    `<div class="info-item"><strong>${rating.Source}:</strong> ${rating.Value}</div>`
                ).join('');
            }

            modalBody.innerHTML = `
                <img src="${posterPath}" alt="${tmdbDetails.title}">
                <div class="modal-details">
                    <h2>${tmdbDetails.title}</h2>
                    <p>${tmdbDetails.overview || 'No overview available.'}</p>
                    
                    <div class="info-item"><strong>TMDb Rating:</strong> ${tmdbDetails.vote_average ? tmdbDetails.vote_average.toFixed(1) : 'N/A'} / 10</div>
                    <div class="info-item"><strong>Release Date:</strong> ${tmdbDetails.release_date || 'N/A'}</div>
                    <div class="info-item"><strong>Genres:</strong> ${tmdbDetails.genres?.map(g => g.name).join(', ') || 'N/A'}</div>
                    <div class="info-item"><strong>Cast:</strong> ${cast}</div>
                    
                    ${omdbDetails ? `
                        <hr style="border: 0; border-top: 1px solid var(--input-border); margin: 15px 0;">
                        <div class="info-item"><strong>Director:</strong> ${omdbDetails.Director || 'N/A'}</div>
                        <div class="info-item"><strong>Awards:</strong> ${omdbDetails.Awards || 'N/A'}</div>
                        ${omdbRatingsHtml}
                    ` : ''}
                    
                    ${trailer ? `
                        <div class="modal-trailer">
                            <h3>Trailer</h3>
                            <iframe
                                src="https://www.youtube.com/embed/${trailer.key}?enablejsapi=1"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowfullscreen>
                            </iframe>
                        </div>
                    ` : '<p style="margin-top: 15px; color: var(--secondary-text-color);">No trailer available.</p>'}
                </div>
            `;
        } catch (error) {
            console.error("Error opening modal:", error);
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--text-color);">
                    <p>⚠️ ${error.message}</p>
                    <button onclick="document.getElementById('modal-overlay').style.display='none';" 
                            style="margin-top: 20px; padding: 10px 20px; background: var(--button-bg); 
                                   color: var(--button-text); border: none; border-radius: 8px; cursor: pointer;">
                        Close
                    </button>
                </div>
            `;
        }
    }

    /**
     * Closes the modal and stops any playing videos
     */
    function closeModal() {
        // Clear current modal ID
        currentModalId = null;
        
        // Stop YouTube video using postMessage API
        const iframe = modalBody.querySelector('iframe');
        if (iframe) {
            try {
                iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
            } catch (e) {
                // Fallback: reset src
                iframe.src = iframe.src;
            }
        }
        
        modalOverlay.style.display = 'none';
        
        // Clear content after a short delay to allow animation
        setTimeout(() => {
            if (modalOverlay.style.display === 'none') {
                modalBody.innerHTML = "";
            }
        }, 300);
    }

    // --- Event Listeners ---
    searchButton.addEventListener("click", searchMovies);
    
    // Add debouncing to search input
    searchInput.addEventListener("input", debouncedSearch);
    
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            clearTimeout(searchDebounceTimer);
            searchMovies();
        }
    });

    modalCloseButton.addEventListener("click", closeModal);
    
    modalOverlay.addEventListener("click", (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Add keyboard support for closing modal
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalOverlay.style.display === 'flex') {
            closeModal();
        }
    });

    // Event delegation for movie cards
    popularContainer.addEventListener('click', handleCardClick);
    resultsContainer.addEventListener('click', handleCardClick);

    // --- Initial Load ---
    getPopularMovies();
});
