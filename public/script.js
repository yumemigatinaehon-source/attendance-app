document.getElementById("form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
        name: document.getElementById("name").value,
        studentId: document.getElementById("studentId").value,
        date: document.getElementById("date").value,
        status: document.getElementById("status").value,
        teacher: document.getElementById("teacher").value,
        class1: document.getElementById("class1").value,
        class2: document.getElementById("class2").value,
        class3: document.getElementById("class3").value,
        class4: document.getElementById("class4").value,
        reason: document.getElementById("reason").value
    };

    const res = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    document.getElementById("msg").innerText = data.message;
});
