// Supabase とやり取りするための「クライアント」を1か所で作り、
// 他のファイル（auth.js / register.js など）から共通で使えるようにします。
//
// window.supabase は、index.html で読み込んだ supabase-js ライブラリが用意します。
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
