document.addEventListener("DOMContentLoaded", () => {
    // --- API Configuration ---
    const tmdbApiKey = '798d6f8f46539dc4da57904c17b76e28'; // <--- TMDb Key
    const baseApiUrl = 'https://api.themoviedb.org/3';
    const baseImageUrl = 'https://image.tmdb.org/t/p/w500';

    const omdbApiKey = '84c5ac60'; // <--- OMDb Key
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

    // --- Theme Toggle (Copied from your weather app script) ---
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

    // --- Core Functions ---

    /**
     * Fetches data from the TMDb API
     * @param {string} endpoint - The API endpoint (e.g., '/movie/popular')
     */
    async function fetchFromApi(endpoint) {
        // Check if API key is set
        if (tmdbApiKey === 'YOUR_API_KEY_HERE') { // Check for placeholder
            console.error("TMDb API Key not set!");
            alert("Please add your TMDb API key to the script section.");
            return null; // Stop execution
        }
        
        const url = `${baseApiUrl}${endpoint}?api_key=${tmdbApiKey}&language=en-US`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                // Specific check for 401
                if (response.status === 401) {
                    throw new Error(`API Error: 401 (Unauthorized). Your TMDb API Key is invalid or has expired. Please get a new one from themoviedb.org.`);
                }
                throw new Error(`API Error: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to fetch data:", error);
            // Display the specific error message in the alert
            alert(`Error fetching data: ${error.message}`);
        }
    }

    /**
     * Fetches data from OMDb API by IMDb ID
     * @param {string} imdbId - The IMDb ID of the movie
     */
    async function fetchFromOmdbApi(imdbId) {
        if (omdbApiKey === 'YOUR_OMDB_API_KEY_HERE') {
            console.warn("OMDb API Key not set. Skipping OMDb details.");
            return null; // Don't stop Promise.all, just return null
        }
        const url = `${omdbApiUrl}?i=${imdbId}&apikey=${omdbApiKey}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OMDb API Error: ${response.status}`);
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error("Failed to fetch OMDb data:", error);
            return null; // Return null so Promise.all doesn't fail
        }
    }

    /**
     * Creates and displays movie cards in the grid
     * @param {Array} movies - Array of movie objects from the API
     * @param {HTMLElement} container - The container to inject cards into
     */
    function displayMovies(movies, container) {
        container.innerHTML = ""; // Clear previous results

        if (!movies || movies.length === 0) {
            container.innerHTML = "<p style='color: var(--secondary-text-color);'>No movies found.</p>";
            return;
        }

        movies.forEach(movie => {
            // Use a placeholder if poster is not available
            const posterPath = movie.poster_path 
                ? `${baseImageUrl}${movie.poster_path}`
                : 'https://placehold.co/500x750/666/FFFFFF?text=No+Image';
            
            // Determine rating color
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
            // We use an arrow function here to pass the movie.id correctly
            movieCard.setAttribute('data-movie-id', movie.id); // Set ID for click listener
            
            movieCard.innerHTML = `
                <img src="${posterPath}" alt="${movie.title}">
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
        const data = await fetchFromApi('/movie/popular');
        if (data && data.results) {
            displayMovies(data.results, popularContainer);
        }
    }

    /**
     * Fetches and displays search results
     */
    async function searchMovies() {
        const query = searchInput.value.trim();
        if (!query) {
            // Show popular movies and hide search results if query is empty
            popularSection.style.display = 'block';
            searchSection.style.display = 'none';
            resultsContainer.innerHTML = ""; // Clear results
            return;
        }

        const data = await fetchFromApi(`/search/movie?query=${encodeURIComponent(query)}`);
        if (data && data.results) {
            displayMovies(data.results, resultsContainer);
            // Hide popular movies and show search results
            popularSection.style.display = 'none';
            searchSection.style.display = 'block';
        }
    }

    // --- Modal (Popup) Functions ---

    /**
     * Opens the modal with details for a specific movie ID
     * @param {string} movieId - The TMDb movie ID
     */
    async function openModal(movieId) {
        // Step 1: Fetch primary details from TMDb (to get imdb_id)
        const tmdbDetails = await fetchFromApi(`/movie/${movieId}`);
        if (!tmdbDetails) {
            alert("Failed to fetch movie details.");
            return;
        }

        const imdbId = tmdbDetails.imdb_id;

        // Step 2: Fetch credits, videos, and OMDb details in parallel
        const [tmdbCredits, tmdbVideos, omdbDetails] = await Promise.all([
            fetchFromApi(`/movie/${movieId}/credits`),
            fetchFromApi(`/movie/${movieId}/videos`),
            imdbId ? fetchFromOmdbApi(imdbId) : Promise.resolve(null) // Only fetch if imdbId exists
        ]);


        if (!tmdbDetails || !tmdbCredits || !tmdbVideos) {
             alert("Failed to fetch all movie details.");
             return; // Check all required TMDb responses
        }
        
        // Find the official YouTube trailer
        const trailer = tmdbVideos.results.find(video => video.site === 'YouTube' && video.type === 'Trailer');
        const posterPath = tmdbDetails.poster_path 
            ? `${baseImageUrl}${tmdbDetails.poster_path}`
            : 'https://placehold.co/500x750/666/FFFFFF?text=No+Image';

        // Get main cast members
        const cast = tmdbCredits.cast.slice(0, 5).map(actor => actor.name).join(', ');

        // --- Build OMDb details string ---
        let omdbRatingsHtml = '';
        if (omdbDetails && omdbDetails.Ratings && omdbDetails.Ratings.length > 0) {
            omdbRatingsHtml = omdbDetails.Ratings.map(rating =>
                `<div class="info-item"><strong>${rating.Source}:</strong> ${rating.Value}</div>`
            ).join('');
        }
        // ---

        modalBody.innerHTML = `
            <img src="${posterPath}" alt="${tmdbDetails.title}">
            <div class="modal-details">
                <h2>${tmdbDetails.title}</h2>
                <p>${tmdbDetails.overview || 'No overview available.'}</p>
                
                <!-- TMDb Details -->
                <div class="info-item"><strong>TMDb Rating:</strong> ${tmdbDetails.vote_average ? tmdbDetails.vote_average.toFixed(1) : 'N/A'} / 10</div>
                <div class="info-item"><strong>Release Date:</strong> ${tmdbDetails.release_date || 'N/A'}</div>
                <div class="info-item"><strong>Genres:</strong> ${tmdbDetails.genres.map(g => g.name).join(', ')}</div>
                <div class="info-item"><strong>Cast:</strong> ${cast || 'N/A'}</div>
                
                <!-- OMDb Details -->
                ${omdbDetails && omdbDetails.Response === "True" ? `
                    <hr style="border: 0; border-top: 1px solid var(--input-border); margin: 15px 0;">
                    <div class="info-item"><strong>Director:</strong> ${omdbDetails.Director || 'N/A'}</div>
                    <div class="info-item"><strong>Awards:</strong> ${omdbDetails.Awards || 'N/A'}</div>
                    ${omdbRatingsHtml}
                ` : ''}
                
                ${trailer ? `
                    <div class="modal-trailer">
                        <h3>Trailer</h3>
                        <iframe
                            src="https://www.youtube.com/embed/${trailer.key}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen>
                        </iframe>
                    </div>
                ` : '<p style="margin-top: 15px;">No trailer available.</p>'}
            </div>
        `;
        
        modalOverlay.style.display = 'flex';
    };

    function closeModal() {
        modalOverlay.style.display = 'none';
        
        // Stop the YouTube video from playing in the background
        const iframe = modalBody.querySelector('iframe');
        if (iframe) {
            const src = iframe.src;
            iframe.src = src; // Re-setting the src stops the video
        }
        
        modalBody.innerHTML = ""; // Clear content AFTER stopping video
    }

    // --- Event Listeners ---
    searchButton.addEventListener("click", searchMovies);
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            searchMovies();
        }
    });

    modalCloseButton.addEventListener("click", closeModal);
    modalOverlay.addEventListener("click", (e) => {
        // Close modal if user clicks on the dark overlay (outside the content)
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Add click listeners to the containers for event delegation
    popularContainer.addEventListener('click', handleCardClick);
    resultsContainer.addEventListener('click', handleCardClick);

    // --- Initial Load ---
    getPopularMovies();
});
