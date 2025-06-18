const express = require("express");
const axios = require("axios");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = `https://73b6518d-6cbf-477f-ae9a-e0c83981b7c4-00-7tfvp7juo20j.sisko.replit.dev/callback`;

const sessionSecret = process.env.SESSION_SECRET;

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login", (req, res) => {
  const scope = [
    "user-read-email",
    "user-read-private",
    "user-top-read",
    "playlist-read-private",
    "user-library-read",
    "user-read-recently-played",
  ].join(" ");

  const auth_url =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id,
      scope,
      redirect_uri,
      show_dialog: "true",
    });

  res.redirect(auth_url);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        code,
        redirect_uri,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(client_id + ":" + client_secret).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const access_token = tokenRes.data.access_token;
    req.session.access_token = access_token;

    res.redirect("/profile");
  } catch (err) {
    console.error("Token Error Response:", err.response?.data || err.message);
    res.send(
      "Token error: " + JSON.stringify(err.response?.data || err.message),
    );
  }
});

app.get("/profile", async (req, res) => {
  const access_token = req.session.access_token;

  if (!access_token) {
    return res.redirect("/login");
  }

  try {
    const userRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: {
        Authorization: "Bearer " + access_token,
      },
    });
    const user = userRes.data;
    res.send(`
                      <html lang="de">
                        <head>
                          <meta charset="UTF-8">
                          <title>Spotify Profil</title>
                          <style>
                            body {
                              margin: 0;
                              padding: 0;
                              font-family: 'Segoe UI', sans-serif;
                              background-color: #000;
                              color: #fff;
                              display: flex;
                              justify-content: center;
                              align-items: center;
                              height: 100vh;
                            }
                            .profile-card {
                              background-color: #1e1e1e;
                              padding: 2rem;
                              border-radius: 16px;
                              box-shadow: 0 0 20px rgba(0, 0, 0, 0.8);
                              text-align: center;
                              max-width: 400px;
                              width: 100%;
                            }
                            .profile-card img {
                              max-width: 150px;
                              border-radius: 50%;
                              margin-top: 1rem;
                            }
                            a {
                              display: inline-block;
                              margin-top: 1.5rem;
                              text-decoration: none;
                              font-weight: bold;
                            }
                            .home-link {
                              color: #1db954;
                            }
                            
                          </style>
                        </head>
                        <body>
                          <div class="profile-card">
                            <h1>Hallo, ${user.display_name}!</h1>
                            <p><strong>Email:</strong> ${user.email}</p>
                            <p><strong>Land:</strong> ${user.country}</p>
                            ${
                              user.images && user.images.length > 0
                                ? `<img src="${user.images[0].url}" alt="Profilbild" />`
                                : `<img src="https://via.placeholder.com/150?text=Kein+Bild" alt="Kein Profilbild" />`
                            }
                            <div>
                            <a class="home-link" href="/playlists">Playlists</a><br/>
                            <a class="home-link" href="/MonthlyWrapped">Monthly Wrapped</a><br/>
                            <a class="home-link" href="/6MonthsWrapped">6 Months Wrapped</a><br/>
                            <a class="home-link" href="/FullWrapped">All time Wrapped</a><br/>
                            <a class="home-link" href="/recently-played">Recently played Songs</a><br/>
                              <a class="home-link" href="/">Logout</a>
                            </div>
                          </div>
                        </body>
                      </html>
                    `);
  } catch (err) {
    res.send("Error while loading profile data: " + err.message);
  }
});

