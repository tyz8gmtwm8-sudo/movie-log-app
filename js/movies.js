// 登録した映画の一覧を「ジャンル別」に表示する処理をまとめたファイルです。
// Supabase クライアント（sb）は js/supabaseClient.js、
// escapeHtml は js/util.js にあります。

// -------------------------------------------------------------
// 画面の部品を取得
// -------------------------------------------------------------
const listView = document.getElementById("list-view");
const registerView = document.getElementById("register-view");
const detailView = document.getElementById("detail-view");
const listControlsEl = document.getElementById("list-controls");
const listSearchEl = document.getElementById("list-search");
const genreFilterEl = document.getElementById("genre-filter");
const movieSectionsEl = document.getElementById("movie-sections");
const listMessageEl = document.getElementById("list-message");
const listLoadingEl = document.getElementById("list-loading");
const listEmptyEl = document.getElementById("list-empty");
const goRegisterButton = document.getElementById("go-register");
const backToListButton = document.getElementById("back-to-list");

// -------------------------------------------------------------
// この画面が覚えておく状態
// -------------------------------------------------------------
let allMovies = []; // Supabase から取得した全映画
let currentGenre = "すべて"; // 選択中のジャンルボタン
let titleQuery = ""; // タイトル絞り込みの入力文字

const NO_GENRE_LABEL = "ジャンル未設定";

// -------------------------------------------------------------
// ビュー（一覧 / 登録）の切り替え
// -------------------------------------------------------------
function showListView() {
  registerView.hidden = true;
  detailView.hidden = true;
  listView.hidden = false;
}

function showRegisterView() {
  listView.hidden = true;
  detailView.hidden = true;
  registerView.hidden = false;
}

function showDetailView() {
  listView.hidden = true;
  registerView.hidden = true;
  detailView.hidden = false;
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
    "<div class='movie-card' data-id='" +
    movie.id +
    "'>" +
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
    "</div>"
  );
}

// -------------------------------------------------------------
// 1本の映画が、指定ジャンルに当てはまるか
// -------------------------------------------------------------
function movieMatchesGenre(movie, genreName) {
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  if (genreName === NO_GENRE_LABEL) return genres.length === 0;
  return genres.indexOf(genreName) !== -1;
}

// -------------------------------------------------------------
// Supabase から一覧を読み込む
// -------------------------------------------------------------
async function loadMovies() {
  listEmptyEl.hidden = true;
  listLoadingEl.hidden = false;
  movieSectionsEl.innerHTML = "";

  // created_at（登録日時）の新しい順で、全ての列を取得
  const { data, error } = await sb
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  listLoadingEl.hidden = true;

  if (error) {
    listControlsEl.hidden = true;
    listEmptyEl.textContent = "一覧の読み込みに失敗しました: " + error.message;
    listEmptyEl.hidden = false;
    return;
  }

  allMovies = data || [];

  if (allMovies.length === 0) {
    listControlsEl.hidden = true;
    listEmptyEl.textContent =
      "まだ映画が登録されていません。「＋ 映画を登録」から追加できます。";
    listEmptyEl.hidden = false;
    return;
  }

  listControlsEl.hidden = false;
  renderGenreFilter();
  renderList();
}

// -------------------------------------------------------------
// 上部のジャンル絞り込みボタンを作る
// -------------------------------------------------------------
function renderGenreFilter() {
  // ジャンルごとの本数を数える
  const counts = {};
  allMovies.forEach(function (movie) {
    const genres = Array.isArray(movie.genres) ? movie.genres : [];
    if (genres.length === 0) {
      counts[NO_GENRE_LABEL] = (counts[NO_GENRE_LABEL] || 0) + 1;
    } else {
      genres.forEach(function (name) {
        counts[name] = (counts[name] || 0) + 1;
      });
    }
  });

  // 本数の多い順に並べる（「ジャンル未設定」は最後）
  const genreNames = Object.keys(counts)
    .filter(function (name) {
      return name !== NO_GENRE_LABEL;
    })
    .sort(function (a, b) {
      return counts[b] - counts[a] || a.localeCompare(b, "ja");
    });
  if (counts[NO_GENRE_LABEL]) genreNames.push(NO_GENRE_LABEL);

  // 選択中のジャンルが無くなっていたら「すべて」に戻す
  if (currentGenre !== "すべて" && !counts[currentGenre]) {
    currentGenre = "すべて";
  }

  const chips = [{ name: "すべて", count: allMovies.length }];
  genreNames.forEach(function (name) {
    chips.push({ name: name, count: counts[name] });
  });

  genreFilterEl.innerHTML = chips
    .map(function (chip) {
      const activeClass = chip.name === currentGenre ? " is-active" : "";
      return (
        "<button type='button' class='genre-chip-btn" +
        activeClass +
        "' data-genre='" +
        escapeHtml(chip.name) +
        "'>" +
        escapeHtml(chip.name) +
        " <span class='chip-count'>" +
        chip.count +
        "</span></button>"
      );
    })
    .join("");

  Array.from(genreFilterEl.querySelectorAll(".genre-chip-btn")).forEach(
    function (button) {
      button.addEventListener("click", function () {
        currentGenre = button.dataset.genre;
        renderGenreFilter(); // 選択中の見た目を更新
        renderList();
      });
    }
  );
}

