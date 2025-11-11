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

    // ... (rest unchanged)