app.get("/playlists", async (req, res) => {
  const access_token = req.session.access_token;

  if (!access_token) {
    return res.redirect("/login");
  }

  try {
    const playlistRes = await axios.get(
      "https://api.spotify.com/v1/me/playlists",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const playlists = playlistRes.data.items;

    let playlistHTML = playlists
      .map((playlist) => {
        return `
          <div class="playlist-card">
            <h3>${playlist.name}</h3>
            <p><strong>Tracks:</strong> ${playlist.tracks.total}</p>
            ${
              playlist.images && playlist.images.length > 0
                ? `<img src="${playlist.images[0].url}" alt="Playlist Cover" />`
                : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Cover" />`
            }
          </div>
        `;
      })
      .join("");

    res.send(`
      <html lang="de">
        <head>
          <meta charset="UTF-8">
          <title>Your Spotify Playlists</title>
          <style>
            body {
              background-color: #000;
              color: #fff;
              font-family: 'Segoe UI', sans-serif;
              padding: 2rem;
            }
            .playlist-container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 1.5rem;
            }
            .playlist-card {
              background-color: #1e1e1e;
              padding: 1rem;
              border-radius: 12px;
              text-align: center;
            }
            .playlist-card img {
              max-width: 100%;
              border-radius: 8px;
              margin-top: 0.5rem;
            }
            a {
              color: #1db954;
              text-decoration: none;
              font-weight: bold;
              display: inline-block;
              margin-bottom: 2rem;
            }
          </style>
        </head>
        <body>
          <a href="/profile">Back to Profil</a>
          <h1>Your Playlists</h1>
          <div class="playlist-container">
            ${playlistHTML}
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(
      "Error while loading your Playlists:",
      err.response?.data || err.message,
    );
    res.send(
      "Error while loading the Playlists: " +
        JSON.stringify(err.response?.data || err.message),
    );
  }
});

app.get("/MonthlyWrapped", async (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.redirect("/login");
  }

  try {
    const topTracksRes = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=10",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const topTracks = topTracksRes.data.items;
    let topTracksHTML = topTracks
      .map((track) => {
        return `
        <div class="track-card">
          <h3>${track.name}</h3>
          <p><strong>Artist:</strong> ${track.artists.map((artist) => artist.name).join(", ")}</p>
          <p><strong>Album:</strong> ${track.album.name}</p>
          ${
            track.album.images && track.album.images.length > 0
              ? `<img src="${track.album.images[0].url}" alt="Album Cover" />`
              : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Cover" />`
          }
        </div>
      `;
      })
      .join("");

    const topArtistsRes = await axios.get(
      "https://api.spotify.com/v1/me/top/artists?time_range=short_term&limit=10",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const topArtists = topArtistsRes.data.items;
    let topArtistsHTML = topArtists
      .map((artist) => {
        return `
        <div class="artist-card">
          <h3>${artist.name}</h3>
          ${
            artist.images && artist.images.length > 0
              ? `<img src="${artist.images[0].url}" alt="${artist.name} Picture" />`
              : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Picture" />`
          }
        </div>
      `;
      })
      .join("");

    res.send(`
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <title>Monthly Wrapped</title>
          <style>
            body {
              background-color: #000;
              color: #fff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              margin: 0;
            }
            h1 {
              text-align: center;
              margin-bottom: 2rem;
              color: #1db954;
            }
            .container {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 2rem;
            }
            .track-card, .artist-card {
              background-color: #1e1e1e;
              border-radius: 12px;
              padding: 1rem;
              width: 220px;
              box-shadow: 0 0 10px rgba(29, 185, 84, 0.6);
              text-align: center;
            }
            .track-card img, .artist-card img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              margin-top: 0.5rem;
              object-fit: cover;
            }
            p {
              margin: 0.5rem 0;
            }
            a.home-link {
              display: inline-block;
              margin: 2rem auto 0;
              color: #1db954;
              text-decoration: none;
              font-weight: bold;
              text-align: center;
            }
            a.home-link:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>Monthly Wrapped</h1>

          <h2>Your Top Songs (this Month)</h2>
          <div class="container">
            ${topTracksHTML}
          </div>

          <h2>Your Top Künstler (this Month)</h2>
          <div class="container">
            ${topArtistsHTML}
          </div>

          <div style="text-align: center;">
            <a class="home-link" href="/profile">Back to Profil</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error while loading data:", error.message);
    res.status(500).send("Error while loading Spotify-Data:");
  }
});

