// 映画を検索して登録する画面の処理をまとめたファイルです。
// Supabase クライアント（sb）は js/supabaseClient.js、
// TMDB の関数（tmdbSearchMovies など）は js/tmdb.js で用意しています。

// -------------------------------------------------------------
// 画面の部品を取得
// -------------------------------------------------------------
const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const registerForm = document.getElementById("register-form");
const registerMessage = document.getElementById("register-message");

const selectedPoster = document.getElementById("selected-poster");
const selectedTitle = document.getElementById("selected-title");
const selectedOverview = document.getElementById("selected-overview");
const genreList = document.getElementById("genre-list");
const ratingInput = document.getElementById("rating-input");
const ratingValueLabel = document.getElementById("rating-value");
const starFill = document.getElementById("star-fill");
const reviewInput = document.getElementById("review-input");
const spoilerInput = document.getElementById("spoiler-input");
const watchedInput = document.getElementById("watched-input");
const methodInput = document.getElementById("method-input");
const cancelRegisterButton = document.getElementById("cancel-register");

// いま選択中の映画（TMDB の詳細情報）を覚えておく変数
let selectedMovie = null;

// -------------------------------------------------------------
// メッセージ表示
// -------------------------------------------------------------
function showRegisterMessage(text, type) {
  registerMessage.textContent = text;
  registerMessage.className = "message " + (type || "");
  registerMessage.hidden = false;
}

function clearRegisterMessage() {
  registerMessage.textContent = "";
  registerMessage.hidden = true;
}

// -------------------------------------------------------------
// HTML に埋め込む文字列を安全にする（記号でレイアウトが崩れないように）
// -------------------------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -------------------------------------------------------------
// 星の見た目を、スライダーの値に合わせて更新する
// -------------------------------------------------------------
function updateStars() {
  const value = parseFloat(ratingInput.value);
  ratingValueLabel.textContent = value.toFixed(1);
  starFill.style.width = (value / 5) * 100 + "%";
}

ratingInput.addEventListener("input", updateStars);

// -------------------------------------------------------------
// 今日の日付を "YYYY-MM-DD" の形で返す
// -------------------------------------------------------------
function todayString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + month + "-" + day;
}

// -------------------------------------------------------------
// 検索
// -------------------------------------------------------------
searchForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearRegisterMessage();

  const query = searchInput.value.trim();
  if (!query) return;

  searchResults.hidden = false;
  searchResults.innerHTML = "<li class='result-note'>検索中...</li>";

  try {
    const results = await tmdbSearchMovies(query);
    renderResults(results);
  } catch (error) {
    searchResults.hidden = true;
    showRegisterMessage(error.message, "error");
  }
});

// 検索結果を一覧表示する
function renderResults(results) {
  searchResults.innerHTML = "";

  if (results.length === 0) {
    searchResults.innerHTML =
      "<li class='result-note'>該当する映画が見つかりませんでした。</li>";
    return;
  }

  results.slice(0, 10).forEach(function (movie) {
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "----";
    const poster = tmdbPosterUrl(movie.poster_path, "w92");

    const li = document.createElement("li");
    li.className = "result-item";
    li.innerHTML =
      (poster
        ? "<img src='" + poster + "' alt='' class='result-poster'>"
        : "<div class='result-poster no-image'>画像なし</div>") +
      "<div class='result-info'>" +
      "<span class='result-title'>" +
      escapeHtml(movie.title) +
      "</span>" +
      "<span class='result-year'>" +
      year +
      "</span>" +
      "</div>" +
      "<button type='button' class='btn-secondary'>選ぶ</button>";

    li.querySelector("button").addEventListener("click", function () {
      selectMovie(movie.id);
    });

    searchResults.appendChild(li);
  });
}

// -------------------------------------------------------------
// 映画を選ぶ → 詳細を取得して登録フォームを表示
// -------------------------------------------------------------
async function selectMovie(id) {
  clearRegisterMessage();
  try {
    const movie = await tmdbGetMovie(id);
    selectedMovie = movie;
    fillRegisterForm(movie);
    searchResults.hidden = true;
    registerForm.hidden = false;
    registerForm.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showRegisterMessage(error.message, "error");
  }
}

// 登録フォームに、選んだ映画の情報を入れる
function fillRegisterForm(movie) {
  const poster = tmdbPosterUrl(movie.poster_path, "w185");
  if (poster) {
    selectedPoster.src = poster;
    selectedPoster.hidden = false;
  } else {
    selectedPoster.removeAttribute("src");
    selectedPoster.hidden = true;
  }

  const year = movie.release_date ? movie.release_date.slice(0, 4) : "----";
  selectedTitle.textContent = movie.title + "（" + year + "）";
  selectedOverview.textContent = movie.overview || "あらすじ情報はありません。";

  // ジャンル：TMDB から来たものをチェックボックスで表示（最初は全部オン）
  genreList.innerHTML = "";
  const genres = movie.genres || [];
  if (genres.length === 0) {
    genreList.textContent = "ジャンル情報はありません。";
  } else {
    genres.forEach(function (genre) {
      const label = document.createElement("label");
      label.className = "genre-chip";
      label.innerHTML =
        "<input type='checkbox' value='" +
        escapeHtml(genre.name) +
        "' checked> " +
        escapeHtml(genre.name);
      genreList.appendChild(label);
    });
  }

  // 入力欄の初期値
  ratingInput.value = "3";
  updateStars();
  reviewInput.value = "";
  spoilerInput.checked = false;
  watchedInput.value = todayString();
  methodInput.value = "";
}

// キャンセル：登録フォームを閉じる
cancelRegisterButton.addEventListener("click", function () {
  registerForm.hidden = true;
  selectedMovie = null;
  clearRegisterMessage();
});

// -------------------------------------------------------------
// 登録（Supabase の movies テーブルに保存）
// -------------------------------------------------------------
registerForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearRegisterMessage();

  if (!selectedMovie) return;

  // チェックが入っているジャンルだけを集める
  const selectedGenres = Array.from(
    genreList.querySelectorAll("input[type=checkbox]:checked")
  ).map(function (checkbox) {
    return checkbox.value;
  });

  const year = selectedMovie.release_date
    ? parseInt(selectedMovie.release_date.slice(0, 4), 10)
    : null;

  // テーブルの1行分のデータ。user_id はテーブル側で自動設定されます。
  const row = {
    tmdb_id: selectedMovie.id,
    title: selectedMovie.title,
    release_year: year,
    poster_url: tmdbPosterUrl(selectedMovie.poster_path, "w342") || null,
    overview: selectedMovie.overview || null,
    genres: selectedGenres,
    rating: parseFloat(ratingInput.value),
    review: reviewInput.value.trim() || null,
    has_spoiler: spoilerInput.checked,
    watched_on: watchedInput.value || null,
    watch_method: methodInput.value || null,
  };

  const submitButton = registerForm.querySelector("button[type=submit]");
  submitButton.disabled = true;

  const { error } = await sb.from("movies").insert(row);

  submitButton.disabled = false;

  if (error) {
    showRegisterMessage("登録に失敗しました: " + error.message, "error");
    return;
  }

  showRegisterMessage(
    "「" + selectedMovie.title + "」を登録しました。",
    "success"
  );
  registerForm.hidden = true;
  selectedMovie = null;
  searchInput.value = "";
});
