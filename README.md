# 🎬 FilmPotha

**FilmPotha** is a modern, responsive movie browsing and search application that allows users to discover popular films, search for specific titles, browse by genre categories, and view detailed information including trailers.

🔗 **Live Demo:** [shashennethmika.github.io/FilmPotha](https://shashennethmika.github.io/FilmPotha/)

## ✨ Features

- **🔥 Popular Movies:** Browse trending and popular movies on the homepage
- **🔍 Movie Search:** Search for any movie by title with real-time results
- **🏷️ Genre Categories:** Filter movies by 14 different genres including Action, Comedy, Horror, Sci-Fi, and more
- **📱 Responsive Design:** Fully optimized for desktop, tablet, and mobile devices
- **🌓 Dark/Light Mode:** Toggle between beautiful gradient themes
- **🎞️ Movie Details Modal:** View comprehensive movie information including:
  - Movie poster and overview
  - Rating, runtime, and genres
  - IMDb ratings and Metascore (via OMDb API)
  - Director and cast information
  - Embedded YouTube trailer
- **⚡ Smooth Animations:** Loading spinners, hover effects, and transitions

## 🚀 Setup Instructions

### Prerequisites

You need API keys from two sources:

1. **TMDb (The Movie Database) API** - Required
   - Sign up at [themoviedb.org](https://www.themoviedb.org/)
   - Go to Settings → API → Create API Key
   - Copy your API Key (v3 auth)

2. **OMDb API** - Optional (for additional ratings)
   - Get a free key at [omdbapi.com](https://www.omdbapi.com/apikey.aspx)

### Installation

1. **Clone or download this repository:**
   ```bash
   git clone https://github.com/ShashenNethmika/FilmPotha.git
   cd FilmPotha
   ```

2. **Create a `config.js` file** in the root directory:
   ```javascript
   const CONFIG = {
       tmdbApiKey: 'YOUR_TMDB_API_KEY_HERE',
       omdbApiKey: 'YOUR_OMDB_API_KEY_HERE'
   };
   ```

3. **Replace the placeholder keys** with your actual API keys.

4. **Open `index.html`** in your browser or deploy to GitHub Pages.

> **Note:** The app includes fallback API keys for testing, but you should add your own keys in `config.js` for production use.

## 🛠️ Technology Stack

- **HTML5** - Semantic markup structure
- **CSS3** - Modern styling with CSS variables, Grid, and Flexbox
- **Vanilla JavaScript (ES6+)** - No frameworks, pure JavaScript
- **TMDb API** - Movie data and images
- **OMDb API** - Additional movie ratings and information
- **YouTube Embed API** - Trailer playback

## 📂 Project Structure

```
FilmPotha/
├── index.html          # Main HTML file
├── style.css           # Styles with light/dark mode
├── script.js           # Application logic
├── config.js           # API keys configuration (create this file)
└── README.md           # Project documentation
```

## 🎨 Features Breakdown

### Search Functionality
- Real-time search with debouncing
- Search by pressing Enter or clicking the Search button
- Automatically returns to popular movies when search is cleared

### Category Browsing
- 14 genre categories with emoji icons
- Active category highlighting
- Dynamically loads movies for selected genre

### Movie Details Modal
- Click any movie card to open detailed view
- Displays poster, rating, runtime, genres
- Shows trailer if available
- Integrates OMDb data for IMDb ratings, Metascore, director, and cast
- Close with X button, clicking outside modal, or pressing Escape key

### Theme Toggle
- Persistent theme selection (saved in localStorage)
- Smooth color transitions
- Beautiful gradient backgrounds for both themes

## 🔧 Customization

You can easily customize the app:

- **Colors:** Edit CSS variables in `style.css` (`:root` for light mode, `body.dark-mode` for dark mode)
- **Genres:** Modify the `genres` array in `script.js`
- **API Endpoints:** Change base URLs in `script.js`

## 📝 License

This project is open source and available under the MIT License.

## 👨‍💼 Developer

**Shashen Nethmika**
- GitHub: [@ShashenNethmika](https://github.com/ShashenNethmika)

## 🙏 Acknowledgments

- Movie data provided by [TMDb](https://www.themoviedb.org/)
- Additional ratings from [OMDb](https://www.omdbapi.com/)
- Fonts from [Google Fonts](https://fonts.google.com/)

---

⭐ If you find this project helpful, please consider giving it a star on GitHub!
