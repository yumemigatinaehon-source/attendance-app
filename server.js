const express = require("express");
const bcrypt = require("bcrypt");
const session = require("express-session");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
    session({
        secret: "secret_key",
        resave: false,
        saveUninitialized: false,
    })
);

// ========================
// JSON 読み書き
// ========================

const TEACHERS_FILE = path.join(__dirname, "teachers.json");

function loadTeachers() {
    if (!fs.existsSync(TEACHERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TEACHERS_FILE));
}

function saveTeachers(data) {
    fs.writeFileSync(TEACHERS_FILE, JSON.stringify(data, null, 2));
}

// ========================
// ログイン保護
// ========================

function requireLogin(req, res, next) {
    if (!req.session.teacher) {
        return res.redirect("/teacher/login");
    }
    next();
}

// ========================
// ルーティング
// ========================

// ログイン画面
app.get("/teacher/login", (req, res) => {
    res.render("teacher_login", { error: null });
});

// ログイン処理
app.post("/teacher/login", async (req, res) => {
    const { login_id, password } = req.body;

    const teachers = loadTeachers();
    const teacher = teachers.find((t) => t.login_id === login_id);

    if (!teacher) {
        return res.render("teacher_login", { error: "ID またはパスワードが違います" });
    }

    const ok = await bcrypt.compare(password, teacher.password);
    if (!ok) {
        return res.render("teacher_login", { error: "ID またはパスワードが違います" });
    }

    req.session.teacher = teacher;
    res.redirect("/teacher/dashboard");
});

// ダッシュボード
app.get("/teacher/dashboard", requireLogin, (req, res) => {
    const teachers = loadTeachers();
    res.render("teacher_dashboard", {
        teacher: req.session.teacher,
        teachers,
    });
});

// 教師追加画面
app.get("/teacher/add", requireLogin, (req, res) => {
    res.render("teacher_add", { error: null });
});

// 教師追加処理
app.post("/teacher/add", async (req, res) => {
    const { login_id, name, password } = req.body;

    const teachers = loadTeachers();
    if (teachers.find((t) => t.login_id === login_id)) {
        return res.render("teacher_add", { error: "この ID はすでに存在します" });
    }

    const hashed = await bcrypt.hash(password, 10);

    teachers.push({
        id: Date.now(),
        login_id,
        name,
        password: hashed,
    });

    saveTeachers(teachers);

    res.redirect("/teacher/dashboard");
});

// ログアウト
app.get("/teacher/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/teacher/login");
    });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
