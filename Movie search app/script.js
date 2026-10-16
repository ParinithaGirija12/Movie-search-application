// CineGlow now uses TMDB instead of OMDb.
// Paste your TMDB API Read Access Token between the quotes below.
// Do not publish a real token in a public repository or shared source file.

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const $ = (id) => document.getElementById(id);
const welcomeSection = $("welcome-section");
const searchSection = $("search-section");
const resultsSection = $("results-section");
const detailSection = $("detail-section");
const groupSection = $("group-section");
const watchlistSection = $("watchlist-section");
const movieResults = $("movie-results");
const watchlistResults = $("watchlist-results");

let selectedMood = "";
let previousMovies = [];
// Remember which screen the user came from so Back behaves naturally.
let resultsOrigin = "welcome";
let detailOrigin = "results-section";
let activePage = "discover";
let watchlist = loadWatchlist();

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem("cineglow-watchlist") || "[]"); }
  catch { return []; }
}
function saveWatchlist() {
  try { localStorage.setItem("cineglow-watchlist", JSON.stringify(watchlist)); }
  catch (error) { console.warn("Watchlist could not be saved in this browser.", error); }
  updateWatchlistCount();
}
function updateWatchlistCount() {
  const count = $("watchlist-count");
  if (count) count.textContent = String(watchlist.length);
}
function isInWatchlist(movie) {
  return watchlist.some((item) => String(item.id) === String(movie.id));
}
function toggleWatchlist(movie) {
  if (isInWatchlist(movie)) {
    watchlist = watchlist.filter((item) => String(item.id) !== String(movie.id));
  } else {
    watchlist.unshift({
      id: movie.id, title: movie.Title || movie.title || "Untitled",
      release_date: movie.release_date || "", poster_path: movie.poster_path || null,
      overview: movie.Plot || movie.overview || "", original_language: movie.original_language || "",
      vote_average: movie.vote_average || 0, genre_ids: movie.genre_ids || [],
      titleFallback: movie.Title || movie.title || "Untitled"
    });
  }
  saveWatchlist();
  renderWatchlist();
  renderCurrentMovieCards();
}
function renderCurrentMovieCards() {
  // Re-render visible results so Save/Remove button labels stay in sync.
  if (resultsSection && !resultsSection.hidden) displayMovies(previousMovies);
}
function renderWatchlist() {
  if (!watchlistResults) return;
  watchlistResults.replaceChildren();
  if (!watchlist.length) {
    setStatus("watchlist-message", "Your watchlist is empty. Search for a movie and choose Save to watchlist.");
    return;
  }
  setStatus("watchlist-message", `${watchlist.length} movie${watchlist.length === 1 ? "" : "s"} saved on this browser.`);
  watchlist.forEach((saved) => {
    const movie = normalizeMovie({
      id: saved.id, title: saved.title || saved.titleFallback, release_date: saved.release_date,
      poster_path: saved.poster_path, overview: saved.overview, original_language: saved.original_language,
      vote_average: saved.vote_average, genre_ids: saved.genre_ids || []
    });
    watchlistResults.appendChild(createMovieCard(movie));
  });
}

const moodGenres = {
  Happy: 35,       // Comedy
  Sad: 18,         // Drama
  Relaxed: 10751,  // Family
  Excited: 28,     // Action
  Curious: 9648,   // Mystery
  Romantic: 10749  // Romance
};

const genreNames = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
  80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
  14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
  9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
  10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

const languageNames = {
  en: "English", kn: "Kannada", hi: "Hindi", ta: "Tamil", te: "Telugu",
  ml: "Malayalam", ja: "Japanese", ko: "Korean", fr: "French", es: "Spanish",
  de: "German", it: "Italian", any: "Any language"
};

let currentSection = welcomeSection;
const sectionHistory = [];

function showSection(section, options = {}) {
  if (!section) return;
  const pushHistory = options.pushHistory !== false;
  if (section !== currentSection && pushHistory && currentSection) {
    sectionHistory.push(currentSection);
    if (sectionHistory.length > 30) sectionHistory.shift();
  }

  [welcomeSection, searchSection, resultsSection, detailSection, groupSection, watchlistSection]
    .filter(Boolean).forEach((item) => { item.hidden = item !== section; });
  currentSection = section;

  const pageBySection = new Map([
    [welcomeSection, "mood"], [searchSection, "discover"], [groupSection, "group"],
    [watchlistSection, "watchlist"], [resultsSection, "results"], [detailSection, "details"]
  ]);
  activePage = pageBySection.get(section) || activePage;
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === activePage);
  });
  const backButton = $("global-back");
  if (backButton) backButton.hidden = section === welcomeSection;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  // Skip stale/hidden entries and return to the most recent valid screen.
  while (sectionHistory.length) {
    const previous = sectionHistory.pop();
    if (previous && previous !== currentSection) {
      if (previous === watchlistSection) renderWatchlist();
      showSection(previous, { pushHistory: false });
      return;
    }
  }
  // A sensible fallback if the user opens a deep link or history is empty.
  if (currentSection !== welcomeSection) showSection(welcomeSection, { pushHistory: false });
}

