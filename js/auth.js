// ログイン・新規登録・ログアウトの処理をまとめたファイルです。

// Supabase の「クライアント」を作成します。
// クライアント = Supabase とやり取りするための窓口オブジェクト。
// window.supabase は、index.html で読み込んだ supabase-js ライブラリが用意します。
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// -------------------------------------------------------------
// 画面の部品を取得（HTML の id と対応）
// -------------------------------------------------------------
const authSection = document.getElementById("auth-section");
const appSection = document.getElementById("app-section");
const appBarRight = document.getElementById("app-bar-right");
const userEmailLabel = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const messageBox = document.getElementById("message-box");

const showSignupLink = document.getElementById("show-signup");
const showLoginLink = document.getElementById("show-login");
const loginBox = document.getElementById("login-box");
const signupBox = document.getElementById("signup-box");

// -------------------------------------------------------------
// 画面にメッセージを表示する関数
// type: "error"（赤） か "success"（緑）
// -------------------------------------------------------------
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = "message " + (type || "");
  messageBox.hidden = false;
}

function clearMessage() {
  messageBox.textContent = "";
  messageBox.hidden = true;
}

// -------------------------------------------------------------
// ログイン状態に応じて画面を切り替える関数
// session がある = ログイン済み
// -------------------------------------------------------------
function updateView(session) {
  if (session && session.user) {
    authSection.hidden = true;
    appSection.hidden = false;
    appBarRight.hidden = false;
    userEmailLabel.textContent = session.user.email;
  } else {
    authSection.hidden = false;
    appSection.hidden = true;
    appBarRight.hidden = true;
    userEmailLabel.textContent = "";
  }
}

// -------------------------------------------------------------
// ログイン／新規登録フォームの表示切り替え
// -------------------------------------------------------------
showSignupLink.addEventListener("click", function (event) {
  event.preventDefault();
  clearMessage();
  loginBox.hidden = true;
  signupBox.hidden = false;
});

showLoginLink.addEventListener("click", function (event) {
  event.preventDefault();
  clearMessage();
  signupBox.hidden = true;
  loginBox.hidden = false;
});

// -------------------------------------------------------------
// 新規登録
// -------------------------------------------------------------
signupForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearMessage();

  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (password.length < 6) {
    showMessage("パスワードは6文字以上にしてください。", "error");
    return;
  }

  // Supabase に新規登録をお願いする
  const { data, error } = await sb.auth.signUp({
    email: email,
    password: password,
  });

  if (error) {
    showMessage("登録に失敗しました: " + error.message, "error");
    return;
  }

  // メール確認オフの設定なので、通常はこの時点でログイン状態になります
  if (data.session) {
    showMessage("登録しました。ログインします。", "success");
  } else {
    showMessage(
      "登録しました。ログイン画面からログインしてください。",
      "success"
    );
    signupBox.hidden = true;
    loginBox.hidden = false;
  }
});

// -------------------------------------------------------------
// ログイン
// -------------------------------------------------------------
loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  clearMessage();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  const { error } = await sb.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    showMessage("ログインに失敗しました: " + error.message, "error");
    return;
  }
  // 成功時は onAuthStateChange（下）が画面を切り替えます
});

// -------------------------------------------------------------
// ログアウト
// -------------------------------------------------------------
logoutButton.addEventListener("click", async function () {
  await sb.auth.signOut();
});

// -------------------------------------------------------------
// 起動時とログイン状態が変わったときの処理
// -------------------------------------------------------------
async function init() {
  const { data } = await sb.auth.getSession();
  updateView(data.session);
}

sb.auth.onAuthStateChange(function (_event, session) {
  clearMessage();
  updateView(session);
});

init();
