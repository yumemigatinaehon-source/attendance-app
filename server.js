import express from "express";
import fs from "fs";
import path from "path";
import session from "express-session";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import dayjs from "dayjs";

dotenv.config();
const app = express();
const __dirname = path.resolve();

// paths
const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
const TEACHER_FILE = path.join(DATA_DIR, "teachers.json");
const NOTICE_FILE = path.join(DATA_DIR, "notices.json");

// ensure files exist
if (!fs.existsSync(TEACHER_FILE)) fs.writeFileSync(TEACHER_FILE, "[]", "utf8");
if (!fs.existsSync(NOTICE_FILE)) fs.writeFileSync(NOTICE_FILE, "[]", "utf8");

// middleware
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

// helpers
function loadTeachers() {
  return JSON.parse(fs.readFileSync(TEACHER_FILE, "utf8"));
}
function saveTeachers(arr) {
  fs.writeFileSync(TEACHER_FILE, JSON.stringify(arr, null, 2), "utf8");
}
function loadNotices() {
  return JSON.parse(fs.readFileSync(NOTICE_FILE, "utf8"));
}
function saveNotices(arr) {
  fs.writeFileSync(NOTICE_FILE, JSON.stringify(arr, null, 2), "utf8");
}

// remove past notices (date < today)
// date values expected as 'YYYY-MM-DD'
function removePastNotices() {
  const notices = loadNotices();
  const today = dayjs().format("YYYY-MM-DD");
  const filtered = notices.filter(n => n.date >= today);
  if (filtered.length !== notices.length) saveNotices(filtered);
  return filtered;
}

// CSV escaping
function csvEscape(field) {
  if (field === null || field === undefined) return '""';
  const s = String(field).replace(/"/g, '""');
  return `"${s}"`;
}

// require login middleware
function requireLogin(req, res, next) {
  if (!req.session.teacher) return res.redirect("/teacher/login");
  next();
}

// ------------------ routes ------------------

// student page
app.get("/", (req, res) => {
  const teachers = loadTeachers();
  res.render("index", { teachers });
});

// submit notice (student)
app.post("/submit", (req, res) => {
  const { number, name, date, type, homeroom, t1, t2, t3, t4, message } = req.body;

  // basic validation
  if (!name || !date || !type) {
    return res.status(400).json({ message: "名前・日付・区分は必須です" });
  }

  // Ensure notices file exists
  const notices = loadNotices();

  const entry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    number: String(number || "").trim(),
    name: String(name).trim(),
    date: String(date),           // expect YYYY-MM-DD
    type: String(type),
    homeroom: homeroom || "不明",
    t1: t1 || "不明",
    t2: t2 || "不明",
    t3: t3 || "不明",
    t4: t4 || "不明",
    message: (message || "").replace(/\r?\n/g, " ")
  };

  notices.push(entry);
  saveNotices(notices);

  res.json({ message: "送信しました！" });
});

// teacher login
app.get("/teacher/login", (req, res) => {
  res.render("teacher_login", { error: null });
});
app.post("/teacher/login", (req, res) => {
  const { password } = req.body;
  const expected = process.env.TEACHER_PASSWORD || "teachers2025";
  if (password === expected) {
    req.session.teacher = true;
    res.redirect("/teacher/dashboard");
  } else {
    res.render("teacher_login", { error: "パスワードが違います" });
  }
});

// teacher logout
app.get("/teacher/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/teacher/login"));
});

// dashboard - show cards (clean past first)
app.get("/teacher/dashboard", requireLogin, (req, res) => {
  // remove past notices
  const notices = removePastNotices();

  // sort by date ascending then time
  notices.sort((a, b) => {
    if (a.date === b.date) return a.timestamp.localeCompare(b.timestamp);
    return a.date.localeCompare(b.date);
  });

  const teachers = loadTeachers();
  res.render("teacher_dashboard", { teachers, notices });
});

// add teacher
app.get("/teacher/add", requireLogin, (req, res) => res.render("teacher_add", { error: null }));
app.post("/teacher/add", requireLogin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.render("teacher_add", { error: "名前を入力してください" });
  const teachers = loadTeachers();
  if (teachers.find(t => t.name === name)) return res.render("teacher_add", { error: "既に存在します" });
  teachers.push({ id: Date.now(), name });
  saveTeachers(teachers);
  res.redirect("/teacher/dashboard");
});

// delete teacher (confirmation page)
app.get("/teacher/delete/:id", requireLogin, (req, res) => {
  const teachers = loadTeachers();
  const teacher = teachers.find(t => t.id == req.params.id);
  if (!teacher) return res.redirect("/teacher/dashboard");
  res.render("teacher_delete", { teacher });
});
app.post("/teacher/delete/:id", requireLogin, (req, res) => {
  let teachers = loadTeachers();
  teachers = teachers.filter(t => t.id != req.params.id);
  saveTeachers(teachers);
  res.redirect("/teacher/dashboard");
});

// CSV plain-text page (requires login)
app.get("/teacher/attendance.csv", requireLogin, (req, res) => {
  // keep only future/today
  const notices = removePastNotices();
  // header
  const header = [
    "timestamp",
    "number",
    "name",
    "date",
    "type",
    "homeroom",
    "t1",
    "t2",
    "t3",
    "t4",
    "message"
  ];
  let csv = header.join(",") + "\n";
  for (const n of notices) {
    const row = [
      n.timestamp,
      n.number,
      n.name,
      n.date,
      n.type,
      n.homeroom,
      n.t1,
      n.t2,
      n.t3,
      n.t4,
      n.message
    ].map(csvEscape).join(",");
    csv += row + "\n";
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.send(csv);
});

// Serve teacher dashboard simple index redirect
app.get("/teacher", (req, res) => res.redirect("/teacher/dashboard"));

// start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // also clean at startup
  removePastNotices();
  console.log(`Server running o
