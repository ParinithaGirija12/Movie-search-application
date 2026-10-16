CineGlow Plus — TMDB movie discovery app

FILES
- index.html: app structure and navigation
- style.css: responsive teal-and-cream design
- script.js: TMDB API, search, mood match, group match and watchlist

SETUP
1. Open this folder in VS Code.
2. Open script.js.
3. Find: const TMDB_READ_ACCESS_TOKEN = "PASTE_YOUR_TMDB_READ_ACCESS_TOKEN_HERE";
4. Replace only the placeholder with your TMDB API Read Access Token. Keep the quotation marks.
5. Save and run index.html using VS Code Live Server.

FEATURES
- Discover: search for a movie by title and view details.
- Mood Match: recommend movies by mood, genre and original language.
- Group Match: choose a mood for 2–5 people; the app uses the group's most common mood genre to suggest movies. It is a simple preference-matching heuristic, not a guarantee that everyone will like the result.
- My Watchlist: save/remove movies. The list is saved in localStorage in the current browser on the current device. It does not automatically sync across devices or browsers.
- Navigation buttons remain available to switch between sections. A global Back button appears on inner screens, and section-level Back buttons use the same history so users can return to the screen they came from.
- Frontend-only project: no custom backend or database. The watchlist uses localStorage on the current browser/device.

LANGUAGE NOTE
The language filter uses the movie's ORIGINAL language. It does not guarantee availability of dubbed or subtitled versions.

SECURITY AND ATTRIBUTION
This is a front-end learning project. Any API token placed in JavaScript can be viewed by visitors after deployment. For a public production app, use a server-side proxy or serverless function to protect credentials and check TMDB's current API terms and attribution requirements. This product uses the TMDB API but is not endorsed or certified by TMDB.
