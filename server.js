import express from "express";
import fs from "fs";
import path from "path";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const __dirname = path.resolve();

// ------------------- ミドルウェア -------------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")));

app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  })
);

// ------------------- データ -------------------
const TEACHER_FILE = "./data/teachers.json";
const CSV_FILE = "./data/attendance.csv";

function loadTeachers() {
  if (!fs.existsSync(TEACHER_FILE)) fs.writeFileSync(TEACHER_FILE, "[]");
  return JSON.parse(fs.readFileSync(TEACHER_FILE, "utf8"));
}

function saveTeachers(data) {
  fs.writeFileSync(TEACHER_FILE, JSON.stringify(data, null, 2));
}

function appendCSV(line) {
  if (!fs.existsSync(CSV_FILE)) fs.writeFileSync(CSV_FILE, "");
  fs.appendFileSync(CSV_FILE, line + "\n");
}

// ------------------- 生徒ページ -------------------
app.get("/", (req, res) => {
  const teachers = loadTeachers();
  res.render("index", { teachers });
});

app.post("/submit", (req, res) => {
  const { name, date, type, homeroom, t1, t2, t3, t4, message } = req.body;

  const line = [
    new Date().toISOString(),
    name,
    date,
    type,
    homeroom,
    t1,
    t2,
    t3,
    t4,
    message.replace(/\n/g, " ")
  ].join(",");

  appendCSV(line);
  res.json({ message: "送信しました！" });
});

// ------------------- 教師ログイン -------------------
app.get("/teacher/login", (req, res) => res.render("teacher_login", { error: null }));

app.post("/teacher/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.TEACHER_PASSWORD) {
    req.session.teacher = true;
    res.redirect("/teacher/dashboard");
  } else {
    res.render("teacher_login", { error: "パスワードが違います" });
  }
});

function requireLogin(req, res, next) {
  if (!req.session.teacher) return res.redirect("/teacher/login");
  next();
}

// ------------------- 教師ダッシュボード -------------------
app.get("/teacher/dashboard", requireLogin, (req, res) => {
  const teachers = loadTeachers();
  let csvData = [];
  if (fs.existsSync(CSV_FILE)) {
    const lines = fs.readFileSync(CSV_FILE, "utf8").split("\n").filter(l => l);
    csvData = lines.map(line => {
      const [timestamp, name, date, type, homeroom, t1, t2, t3, t4, message] = line.split(",");
      return { timestamp, name, date, type, homeroom, t1, t2, t3, t4, message };
    });
  }
  res.render("teacher_dashboard", { teachers, csvData });
});

// 教師追加
app.get("/teacher/add", requireLogin, (req, res) => res.render("teacher_add", { error: null }));
app.post("/teacher/add", requireLogin, (req, res) => {
  const { name } = req.body;
  const teachers = loadTeachers();
  if (teachers.find(t => t.name === name)) return res.render("teacher_add", { error: "既に存在します" });
  teachers.push({ id: Date.now(), name });
  saveTeachers(teachers);
  res.redirect("/teacher/dashboard");
});

// 教師削除
app.get("/teacher/delete/:id", requireLogin, (req, res) => {
  let teachers = loadTeachers();
  teachers = teachers.filter(t => t.id != req.params.id);
  saveTeachers(teachers);
  res.redirect("/teacher/dashboard");
});

// ------------------- サーバー -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
