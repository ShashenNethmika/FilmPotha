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

    // --- Category Functions ---

    function displayCategories() {
        categoriesContainer.innerHTML = '';
        
        genres.forEach(genre => {
            const categoryBtn = document.createElement('button');
            categoryBtn.classList.add('category-btn');
            categoryBtn.setAttribute('data-genre-id', genre.id);
            categoryBtn.innerHTML = `${genre.emoji} ${genre.name}`;
            
            categoryBtn.addEventListener('click', () => {
                // Remove active class from all buttons
                document.querySelectorAll('.category-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                // Add active class to clicked button
                categoryBtn.classList.add('active');
                
                // Load movies for this category
                loadMoviesByGenre(genre.id, genre.name);
            });
            
            categoriesContainer.appendChild(categoryBtn);
        });
    }

    async function loadMoviesByGenre(genreId, genreName) {
        currentGenreId = genreId;
        
        // Hide other sections
        popularSection.style.display = 'none';
        searchSection.style.display = 'none';
        categorySection.style.display = 'block';
        
        // Update title
        const genreEmoji = genres.find(g => g.id === genreId)?.emoji || '🎬';
        categoryTitle.textContent = `${genreEmoji} ${genreName} Movies`;
        
        showLoading(categoryMoviesContainer);
        
        try {
            const data = await fetchFromApi(`/discover/movie&with_genres=${genreId}&sort_by=popularity.desc`);
            if (data && data.results) {
                displayMovies(data.results, categoryMoviesContainer);
            }
        } catch (error) {
            showError(categoryMoviesContainer, "Failed to load movies. Please try again.");
        }
    }

    function handleCardClick(event) {
        const card = event.target.closest('.movie-card');
        if (card) {
            const movieId = card.getAttribute('data-movie-id');
            if (movieId) {
                openModal(movieId);
            }
        }
    }

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

    async function searchMovies() {
        const query = searchInput.value.trim();
        
        if (!query) {
            // Reset to popular movies
            popularSection.style.display = 'block';
            searchSection.style.display = 'none';
            categorySection.style.display = 'none';
            resultsContainer.innerHTML = "";
            
            // Remove active class from category buttons
            document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            return;
        }

        // Hide category section when searching
        categorySection.style.display = 'none';
        
        // Remove active class from category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        showLoading(resultsContainer);
        
        try {
            const data = await fetchFromApi(`/search/movie&query=${encodeURIComponent(query)}`);
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

    function debouncedSearch() {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchMovies();
        }, 500);
    }

    // --- Modal (Popup) Functions ---

    async function openModal(movieId) {
        currentModalId = movieId;
        
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-color);">
                <div class="loading-spinner"></div>
                <p style="margin-top: 15px;">Loading movie details...</p>
            </div>
        `;
        modalOverlay.style.display = 'flex';

        try {
            const tmdbDetails = await fetchFromApi(`/movie/${movieId}`);
            
            if (currentModalId !== movieId) return;
            
            if (!tmdbDetails) {
                throw new Error("Failed to fetch movie details.");
            }

            const imdbId = tmdbDetails.imdb_id;

            const [tmdbCredits, tmdbVideos, omdbDetails] = await Promise.all([
                fetchFromApi(`/movie/${movieId}/credits`),
                fetchFromApi(`/movie/${movieId}/videos`),
                imdbId ? fetchFromOmdbApi(imdbId) : Promise.resolve(null)
            ]);

            if (currentModalId !== movieId) return;

            if (!tmdbCredits || !tmdbVideos) {
                throw new Error("Failed to fetch all movie details.");
            }
            
            const trailer = tmdbVideos.results?.find(video => 
                video.site === 'YouTube' && video.type === 'Trailer'
            );
            
            const posterPath = tmdbDetails.poster_path 
                ? `${baseImageUrl}${tmdbDetails.poster_path}`
                : 'https://placehold.co/500x750/666/FFFFFF?text=No+Image';

            const cast = tmdbCredits.cast?.slice(0, 5).map(actor => actor.name).join(', ') || 'N/A';

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

    function closeModal() {
        currentModalId = null;
        
        const iframe = modalBody.querySelector('iframe');
        if (iframe) {
            try {
                iframe.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
            } catch (e) {
                iframe.src = iframe.src;
            }
        }
        
        modalOverlay.style.display = 'none';
        
        setTimeout(() => {
            if (modalOverlay.style.display === 'none') {
                modalBody.innerHTML = "";
            }
        }, 300);
    }

    // --- Event Listeners ---
    searchButton.addEventListener("click", searchMovies);
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

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalOverlay.style.display === 'flex') {
            closeModal();
        }
    });

    // Event delegation for movie cards
    popularContainer.addEventListener('click', handleCardClick);
    resultsContainer.addEventListener('click', handleCardClick);
    categoryMoviesContainer.addEventListener('click', handleCardClick);

    // --- Initial Load ---
    displayCategories();
    getPopularMovies();
});
