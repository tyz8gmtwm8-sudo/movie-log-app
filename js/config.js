// Supabase への接続情報をまとめたファイルです。
//
// ここに書く「anon（アノン）」キーは、もともとブラウザ（HTML）に
// 埋め込んで使う前提の「公開用」キーです。そのため GitHub に上げても
// 直ちに危険ではありません。データの保護は Supabase 側の RLS
// （ログイン本人のデータしか読み書きできない設定）で行っています。

const SUPABASE_URL = "https://baubslqnsfclpqdvacll.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdWJzbHFuc2ZjbHBxZHZhY2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNTM3NjAsImV4cCI6MjEwMzcyOTc2MH0.5WhtjXvt26F9VDre-W3H4CnVeIwH9aZ_4sV24kRypDk";