function setStatus(id, text) {
  $(id).textContent = text;
}

function getPoster(movie) {
  return movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : "https://placehold.co/300x450/203A38/EAF2ED?text=No+Poster";
}

function getLanguageLabel(code) {
  return languageNames[code] || (code ? code.toUpperCase() : "Unknown");
}

function getGenreLabel(movie) {
  if (movie.genres && movie.genres.length) return movie.genres.map((g) => g.name).join(", ");
  if (movie.genre_ids && movie.genre_ids.length) {
    return movie.genre_ids.map((id) => genreNames[id] || "Other").join(", ");
  }
  return "Genre unavailable";
}

async function tmdbFetch(path, params = {}) {
  if (!TMDB_READ_ACCESS_TOKEN || TMDB_READ_ACCESS_TOKEN === "PASTE_YOUR_TMDB_READ_ACCESS_TOKEN_HERE") {
    throw new Error("Add your TMDB API Read Access Token in script.js first.");
  }

  const url = new URL(`${TMDB_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_READ_ACCESS_TOKEN.trim()}`
    }
  });

  let data;
  try { data = await response.json(); }
  catch { throw new Error(`TMDB returned an unreadable response (HTTP ${response.status}).`); }

  if (!response.ok) {
    const message = data.status_message || `HTTP ${response.status}`;
    if (response.status === 401) throw new Error("TMDB rejected the token. Check that you pasted the API Read Access Token, not the shorter API key.");
    throw new Error(`TMDB error: ${message}`);
  }
  return data;
}

function normalizeMovie(movie) {
  return {
    ...movie,
    Title: movie.title || movie.name || "Untitled",
    Year: (movie.release_date || movie.first_air_date || "").slice(0, 4) || "Year unavailable",
    Genre: getGenreLabel(movie),
    imdbRating: typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A",
    Poster: getPoster(movie),
    Plot: movie.overview || "Plot not available.",
    id: movie.id,
    original_language: movie.original_language || "",
    release_date: movie.release_date || "",
    vote_average: movie.vote_average,
    poster_path: movie.poster_path
  };
}

async function searchMoviesByTitle(title) {
  const data = await tmdbFetch("/search/movie", {
    query: title,
    include_adult: false,
    language: "en-US",
    page: 1
  });
  return (data.results || []).map(normalizeMovie);
}

async function getMovieDetails(movie) {
  const data = await tmdbFetch(`/movie/${movie.id}`, {
    language: "en-US",
    append_to_response: "credits,release_dates"
  });
  const director = (data.credits?.crew || []).find((person) => person.job === "Director")?.name || "Not available";
  const actors = (data.credits?.cast || []).slice(0, 6).map((person) => person.name).join(", ") || "Not available";
  const language = getLanguageLabel(data.original_language);
  const genres = (data.genres || []).map((genre) => genre.name).join(", ") || "Not available";
  return { ...normalizeMovie(data), Director: director, Actors: actors, Language: language, Genre: genres,
    Runtime: data.runtime ? `${data.runtime} min` : "Not available",
    Rated: "See release information", Awards: "Not provided by TMDB" };
}

function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";

  const poster = document.createElement("img");
  poster.src = getPoster(movie);
  poster.alt = `Poster for ${movie.Title}`;
  poster.loading = "lazy";

  const content = document.createElement("div");
  content.className = "movie-card-content";

  const title = document.createElement("h3");
  title.textContent = movie.Title;

  const meta = document.createElement("p");
  meta.className = "movie-meta";
  meta.textContent = `${movie.Year || "Year unavailable"} · ${getGenreLabel(movie)} · ${getLanguageLabel(movie.original_language)}`;

  const rating = document.createElement("p");
  rating.className = "rating";
  rating.textContent = `★ ${movie.imdbRating && movie.imdbRating !== "N/A" ? movie.imdbRating : "Not rated"} / 10`;

  const button = document.createElement("button");
  button.className = "primary-button";
  button.textContent = "View details";
  button.addEventListener("click", () => showMovieDetails(movie));

  const saveButton = document.createElement("button");
  saveButton.className = "secondary-button watchlist-toggle";
  saveButton.textContent = isInWatchlist(movie) ? "✓ Saved · Remove" : "+ Save to watchlist";
  saveButton.addEventListener("click", () => toggleWatchlist(movie));

  content.append(title, meta, rating, button, saveButton);
  card.append(poster, content);
  return card;
}

