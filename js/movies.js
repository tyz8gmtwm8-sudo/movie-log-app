// 登録した映画の一覧を表示する処理をまとめたファイルです。
// Supabase クライアント（sb）は js/supabaseClient.js、
// escapeHtml は js/util.js にあります。

// -------------------------------------------------------------
// 画面の部品を取得
// -------------------------------------------------------------
const listView = document.getElementById("list-view");
const registerView = document.getElementById("register-view");
const movieListEl = document.getElementById("movie-list");
const listMessageEl = document.getElementById("list-message");
const listLoadingEl = document.getElementById("list-loading");
const listEmptyEl = document.getElementById("list-empty");
const goRegisterButton = document.getElementById("go-register");
const backToListButton = document.getElementById("back-to-list");

// -------------------------------------------------------------
// ビュー（一覧 / 登録）の切り替え
// -------------------------------------------------------------
function showListView() {
  registerView.hidden = true;
  listView.hidden = false;
}

function showRegisterView() {
  listView.hidden = true;
  registerView.hidden = false;
}

goRegisterButton.addEventListener("click", showRegisterView);
backToListButton.addEventListener("click", showListView);

// -------------------------------------------------------------
// 一覧に一時的なお知らせを出す（数秒で消える）
// -------------------------------------------------------------
function showListMessage(text) {
  listMessageEl.textContent = text;
  listMessageEl.hidden = false;
  setTimeout(function () {
    listMessageEl.hidden = true;
  }, 4000);
}

// -------------------------------------------------------------
// 星バー（★の色つき部分の幅で評価を表す）の HTML を作る
// -------------------------------------------------------------
function starBarHtml(rating) {
  const value = Number(rating) || 0;
  const percent = (value / 5) * 100;
  return (
    "<span class='card-stars'>" +
    "<span class='card-stars-base'>★★★★★</span>" +
    "<span class='card-stars-fill' style='width:" +
    percent +
    "%'>★★★★★</span>" +
    "</span>" +
    "<span class='card-rating-num'>" +
    value.toFixed(1) +
    "</span>"
  );
}

// -------------------------------------------------------------
// ジャンルのラベル（バッジ）の HTML を作る
// -------------------------------------------------------------
function genreTagsHtml(genres) {
  if (!Array.isArray(genres) || genres.length === 0) return "";
  const tags = genres
    .map(function (name) {
      return "<span class='card-genre'>" + escapeHtml(name) + "</span>";
    })
    .join("");
  return "<div class='card-genres'>" + tags + "</div>";
}

// -------------------------------------------------------------
// 映画1件分のカード HTML を作る
// -------------------------------------------------------------
function movieCardHtml(movie) {
  const year = movie.release_year ? movie.release_year : "----";
  const poster = movie.poster_url
    ? "<img src='" +
      escapeHtml(movie.poster_url) +
      "' alt='' class='card-poster'>"
    : "<div class='card-poster no-image'>画像なし</div>";

  return (
    "<li class='movie-card'>" +
    poster +
    "<div class='card-body'>" +
    "<p class='card-title'>" +
    escapeHtml(movie.title) +
    "<span class='card-year'>（" +
    year +
    "）</span></p>" +
    "<div class='card-rating'>" +
    starBarHtml(movie.rating) +
    "</div>" +
    genreTagsHtml(movie.genres) +
    "</div>" +
    "</li>"
  );
}

// -------------------------------------------------------------
// Supabase から一覧を読み込んで表示する
// -------------------------------------------------------------
async function loadMovies() {
  movieListEl.innerHTML = "";
  listEmptyEl.hidden = true;
  listLoadingEl.hidden = false;

  // created_at（登録日時）の新しい順で取得
  const { data, error } = await sb
    .from("movies")
    .select("id, title, release_year, poster_url, genres, rating, created_at")
    .order("created_at", { ascending: false });

  listLoadingEl.hidden = true;

  if (error) {
    listEmptyEl.textContent = "一覧の読み込みに失敗しました: " + error.message;
    listEmptyEl.hidden = false;
    return;
  }

  if (!data || data.length === 0) {
    listEmptyEl.textContent =
      "まだ映画が登録されていません。「＋ 映画を登録」から追加できます。";
    listEmptyEl.hidden = false;
    return;
  }

  movieListEl.innerHTML = data.map(movieCardHtml).join("");
}

// -------------------------------------------------------------
// ログイン状態が変わったとき（ログイン直後・再読み込み時を含む）
// ログイン済みなら一覧ビューを表示して読み込む
// -------------------------------------------------------------
sb.auth.onAuthStateChange(function (_event, session) {
  if (session && session.user) {
    showListView();
    loadMovies();
  }
});