// -------------------------------------------------------------
// 中身（映画カード）を表示する
// -------------------------------------------------------------
function renderList() {
  const query = titleQuery.trim().toLowerCase();

  // タイトルでの絞り込み
  let movies = allMovies;
  if (query) {
    movies = movies.filter(function (movie) {
      return String(movie.title).toLowerCase().indexOf(query) !== -1;
    });
  }

  if (movies.length === 0) {
    movieSectionsEl.innerHTML = "";
    listEmptyEl.textContent = "条件に合う映画がありません。";
    listEmptyEl.hidden = false;
    return;
  }
  listEmptyEl.hidden = true;

  if (currentGenre === "すべて") {
    renderAllGenres(movies);
  } else {
    renderSingleGenre(movies, currentGenre);
  }

  attachCardClicks();
}

// 表示済みのカードに「クリックで詳細を開く」動作をつける
function attachCardClicks() {
  Array.from(movieSectionsEl.querySelectorAll(".movie-card")).forEach(
    function (cardEl) {
      cardEl.addEventListener("click", function () {
        const id = Number(cardEl.dataset.id);
        const movie = allMovies.find(function (m) {
          return m.id === id;
        });
        // openDetail は js/detail.js にあります
        if (movie && typeof openDetail === "function") {
          openDetail(movie);
        }
      });
    }
  );
}

// 一覧の表示だけを作り直す（データ取得はしない）
function refreshListDisplay() {
  if (allMovies.length === 0) {
    listControlsEl.hidden = true;
    movieSectionsEl.innerHTML = "";
    listEmptyEl.textContent =
      "まだ映画が登録されていません。「＋ 映画を登録」から追加できます。";
    listEmptyEl.hidden = false;
    return;
  }
  listControlsEl.hidden = false;
  renderGenreFilter();
  renderList();
}

// 一覧から1件取り除いて表示を更新する（削除時に使う）
function removeMovieFromList(id) {
  allMovies = allMovies.filter(function (m) {
    return m.id !== id;
  });
  refreshListDisplay();
}

// 「すべて」表示：ジャンルごとの帯（横スクロール）に分ける
function renderAllGenres(movies) {
  const groups = {};
  movies.forEach(function (movie) {
    const genres = Array.isArray(movie.genres) ? movie.genres : [];
    if (genres.length === 0) {
      if (!groups[NO_GENRE_LABEL]) groups[NO_GENRE_LABEL] = [];
      groups[NO_GENRE_LABEL].push(movie);
    } else {
      genres.forEach(function (name) {
        if (!groups[name]) groups[name] = [];
        groups[name].push(movie);
      });
    }
  });

  const names = Object.keys(groups)
    .filter(function (name) {
      return name !== NO_GENRE_LABEL;
    })
    .sort(function (a, b) {
      return groups[b].length - groups[a].length || a.localeCompare(b, "ja");
    });
  if (groups[NO_GENRE_LABEL]) names.push(NO_GENRE_LABEL);

  movieSectionsEl.innerHTML = names
    .map(function (name) {
      const cards = groups[name].map(movieCardHtml).join("");
      return (
        "<section class='genre-section'>" +
        "<h3 class='genre-section-title'>" +
        escapeHtml(name) +
        " <span class='genre-section-count'>" +
        groups[name].length +
        "</span></h3>" +
        "<div class='row-scroll'>" +
        cards +
        "</div>" +
        "</section>"
      );
    })
    .join("");
}

// ジャンルを1つ選んだとき：そのジャンルだけをグリッド表示
function renderSingleGenre(movies, genreName) {
  const list = movies.filter(function (movie) {
    return movieMatchesGenre(movie, genreName);
  });

  if (list.length === 0) {
    movieSectionsEl.innerHTML = "";
    listEmptyEl.textContent = "条件に合う映画がありません。";
    listEmptyEl.hidden = false;
    return;
  }

  const cards = list.map(movieCardHtml).join("");
  movieSectionsEl.innerHTML =
    "<section class='genre-section'>" +
    "<h3 class='genre-section-title'>" +
    escapeHtml(genreName) +
    " <span class='genre-section-count'>" +
    list.length +
    "</span></h3>" +
    "<div class='card-grid'>" +
    cards +
    "</div>" +
    "</section>";
}

// -------------------------------------------------------------
// タイトル絞り込みの入力
// -------------------------------------------------------------
listSearchEl.addEventListener("input", function () {
  titleQuery = listSearchEl.value;
  renderList();
});

// -------------------------------------------------------------
// ログイン直後・再読み込み時に一覧を表示する
// -------------------------------------------------------------
sb.auth.onAuthStateChange(function (event, session) {
  if (
    (event === "INITIAL_SESSION" || event === "SIGNED_IN") &&
    session &&
    session.user
  ) {
    showListView();
    loadMovies();
  }
});
