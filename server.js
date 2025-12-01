// ===============================
// 出席システム（login_id方式 / パスワードなし）
// ===============================

import express from "express";
import fs from "fs";
import path from "path";
import session from "express-session";
import bodyParser from "body-parser";

const app = express();
const __dirname = path.resolve();

// -------------------------------
// 設定
// -------------------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
    session({
        secret: "secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 }
    })
);

// -------------------------------
// ユーティリティ
// -------------------------------
const TEACHER_FILE = "./data/teachers.json";
const CSV_FILE = "./data/attendance.csv";

function loadTeachers() {
    return JSON.parse(fs.readFileSync(TEACHER_FILE, "utf8"));
}

function saveTeachers(data) {
    fs.writeFileSync(TEACHER_FILE, JSON.stringify(data, null, 2));
}

function appendCSV(line) {
    fs.appendFileSync(CSV_FILE, line + "\n");
}

// -------------------------------
// 生徒ページ
// -------------------------------
app.get("/", (req, res) => {
    const teachers = loadTeachers();
    res.render("index", { teachers });
});

app.post("/submit", (req, res) => {
    const { name, studentId, date, status, reason, teacher } = req.body;

    const now = new Date().toISOString();

    const line = [
        now,
        studentId,
        name,
        date,
        status,
        reason.replace(/\n/g, " "),
        teacher
    ].join(",");

    appendCSV(line);

    res.json({ message: "送信しました！" });
});

// -------------------------------
// 教師ログイン（IDのみ）
// -------------------------------
app.get("/teacher/login", (req, res) => {
    res.render("teacher_login", { error: null });
});

app.post("/teacher/login", (req, res) => {
    const { login_id } = req.body;

    const teachers = loadTeachers();
    const teacher = teachers.find(t => t.login_id === login_id);

    if (!teacher) {
        return res.render("teacher_login", { error: "ログインIDが違います" });
    }

    req.session.teacher = teacher;
    res.redirect("/teacher/dashboard");
});

// -------------------------------
// ログイン制限
// -------------------------------
function requireLogin(req, res, next) {
    if (!req.session.teacher) return res.redirect("/teacher/login");
    next();
}

// -------------------------------
// ダッシュボード
// -------------------------------
app.get("/teacher/dashboard", requireLogin, (req, res) => {
    res.render("teacher_dashboard", { teacher: req.session.teacher });
});

// -------------------------------
// 教師追加
// -------------------------------
app.get("/teacher/add", requireLogin, (req, res) => {
    res.render("teacher_add", { error: null });
});

app.post("/teacher/add", requireLogin, (req, res) => {
    const { login_id, name } = req.body;

    const teachers = loadTeachers();

    if (teachers.find(t => t.login_id === login_id)) {
        return res.render("teacher_add", { error: "ログインIDが既に存在します" });
    }

    teachers.push({
        id: Date.now(),
        login_id,
        name
    });

    saveTeachers(teachers);

    res.redirect("/teacher/dashboard");
});

// -------------------------------
// 教師削除
// -------------------------------
app.get("/teacher/delete/:id", requireLogin, (req, res) => {
    const teachers = loadTeachers();
    const teacher = teachers.find(t => t.id == req.params.id);
    res.render("teacher_delete", { teacher });
});

app.post("/teacher/delete/:id", requireLogin, (req, res) => {
    let teachers = loadTeachers();
    teachers = teachers.filter(t => t.id != req.params.id);
    saveTeachers(teachers);

    res.redirect("/teacher/dashboard");
});

// -------------------------------
// サーバー起動
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