app.get("/6MonthsWrapped", async (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.redirect("/login");
  }

  try {
    const topTracksRes = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const topTracks = topTracksRes.data.items;
    let topTracksHTML = topTracks
      .map((track) => {
        return `
        <div class="track-card">
          <h3>${track.name}</h3>
          <p><strong>Artist:</strong> ${track.artists.map((artist) => artist.name).join(", ")}</p>
          <p><strong>Album:</strong> ${track.album.name}</p>
          ${
            track.album.images && track.album.images.length > 0
              ? `<img src="${track.album.images[0].url}" alt="Album Cover" />`
              : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Cover" />`
          }
        </div>
      `;
      })
      .join("");

    const topArtistsRes = await axios.get(
      "https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const topArtists = topArtistsRes.data.items;
    let topArtistsHTML = topArtists
      .map((artist) => {
        return `
        <div class="artist-card">
          <h3>${artist.name}</h3>
          ${
            artist.images && artist.images.length > 0
              ? `<img src="${artist.images[0].url}" alt="${artist.name} Picture" />`
              : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Picture" />`
          }
        </div>
      `;
      })
      .join("");

    res.send(`
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <title>6 Months Wrapped</title>
          <style>
            body {
              background-color: #000;
              color: #fff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              margin: 0;
            }
            h1 {
              text-align: center;
              margin-bottom: 2rem;
              color: #1db954;
            }
            .container {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 2rem;
            }
            .track-card, .artist-card {
              background-color: #1e1e1e;
              border-radius: 12px;
              padding: 1rem;
              width: 220px;
              box-shadow: 0 0 10px rgba(29, 185, 84, 0.6);
              text-align: center;
            }
            .track-card img, .artist-card img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              margin-top: 0.5rem;
              object-fit: cover;
            }
            p {
              margin: 0.5rem 0;
            }
            a.home-link {
              display: inline-block;
              margin: 2rem auto 0;
              color: #1db954;
              text-decoration: none;
              font-weight: bold;
              text-align: center;
            }
            a.home-link:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>Monthly Wrapped</h1>

          <h2>Your Top Songs (last 6 Month)</h2>
          <div class="container">
            ${topTracksHTML}
          </div>

          <h2>Your Top Künstler (last 6 Month)</h2>
          <div class="container">
            ${topArtistsHTML}
          </div>

          <div style="text-align: center;">
            <a class="home-link" href="/profile">Back to Profil</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error while loading data:", error.message);
    res.status(500).send("Error while loading Spotify-Data:");
  }
});

