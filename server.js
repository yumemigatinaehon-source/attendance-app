const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// ====== データファイル ======
const TEACHER_FILE = path.join(__dirname, "data/teachers.json");
const ATTEND_FILE = path.join(__dirname, "data/attendance.csv");

// 出席CSVがない場合ヘッダー追加
if (!fs.existsSync(ATTEND_FILE)) {
    fs.writeFileSync(ATTEND_FILE,
        "timestamp,studentId,name,date,status,teacher,class1,class2,class3,class4,reason\n"
    );
}

// ====== ルート ======

// 生徒フォーム
app.get("/", (req, res) => {
    const teachers = JSON.parse(fs.readFileSync(TEACHER_FILE, "utf8"));

    res.render("index", {
        teachers: teachers
    });
});

// 出席送信
app.post("/submit", (req, res) => {
    const data = req.body;

    const row = [
        new Date().toISOString(),
        data.studentId,
        data.name,
        data.date,
        data.status,
        data.teacher,
        data.class1,
        data.class2,
        data.class3,
        data.class4,
        JSON.stringify(data.reason || "")
    ].join(",") + "\n";

    fs.appendFileSync(ATTEND_FILE, row);

    res.json({ message: "出席情報を送信しました！" });
});

// ====== 教師管理画面 ======

app.get("/teacher", (req, res) => {
    res.render("teacher_login");
});

app.post("/teacher/login", (req, res) => {
    const { email } = req.body;
    const teachers = JSON.parse(fs.readFileSync(TEACHER_FILE));

    const t = teachers.find(x => x.email === email);

    if (!t) return res.render("teacher_login", { error: "メールが違います" });

    res.redirect("/teacher/dashboard");
});

app.get("/teacher/dashboard", (req, res) => {
    const teachers = JSON.parse(fs.readFileSync(TEACHER_FILE));
    res.render("teacher_dashboard", { teachers });
});

// 教師追加
app.get("/teacher/add", (req, res) => res.render("teacher_add"));

app.post("/teacher/add", (req, res) => {
    const { name, email } = req.body;
    const teachers = JSON.parse(fs.readFileSync(TEACHER_FILE));

    teachers.push({ name, email });
    fs.writeFileSync(TEACHER_FILE, JSON.stringify(teachers, null, 2));

    res.redirect("/teacher/dashboard");
});

// メール変更
app.get("/teacher/edit", (req, res) => res.render("teacher_edit"));

app.post("/teacher/edit", (req, res) => {
    const { oldEmail, newEmail } = req.body;
    const teachers = JSON.parse(fs.readFileSync(TEACHER_FILE));

    const t = teachers.find(x => x.email === oldEmail);
    if (t) t.email = newEmail;

    fs.writeFileSync(TEACHER_FILE, JSON.stringify(teachers, null, 2));
    res.redirect("/teacher/dashboard");
});

// 教師削除
app.get("/teacher/delete", (req, res) => res.render("teacher_delete"));

app.post("/teacher/delete", (req, res) => {
    const { email } = req.body;
    let teachers = JSON.parse(fs.readFileSync(TEACHER_FILE));

    teachers = teachers.filter(t => t.email !== email);

    fs.writeFileSync(TEACHER_FILE, JSON.stringify(teachers, null, 2));
    res.redirect("/teacher/dashboard");
});

// ====== サーバ起動 ======
app.listen(PORT, () => console.log("Server running on " + PORT));
