// 映画の詳細表示・編集・削除の処理をまとめたファイルです。
// showDetailView / showListView / refreshListDisplay / removeMovieFromList /
// showListMessage は js/movies.js、escapeHtml は js/util.js にあります。

// TMDB の標準的なジャンル名（日本語）。編集時のチェックボックスに使います。
const TMDB_GENRE_NAMES_JA = [
  "アクション",
  "アドベンチャー",
  "アニメーション",
  "コメディ",
  "犯罪",
  "ドキュメンタリー",
  "ドラマ",
  "ファミリー",
  "ファンタジー",
  "歴史",
  "ホラー",
  "音楽",
  "ミステリー",
  "ロマンス",
  "サイエンスフィクション",
  "TVムービー",
  "スリラー",
  "戦争",
  "西部劇",
];

// -------------------------------------------------------------
// 画面の部品
// -------------------------------------------------------------
const detailMessageEl = document.getElementById("detail-message");
const detailRead = document.getElementById("detail-read");
const detailEditForm = document.getElementById("detail-edit-form");

const detailBackButton = document.getElementById("detail-back");
const detailEditButton = document.getElementById("detail-edit");
const detailDeleteButton = document.getElementById("detail-delete");
const editCancelButton = document.getElementById("edit-cancel");

const detailPoster = document.getElementById("detail-poster");
const detailTitle = document.getElementById("detail-title");
const detailStarFill = document.getElementById("detail-star-fill");
const detailRatingNum = document.getElementById("detail-rating-num");
const detailGenres = document.getElementById("detail-genres");
const detailMeta = document.getElementById("detail-meta");
const detailOverview = document.getElementById("detail-overview");
const detailSpoilerNote = document.getElementById("detail-spoiler-note");
const detailReview = document.getElementById("detail-review");

const snsToggleButton = document.getElementById("sns-toggle");
const snsPanel = document.getElementById("sns-panel");
const snsIncludeReview = document.getElementById("sns-include-review");
const snsText = document.getElementById("sns-text");
const snsCount = document.getElementById("sns-count");
const snsCopyButton = document.getElementById("sns-copy");

const editPoster = document.getElementById("edit-poster");
const editTitle = document.getElementById("edit-title");
const editRating = document.getElementById("edit-rating");
const editRatingValue = document.getElementById("edit-rating-value");
const editStarFill = document.getElementById("edit-star-fill");
const editGenreList = document.getElementById("edit-genre-list");
const editReview = document.getElementById("edit-review");
const editSpoiler = document.getElementById("edit-spoiler");
const editWatched = document.getElementById("edit-watched");
const editMethod = document.getElementById("edit-method");

// いま詳細を開いている映画（js/movies.js の allMovies 内のオブジェクトへの参照）
let currentMovie = null;

// -------------------------------------------------------------
// メッセージ表示
// -------------------------------------------------------------
function showDetailMessage(text, type) {
  detailMessageEl.textContent = text;
  detailMessageEl.className = "message " + (type || "");
  detailMessageEl.hidden = false;
}

function clearDetailMessage() {
  detailMessageEl.textContent = "";
  detailMessageEl.hidden = true;
}

