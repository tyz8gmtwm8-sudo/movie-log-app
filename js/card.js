// レビューカード画像を Canvas（キャンバス）に描く処理をまとめたファイルです。
// Canvas = ブラウザ上に絵を描ける部品。ここに描いた内容を PNG 画像として保存できます。

// 日本語が出るフォント指定
const CARD_FONT = '"Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif';

// 画像を読み込む（読み込めなければ null を返す）
// crossOrigin を指定すると、他サイトの画像でも「汚染」されず PNG 保存できます
// （TMDB の画像サーバーは許可を返すため、通常はこれで保存できます）
function loadImageForCard(src) {
  return new Promise(function (resolve) {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      resolve(null);
    };
    img.src = src;
  });
}

// 角丸の四角形のパスを作る
function cardRoundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 画像を「切れてもいいので枠いっぱいに」描く（中央寄せ）
function drawImageCover(ctx, img, x, y, w, h) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// 長い文字列を、指定幅で折り返して行の配列にする（日本語は1文字ずつ判定）
function wrapCardText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  Array.from(String(text)).forEach(function (ch) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      return;
    }
    const test = line + ch;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

// -------------------------------------------------------------
// メイン：映画1本のレビューカードを canvas に描く
// options = { size: "square" | "story" }
// -------------------------------------------------------------
async function renderReviewCard(movie, options, canvas) {
  const isStory = options.size === "story";
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // 背景（上から下へのグラデーション）
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#20283a");
  gradient.addColorStop(1, "#12161f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;

  // サイズごとのレイアウト寸法（ポスター・タイトル・星を大きめに）
  const L = isStory
    ? {
        top: 170,
        posterW: 720,
        gapAfterPoster: 76,
        titleSize: 66,
        titleLH: 82,
        gapAfterTitle: 14,
        starSize: 64,
        gapAfterStar: 68,
        genreSize: 36,
      }
    : {
        top: 64,
        posterW: 460,
        gapAfterPoster: 44,
        titleSize: 56,
        titleLH: 68,
        gapAfterTitle: 10,
        starSize: 58,
        gapAfterStar: 60,
        genreSize: 30,
      };

  // フッターの位置と、本文が入ってよい下限
  const footerBrandY = height - (isStory ? 44 : 40);
  const footerInfoY = footerBrandY - (isStory ? 44 : 38);
  const contentBottom = footerInfoY - 24;

  let y = L.top;

  // ポスター（大きめのサイズに差し替えて読み込み）
  const posterSrc = movie.poster_url
    ? movie.poster_url.replace(/\/w\d+\//, "/w780/")
    : "";
  const posterImg = await loadImageForCard(posterSrc);

  const posterW = L.posterW;
  const posterH = posterW * 1.5;
  const posterX = centerX - posterW / 2;

  cardRoundRectPath(ctx, posterX, y, posterW, posterH, 24);
  ctx.save();
  ctx.clip();
  if (posterImg) {
    drawImageCover(ctx, posterImg, posterX, y, posterW, posterH);
  } else {
    ctx.fillStyle = "#33405a";
    ctx.fillRect(posterX, y, posterW, posterH);
    ctx.fillStyle = "#8b97ad";
    ctx.textAlign = "center";
    ctx.font = "36px " + CARD_FONT;
    ctx.fillText("NO IMAGE", centerX, y + posterH / 2);
  }
  ctx.restore();

  y += posterH + L.gapAfterPoster;

  // タイトル（＋公開年）。長ければ2行まで
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold " + L.titleSize + "px " + CARD_FONT;
  const yearText = movie.release_year ? "（" + movie.release_year + "）" : "";
  const titleLines = wrapCardText(
    ctx,
    movie.title + yearText,
    width - 160
  ).slice(0, 2);
  titleLines.forEach(function (ln) {
    ctx.fillText(ln, centerX, y);
    y += L.titleLH;
  });
  y += L.gapAfterTitle;

  // 星評価
  const rating = Number(movie.rating) || 0;
  const filled = Math.floor(rating);
  const stars = "★".repeat(filled) + "☆".repeat(5 - filled);
  ctx.font = L.starSize + "px " + CARD_FONT;
  ctx.fillStyle = "#f5b301";
  ctx.fillText(stars + "  " + rating.toFixed(1), centerX, y);
  y += L.gapAfterStar;

  // ジャンル（フッターに重ならない場合のみ）
  const genres = Array.isArray(movie.genres) ? movie.genres : [];
  if (genres.length > 0 && y <= contentBottom) {
    ctx.font = L.genreSize + "px " + CARD_FONT;
    ctx.fillStyle = "#aab3c5";
    ctx.fillText(genres.join(" / "), centerX, y);
  }

  // フッター（鑑賞情報＋アプリ名）
  ctx.font = "28px " + CARD_FONT;
  ctx.fillStyle = "#7b869c";
  const footParts = [];
  if (movie.watch_method) footParts.push(movie.watch_method);
  if (movie.watched_on) footParts.push(movie.watched_on);
  if (footParts.length > 0) {
    ctx.fillText(footParts.join("　・　"), centerX, footerInfoY);
  }
  ctx.fillText("🎬 movie-log-app", centerX, footerBrandY);
}

// -------------------------------------------------------------
// canvas の内容を PNG 画像としてダウンロードする
// -------------------------------------------------------------
function downloadCanvas(canvas, filename) {
  // canvas が「汚染」されていると toBlob が例外を投げる
  canvas.toBlob(function (blob) {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }, "image/png");
}
