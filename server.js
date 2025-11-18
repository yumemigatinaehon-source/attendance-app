// ===============================================
// server.js  —  Attendance App (DBなしCSV保存版)
// ===============================================

import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------------------------
// パスの設定
// -----------------------------------------------
const __dirname = path.resolve();
const DATA_DIR = path.join(__dirname, "data");
const TEACHERS_FILE = path.join(DATA_DIR, "teachers.json");
const ATTENDANCE_LOG = path.join(DATA_DIR, "attendance.csv");

// 初期ファイルがなければ作る
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(TEACHERS_FILE)) fs.writeFileSync(TEACHERS_FILE, "[]", "utf8");
if (!fs.existsSync(ATTENDANCE_LOG)) {
    fs.writeFileSync(ATTENDANCE_LOG, "日時,学籍番号,名前,先生\n", "utf8");
}

// -----------------------------------------------
// Express設定
// -----------------------------------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// -----------------------------------------------
// メール送信用トランスポート
// -----------------------------------------------
const transporter = nodemailer.createTransport({
    service: "gmail", // Gmail前提（renderでもOK）
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

// -----------------------------------------------
// 生徒向けトップ (名前 + 学籍番号入力)
// -----------------------------------------------
app.get("/", (req, res) => {
    res.render("index");
});

// 生徒が送信した
app.post("/submit", (req, res) => {
    const { studentName, studentId, teacher } = req.body;

    const time = new Date();
    const timestamp = time.toLocaleString("ja-JP");

    // CSV追記
    const line = `${timestamp},${studentId},${studentName},${teacher}\n`;
    fs.appendFileSync(ATTENDANCE_LOG, line, "utf8");

    // メール送信（全教師に送る）
    const teachers = JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf8"));

    teachers.forEach((t) => {
        const mailOptions = {
            from: process.env.MAIL_USER,
            to: t.email,
            subject: "出席連絡",
            text: `【出席連絡】\n\n日時: ${timestamp}\n学籍番号: ${studentId}\n名前: ${studentName}\n宛先: ${teacher}`
        };

        transporter.sendMail(mailOptions).catch(err => console.log("メール送信エラー:", err));
    });

    res.send(`
        <html>
        <body style="font-size:20px;text-align:center;padding-top:40px;">
            <p>送信しました！</p>
            <a href="/">戻る</a>
        </body>
        </html>
    `);
});

// -----------------------------------------------
// 教師ログイン
// -----------------------------------------------
app.get("/teacher", (req, res) => {
    res.render("teacher_login");
});

app.post("/teacher", (req, res) => {
    const { password } = req.body;
    if (password === process.env.TEACHER_PASS) {
        res.redirect("/teacher/dashboard");
    } else {
        res.send("パスワードが違います");
    }
});

// -----------------------------------------------
// 教師トップ
// -----------------------------------------------
app.get("/teacher/dashboard", (req, res) => {
    const teachers = JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf8"));
    res.render("teacher_dashboard", { teachers });
});

// -----------------------------------------------
// 教師追加
// -----------------------------------------------
app.get("/teacher/add", (req, res) => {
    res.render("teacher_add");
});

app.post("/teacher/add", (req, res) => {
    const { name, email } = req.body;

    const data = JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf8"));
    data.push({ name, email });

    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(data, null, 2), "utf8");

    res.redirect("/teacher/dashboard");
});

// -----------------------------------------------
// 教師編集
// -----------------------------------------------
app.get("/teacher/edit/:name", (req, res) => {
    const name = req.params.name;
    const teachers = JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf8"));
    const teacher = teachers.find(t => t.name === name);
    res.render("teacher_edit", { teacher });
});

app.post("/teacher/edit/:name", (req, res) => {
    const name = req.params.name;
    const { email } = req.body;

    const teachers = JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf8"));
    const t = teachers.find(x => x.name === name);
    if (t) t.email = email;

    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), "utf8");
    res.redirect("/teacher/dashboard");
});

// -----------------------------------------------
// 教師削除
// -----------------------------------------------
app.get("/teacher/delete/:name", (req, res) => {
    const name = req.params.name;
    res.render("teacher_delete", { name });
});

app.post("/teacher/delete/:name", (req, res) => {
    const name = req.params.name;

    let teachers = JSON.parse(fs.readFileSync(TEACHERS_FILE, "utf8"));
    teachers = teachers.filter(t => t.name !== name);

    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(teachers, null, 2), "utf8");

    res.redirect("/teacher/dashboard");
});

// -----------------------------------------------
// サーバー起動
// -----------------------------------------------
app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
