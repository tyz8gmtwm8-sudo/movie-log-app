// TMDB（The Movie Database）API を呼び出す関数をまとめたファイルです。
// API = 外部のサービスに「この情報がほしい」とお願いして、結果を受け取る仕組み。

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// タイトルで映画を検索する。結果の配列を返す。
async function tmdbSearchMovies(query) {
  const url =
    `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}` +
    `&language=ja-JP&include_adult=false&query=${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("映画の検索に失敗しました（TMDB: " + res.status + "）");
  }
  const data = await res.json();
  return data.results || [];
}

// 映画IDを指定して、詳細情報（ジャンル・あらすじなど）を取得する。
async function tmdbGetMovie(id) {
  const url = `${TMDB_BASE}/movie/${id}?api_key=${TMDB_API_KEY}&language=ja-JP`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("映画情報の取得に失敗しました（TMDB: " + res.status + "）");
  }
  return await res.json();
}

// ポスター画像のURLを組み立てる。画像がない場合は空文字を返す。
// size 例: "w92"（小）, "w185", "w342"（中）
function tmdbPosterUrl(path, size) {
  if (!path) return "";
  return `${TMDB_IMAGE_BASE}/${size || "w342"}${path}`;
}
