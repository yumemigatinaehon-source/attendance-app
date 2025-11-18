// -------------------------
// Cookie読み込み
// -------------------------
window.onload = () => {
    const name = getCookie("studentName");
    const id = getCookie("studentId");

    if (name) document.getElementById("studentName")?.value = name;
    if (id) document.getElementById("studentId")?.value = id;
};

// -------------------------
// Cookie取得
// -------------------------
function getCookie(key) {
    const match = document.cookie.match(new RegExp(key + "=([^;]+)"));
    return match ? match[1] : "";
}

// -------------------------
// Cookie保存(30日)
// -------------------------
function setCookie(key, value) {
    const days = 30;
    const expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
    document.cookie = `${key}=${value}; expires=${expires}; path=/`;
}

// -------------------------
// 生徒フォーム送信
// -------------------------
document.getElementById("attendanceForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const studentId = document.getElementById("studentId").value.trim();

    if (!name || !studentId) {
        alert("名前と学籍番号を入力してください");
        return;
    }

    // Cookie保存
    setCookie("studentName", name);
    setCookie("studentId", studentId);

    const payload = { name, studentId };

    try {
        const res = await fetch("/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        document.getElementById("resultMsg").innerText = data.message;

    } catch (err) {
        document.getElementById("resultMsg").innerText = "送信エラー。時間をおいて再試行してください";
        console.error(err);
    }
});