function displayMovies(movies) {
  previousMovies = movies;
  movieResults.replaceChildren();
  movies.forEach((movie) => movieResults.appendChild(createMovieCard(movie)));
}

async function showMovieDetails(movie) {
  detailOrigin = !watchlistSection.hidden ? "watchlist-section" : "results-section";
  const root = $("movie-detail");
  root.replaceChildren();
  showSection(detailSection);
  const loading = document.createElement("p");
  loading.className = "status";
  loading.textContent = "Loading movie details...";
  root.appendChild(loading);

  try {
    const fullMovie = await getMovieDetails(movie);
    root.replaceChildren();
    const layout = document.createElement("div");
    layout.className = "detail-content";

    const poster = document.createElement("img");
    poster.src = getPoster(fullMovie);
    poster.alt = `Poster for ${fullMovie.Title}`;

    const info = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = fullMovie.Title;
    const rating = document.createElement("p");
    rating.className = "rating";
    rating.textContent = `★ TMDB ${fullMovie.imdbRating}/10`;
    const meta = document.createElement("p");
    meta.textContent = `${fullMovie.Year} · ${fullMovie.Runtime}`;
    info.append(title, rating, meta);
    const saveButton = document.createElement("button");
    saveButton.className = "primary-button detail-save-button";
    saveButton.textContent = isInWatchlist(fullMovie) ? "✓ Saved · Remove from watchlist" : "+ Save to watchlist";
    saveButton.addEventListener("click", () => {
      toggleWatchlist(fullMovie);
      saveButton.textContent = isInWatchlist(fullMovie) ? "✓ Saved · Remove from watchlist" : "+ Save to watchlist";
    });
    info.appendChild(saveButton);

    [
      ["Genre", fullMovie.Genre], ["Overview", fullMovie.Plot],
      ["Director", fullMovie.Director], ["Cast", fullMovie.Actors],
      ["Original language", fullMovie.Language], ["Release date", fullMovie.release_date || "Not available"]
    ].forEach(([label, value]) => {
      const p = document.createElement("p");
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      p.append(strong, document.createTextNode(value || "Not available"));
      info.appendChild(p);
    });
    layout.append(poster, info);
    root.appendChild(layout);
  } catch (error) {
    root.replaceChildren();
    const message = document.createElement("p");
    message.className = "status";
    message.textContent = error.message;
    root.appendChild(message);
  }
}

async function loadRecommendations() {
  if (!selectedMood) {
    setStatus("mood-message", "Please choose a mood first.");
    return;
  }

  const genreChoice = $("genre-select").value;
  const languageChoice = $("language-select").value;
  const genreId = genreChoice === "Any" ? moodGenres[selectedMood] : genreChoice;
  const params = {
    sort_by: "popularity.desc",
    include_adult: false,
    page: 1,
    with_genres: genreChoice === "Any" ? genreId : genreChoice
  };
  if (languageChoice !== "any") params.with_original_language = languageChoice;

  resultsOrigin = "welcome";
  showSection(resultsSection);
  const genreName = genreChoice === "Any" ? genreNames[genreId] : genreNames[Number(genreChoice)];
  const languageName = getLanguageLabel(languageChoice);
  $("results-title").textContent = `${selectedMood} mood · ${genreName || "Recommended"}`;
  setStatus("results-message", `Finding ${languageChoice === "any" ? "movies" : languageName + " movies"} for you...`);
  movieResults.replaceChildren();
  const button = $("recommend-button");
  button.disabled = true;

  try {
    const data = await tmdbFetch("/discover/movie", params);
    const movies = (data.results || []).map(normalizeMovie);
    if (!movies.length) {
      throw new Error(`No movies found for ${languageName} and this genre. Try another language or genre.`);
    }
    displayMovies(movies.slice(0, 12));
    setStatus("results-message", `Showing ${Math.min(movies.length, 12)} ${languageChoice === "any" ? "movies" : languageName + " movies"}. These are matched by original language.`);
  } catch (error) {
    console.error("TMDB recommendation error:", error);
    setStatus("results-message", error.message);
  } finally {
    button.disabled = false;
  }
}

