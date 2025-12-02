// client-side submit for student form
const form = document.getElementById("form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      number: document.getElementById("number").value,
      name: document.getElementById("name").value,
      date: document.getElementById("date").value,
      type: document.querySelector('input[name="type"]:checked').value,
      homeroom: document.getElementById("homeroom").value,
      t1: document.getElementById("t1").value,
      t2: document.getElementById("t2").value,
      t3: document.getElementById("t3").value,
      t4: document.getElementById("t4").value,
      message: document.getElementById("message").value
    };

    try {
      const res = await fetch("/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      document.getElementById("msg").innerText = data.message;
      form.reset();
    } catch (err) {
      document.getElementById("msg").innerText = "送信に失敗しました";
    }
  });
}