// -------------------------------------------------------------
// 詳細を開く（一覧のカードクリックから呼ばれる）
// -------------------------------------------------------------
function openDetail(movie) {
  currentMovie = movie;
  snsPanel.hidden = true; // 前の映画の投稿文が残らないように閉じる
  renderDetailRead(movie);
  detailEditForm.hidden = true;
  detailRead.hidden = false;
  clearDetailMessage();
  showDetailView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 読み取り表示を作る
function renderDetailRead(movie) {
  if (movie.poster_url) {
    detailPoster.src = movie.poster_url;
    detailPoster.hidden = false;
  } else {
    detailPoster.removeAttribute("src");
    detailPoster.hidden = true;
  }

  const year = movie.release_year ? movie.release_year : "----";
  detailTitle.textContent = movie.title + "（" + year + "）";

  const rating = Number(movie.rating) || 0;
  detailStarFill.style.width = (rating / 5) * 100 + "%";
  detailRatingNum.textContent = rating.toFixed(1);

  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  if (genres.length > 0) {
    detailGenres.innerHTML = genres
      .map(function (name) {
        return "<span class='card-genre'>" + escapeHtml(name) + "</span>";
      })
      .join("");
  } else {
    detailGenres.innerHTML =
      "<span class='detail-muted'>ジャンル未設定</span>";
  }

  const metaParts = [];
  if (movie.watched_on) metaParts.push("鑑賞日: " + movie.watched_on);
  if (movie.watch_method) metaParts.push(movie.watch_method);
  detailMeta.textContent = metaParts.join("　・　");

  detailOverview.textContent = movie.overview || "あらすじ情報はありません。";

  if (movie.review) {
    detailReview.textContent = movie.review;
    if (movie.has_spoiler) {
      detailReview.classList.add("is-spoiler");
      detailSpoilerNote.hidden = false;
    } else {
      detailReview.classList.remove("is-spoiler");
      detailSpoilerNote.hidden = true;
    }
  } else {
    detailReview.textContent = "（感想の記録はありません）";
    detailReview.classList.remove("is-spoiler");
    detailSpoilerNote.hidden = true;
  }

  // SNS 投稿文パネルが開いていれば、新しい内容で作り直す
  if (!snsPanel.hidden) {
    regenerateSnsText();
  }
}

// -------------------------------------------------------------
// SNS 投稿文の生成
// -------------------------------------------------------------

// 評価から「★★★★☆」の文字列を作る（0.5 は数値で補うので切り捨て表示）
function buildStarString(rating) {
  const filled = Math.floor(rating);
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

// ハッシュタグ用に、区切り記号などを取り除く
function toHashtag(text) {
  const cleaned = String(text).replace(
    /[\s　・:：!！?？.,、。/｜|()（）\[\]"'’＆&]/g,
    ""
  );
  return cleaned ? "#" + cleaned : "";
}

// 投稿文の本文を組み立てる
function buildSnsText(movie, includeReview) {
  const year = movie.release_year ? "（" + movie.release_year + "）" : "";
  const rating = Number(movie.rating) || 0;

  const lines = [];
  lines.push("🎬『" + movie.title + "』" + year + "を見ました");
  lines.push(
    "評価：" + buildStarString(rating) + " " + rating.toFixed(1) + " / 5.0"
  );

  // 鑑賞情報の行
  let watchLine = "";
  if (movie.watch_method && movie.watched_on) {
    watchLine = movie.watch_method + "で鑑賞（" + movie.watched_on + "）";
  } else if (movie.watch_method) {
    watchLine = movie.watch_method + "で鑑賞";
  } else if (movie.watched_on) {
    watchLine = "鑑賞日：" + movie.watched_on;
  }
  if (watchLine) lines.push(watchLine);

  // 感想（含める場合のみ）
  if (includeReview && movie.review) {
    lines.push("");
    if (movie.has_spoiler) lines.push("⚠️ネタバレ注意");
    lines.push(movie.review);
  }

  // ハッシュタグ
  const tags = ["#映画記録", toHashtag(movie.title)];
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  genres.forEach(function (name) {
    const tag = toHashtag(name);
    if (tag) tags.push(tag);
  });
  lines.push("");
  lines.push(tags.filter(Boolean).join(" "));

  return lines.join("\n");
}

// テキスト欄と文字数表示を更新する
function regenerateSnsText() {
  if (!currentMovie) return;
  snsText.value = buildSnsText(currentMovie, snsIncludeReview.checked);

  const length = snsText.value.length;
  snsCount.textContent =
    "文字数: " + length + "（X: 280以内 / Instagram: 2200以内）";
  snsCount.classList.toggle("over", length > 280);
}

// 「SNS投稿文を作る」ボタン → パネルの開閉
snsToggleButton.addEventListener("click", function () {
  if (snsPanel.hidden) {
    // 開くとき：ネタバレ作品なら最初は感想を含めない
    snsIncludeReview.checked = !currentMovie.has_spoiler;
    snsPanel.hidden = false;
    regenerateSnsText();
  } else {
    snsPanel.hidden = true;
  }
});

// 「感想を含める」チェックの切り替え
snsIncludeReview.addEventListener("change", regenerateSnsText);

// 「コピー」ボタン
snsCopyButton.addEventListener("click", async function () {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(snsText.value);
    } else {
      snsText.removeAttribute("readonly");
      snsText.select();
      document.execCommand("copy");
      snsText.setAttribute("readonly", "");
    }
    showDetailMessage("投稿文をコピーしました。", "success");
  } catch (e) {
    showDetailMessage(
      "コピーできませんでした。テキストを選択して手動でコピーしてください。",
      "error"
    );
  }
});

// ぼかした感想をクリックしたら表示する
detailReview.addEventListener("click", function () {
  detailReview.classList.remove("is-spoiler");
  detailSpoilerNote.hidden = true;
});

// -------------------------------------------------------------
// 一覧に戻る
// -------------------------------------------------------------
detailBackButton.addEventListener("click", function () {
  showListView();
});

// -------------------------------------------------------------
// 編集モードに切り替え
// -------------------------------------------------------------
detailEditButton.addEventListener("click", function () {
  fillEditForm(currentMovie);
  clearDetailMessage();
  detailRead.hidden = true;
  detailEditForm.hidden = false;
});

editCancelButton.addEventListener("click", function () {
  detailEditForm.hidden = true;
  detailRead.hidden = false;
});

// 星の見た目を更新
function updateEditStars() {
  const value = parseFloat(editRating.value);
  editRatingValue.textContent = value.toFixed(1);
  editStarFill.style.width = (value / 5) * 100 + "%";
}

editRating.addEventListener("input", updateEditStars);

// 編集フォームに現在の値を入れる
function fillEditForm(movie) {
  if (movie.poster_url) {
    editPoster.src = movie.poster_url;
    editPoster.hidden = false;
  } else {
    editPoster.removeAttribute("src");
    editPoster.hidden = true;
  }

  const year = movie.release_year ? movie.release_year : "----";
  editTitle.textContent = movie.title + "（" + year + "）";

  editRating.value = String(movie.rating || 3);
  updateEditStars();

  // ジャンル：標準リスト＋この映画だけが持つ独自ジャンルをチェックボックス表示
  const current = Array.isArray(movie.genres) ? movie.genres : [];
  const names = TMDB_GENRE_NAMES_JA.slice();
  current.forEach(function (name) {
    if (names.indexOf(name) === -1) names.push(name);
  });
  editGenreList.innerHTML = names
    .map(function (name) {
      const checked = current.indexOf(name) !== -1 ? " checked" : "";
      return (
        "<label class='genre-chip'><input type='checkbox' value='" +
        escapeHtml(name) +
        "'" +
        checked +
        "> " +
        escapeHtml(name) +
        "</label>"
      );
    })
    .join("");

  editReview.value = movie.review || "";
  editSpoiler.checked = !!movie.has_spoiler;
  editWatched.value = movie.watched_on || "";
  editMethod.value = movie.watch_method || "";
}

// -------------------------------------------------------------
// 保存（Supabase の該当行を更新）
// -------------------------------------------------------------
detailEditForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearDetailMessage();
  if (!currentMovie) return;

  const selectedGenres = Array.from(
    editGenreList.querySelectorAll("input[type=checkbox]:checked")
  ).map(function (checkbox) {
    return checkbox.value;
  });

  const patch = {
    genres: selectedGenres,
    rating: parseFloat(editRating.value),
    review: editReview.value.trim() || null,
    has_spoiler: editSpoiler.checked,
    watched_on: editWatched.value || null,
    watch_method: editMethod.value || null,
  };

  const saveButton = detailEditForm.querySelector("button[type=submit]");
  saveButton.disabled = true;

  const { error } = await sb
    .from("movies")
    .update(patch)
    .eq("id", currentMovie.id);

  saveButton.disabled = false;

  if (error) {
    showDetailMessage("保存に失敗しました: " + error.message, "error");
    return;
  }

  // 手元のデータも更新して、読み取り表示と一覧に反映
  Object.assign(currentMovie, patch);
  renderDetailRead(currentMovie);
  detailEditForm.hidden = true;
  detailRead.hidden = false;
  showDetailMessage("更新しました。", "success");
  refreshListDisplay();
});

// -------------------------------------------------------------
// 削除
// -------------------------------------------------------------
detailDeleteButton.addEventListener("click", async function () {
  if (!currentMovie) return;

  const ok = window.confirm(
    "「" + currentMovie.title + "」を削除します。よろしいですか？"
  );
  if (!ok) return;

  detailDeleteButton.disabled = true;

  const { error } = await sb
    .from("movies")
    .delete()
    .eq("id", currentMovie.id);

  detailDeleteButton.disabled = false;

  if (error) {
    showDetailMessage("削除に失敗しました: " + error.message, "error");
    return;
  }

  const deletedTitle = currentMovie.title;
  const deletedId = currentMovie.id;
  currentMovie = null;

  removeMovieFromList(deletedId);
  showListView();
  showListMessage("「" + deletedTitle + "」を削除しました。");
});