async function searchMovie(event) {
  event.preventDefault();
  const title = $("movie-input").value.trim();
  if (!title) return;

  const button = $("search-button");
  button.disabled = true;
  button.textContent = "Searching...";
  resultsOrigin = "search";
  showSection(resultsSection);
  $("results-title").textContent = `Search results for “${title}”`;
  setStatus("results-message", "Searching TMDB...");
  movieResults.replaceChildren();

  try {
    const movies = await searchMoviesByTitle(title);
    if (!movies.length) throw new Error("No matching movies found. Try a different title or spelling.");
    displayMovies(movies.slice(0, 12));
    setStatus("results-message", `Found ${Math.min(movies.length, 12)} result(s). Select a movie to see details.`);
  } catch (error) {
    console.error("TMDB search error:", error);
    setStatus("results-message", error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Search →";
  }
}

$("mood-grid").addEventListener("click", (event) => {
  const card = event.target.closest(".mood-card");
  if (!card) return;
  selectedMood = card.dataset.mood;
  document.querySelectorAll(".mood-card").forEach((item) => {
    const selected = item === card;
    item.classList.toggle("selected", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  setStatus("mood-message", `Selected mood: ${selectedMood}`);
});

$("recommend-button").addEventListener("click", loadRecommendations);
$("search-form").addEventListener("submit", searchMovie);
document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.page;
    if (page === "discover") { showSection(searchSection); $("movie-input").focus(); }
    if (page === "mood") showSection(welcomeSection);
    if (page === "group") showSection(groupSection);
    if (page === "watchlist") { renderWatchlist(); showSection(watchlistSection); }
  });
});
$("global-back").addEventListener("click", goBack);
document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", goBack));
$("back-to-mood").addEventListener("click", () => {
  // This is a deliberate destination button, so go straight to Mood Match.
  showSection(welcomeSection);
});
$("change-mood").addEventListener("click", () => showSection(welcomeSection));
$("back-from-results").addEventListener("click", goBack);
$("back-to-results").addEventListener("click", goBack);
const moodChoices = ["Happy", "Sad", "Relaxed", "Excited", "Curious", "Romantic"];
function renderPeopleMoodInputs() {
  const count = Number($("people-count").value || 2);
  const root = $("people-moods");
  root.replaceChildren();
  for (let i = 1; i <= count; i++) {
    const wrap = document.createElement("div");
    wrap.className = "person-mood";
    const label = document.createElement("label");
    label.htmlFor = `person-mood-${i}`;
    label.textContent = `Person ${i}'s mood`;
    const select = document.createElement("select");
    select.id = `person-mood-${i}`;
    select.className = "person-mood-select";
    moodChoices.forEach((mood) => {
      const option = document.createElement("option");
      option.value = mood; option.textContent = mood;
      if (i === 1 && mood === "Happy") option.selected = true;
      if (i === 2 && mood === "Curious") option.selected = true;
      select.appendChild(option);
    });
    wrap.append(label, select);
    root.appendChild(wrap);
  }
}
async function loadGroupMatch() {
  const moods = [...document.querySelectorAll(".person-mood-select")].map((select) => select.value);
  if (!moods.length) return;
  const votes = {};
  moods.forEach((mood) => { const genre = moodGenres[mood]; votes[genre] = (votes[genre] || 0) + 1; });
  const sortedGenres = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  // Use genres liked by the most people first; tied tastes are combined as OR.
  const topVote = sortedGenres[0][1];
  const chosenGenres = sortedGenres.filter((entry) => entry[1] === topVote).map((entry) => entry[0]);
  const language = $("group-language").value;
  const params = { sort_by: "popularity.desc", include_adult: false, page: 1, with_genres: chosenGenres.join("|") };
  if (language !== "any") params.with_original_language = language;
  setStatus("group-message", "Finding a movie your group might agree on...");
  $("group-match-button").disabled = true;
  try {
    const data = await tmdbFetch("/discover/movie", params);
    const movies = (data.results || []).map(normalizeMovie);
    if (!movies.length) throw new Error("No group matches found. Try another language or change a mood.");
    resultsOrigin = "group";
    showSection(resultsSection);
    $("results-title").textContent = "Your Group Match 🎉";
    setStatus("results-message", `Matched the most common mood${chosenGenres.length > 1 ? "s" : ""}: ${chosenGenres.map((id) => genreNames[id]).join(" + ")}. This is a suggestion, so everyone can vote!`);
    displayMovies(movies.slice(0, 12));
  } catch (error) {
    setStatus("group-message", error.message);
  } finally {
    $("group-match-button").disabled = false;
  }
}
$("people-count").addEventListener("change", renderPeopleMoodInputs);
$("group-match-button").addEventListener("click", loadGroupMatch);
renderPeopleMoodInputs();
updateWatchlistCount();

$("home-link").addEventListener("click", (event) => {
  event.preventDefault();
  selectedMood = "";
  document.querySelectorAll(".mood-card").forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
  });
  sectionHistory.length = 0;
  showSection(welcomeSection, { pushHistory: false });
});