app.get("/FullWrapped", async (req, res) => {
  const access_token = req.session.access_token;
  if (!access_token) {
    return res.redirect("/login");
  }

  try {
    const topTracksRes = await axios.get(
      "https://api.spotify.com/v1/me/top/tracks?time_range=long_term&limit=10",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const topTracks = topTracksRes.data.items;
    let topTracksHTML = topTracks
      .map((track) => {
        return `
        <div class="track-card">
          <h3>${track.name}</h3>
          <p><strong>Artist:</strong> ${track.artists.map((artist) => artist.name).join(", ")}</p>
          <p><strong>Album:</strong> ${track.album.name}</p>
          ${
            track.album.images && track.album.images.length > 0
              ? `<img src="${track.album.images[0].url}" alt="Album Cover" />`
              : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Cover" />`
          }
        </div>
      `;
      })
      .join("");

    const topArtistsRes = await axios.get(
      "https://api.spotify.com/v1/me/top/artists?time_range=long_term&limit=10",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const topArtists = topArtistsRes.data.items;
    let topArtistsHTML = topArtists
      .map((artist) => {
        return `
        <div class="artist-card">
          <h3>${artist.name}</h3>
          ${
            artist.images && artist.images.length > 0
              ? `<img src="${artist.images[0].url}" alt="${artist.name} Picture" />`
              : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Picture" />`
          }
        </div>
      `;
      })
      .join("");

    res.send(`
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <title>All time Wrapped</title>
          <style>
            body {
              background-color: #000;
              color: #fff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              margin: 0;
            }
            h1 {
              text-align: center;
              margin-bottom: 2rem;
              color: #1db954;
            }
            .container {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 2rem;
            }
            .track-card, .artist-card {
              background-color: #1e1e1e;
              border-radius: 12px;
              padding: 1rem;
              width: 220px;
              box-shadow: 0 0 10px rgba(29, 185, 84, 0.6);
              text-align: center;
            }
            .track-card img, .artist-card img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              margin-top: 0.5rem;
              object-fit: cover;
            }
            p {
              margin: 0.5rem 0;
            }
            a.home-link {
              display: inline-block;
              margin: 2rem auto 0;
              color: #1db954;
              text-decoration: none;
              font-weight: bold;
              text-align: center;
            }
            a.home-link:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>All time Wrapped</h1>

          <h2>Your Top Songs</h2>
          <div class="container">
            ${topTracksHTML}
          </div>

          <h2>Your Top Künstler</h2>
          <div class="container">
            ${topArtistsHTML}
          </div>

          <div style="text-align: center;">
            <a class="home-link" href="/profile">Back to Profil</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error while loading data:", error.message);
    res.status(500).send("Error while loading Spotify-Data:");
  }
});

app.get("/recently-played", async (req, res) => {
  const access_token = req.session.access_token;

  if (!access_token) {
    return res.redirect("/login");
  }

  try {
    const recentlyPlayedRes = await axios.get(
      "https://api.spotify.com/v1/me/player/recently-played?limit=50",
      {
        headers: {
          Authorization: "Bearer " + access_token,
        },
      },
    );

    const tracks = recentlyPlayedRes.data.items;

    let tracksHTML = tracks
      .map((item) => {
        const track = item.track;
        const playedAt = new Date(item.played_at).toLocaleString("de-DE", {
          dateStyle: "short",
          timeStyle: "short",
        });

        return `
          <div class="track-card">
            <h3>${track.name}</h3>
            <p><strong>Artist:</strong> ${track.artists.map((a) => a.name).join(", ")}</p>
            <p><strong>Album:</strong> ${track.album.name}</p>
            <p><small>Gespielt am: ${playedAt}</small></p>
            ${
              track.album.images && track.album.images.length > 0
                ? `<img src="${track.album.images[0].url}" alt="Album Cover" />`
                : `<img src="https://via.placeholder.com/150?text=No+Picture" alt="No Cover" />`
            }
          </div>
        `;
      })
      .join("");

    res.send(`
      <html lang="de">
        <head>
          <meta charset="UTF-8" />
          <title>Recently played Songs</title>
          <style>
            body {
              background-color: #000;
              color: #fff;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              margin: 0;
            }
            h1 {
              text-align: center;
              margin-bottom: 2rem;
              color: #1db954;
            }
            .container {
              display: flex;
              flex-wrap: wrap;
              justify-content: center;
              gap: 2rem;
            }
            .track-card {
              background-color: #1e1e1e;
              border-radius: 12px;
              padding: 1rem;
              width: 220px;
              box-shadow: 0 0 10px rgba(29, 185, 84, 0.6);
              text-align: center;
            }
            .track-card img {
              width: 100%;
              height: auto;
              border-radius: 8px;
              margin-top: 0.5rem;
              object-fit: cover;
            }
            p {
              margin: 0.3rem 0;
            }
            a.home-link {
              display: inline-block;
              margin: 2rem auto 0;
              color: #1db954;
              text-decoration: none;
              font-weight: bold;
              text-align: center;
            }
            a.home-link:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          <h1>Recently played Songs</h1>
          <div class="container">${tracksHTML}</div>
          <div style="text-align: center;">
            <a class="home-link" href="/profile">Back to Profile</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "Error while loading Data from recently played Songs:",
      error.response?.data || error.message,
    );
    res
      .status(500)
      .send("Error while loading Data from recently played Songs.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
