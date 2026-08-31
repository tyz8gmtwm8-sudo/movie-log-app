// いろいろな場所で使う「小さな便利関数」をまとめたファイルです。

// 文字列を HTML に埋め込むとき、記号（< > & "）をそのまま入れると
// レイアウトが崩れたり不具合の原因になります。
// この関数で無害な文字に置き換えてから埋め込みます。
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
