# Attendance App

欠席・遅刻連絡システム（Render + GitHub）

## 機能

- 生徒ページ
  - 名前・学籍番号入力
  - 欠席 or 遅刻選択
  - 日付・各時限の担当教師選択
  - メッセージ入力
  - CSVに自動保存
  - 教師に自動メール送信

- 教師ページ（パスワード保護）
  - 教師の追加・削除
  - 教師メールアドレス変更
  - 欠席・遅刻者の一覧表示
  - CSVダウンロード

## 環境変数（.env）

```env
MAIL_API_KEY=xxxx
TEACHER_PASSWORD=xxxx
