document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = document.querySelector('input[name="type"]:checked').value;

  const payload = {
    name: document.getElementById("name").value,
    date: document.getElementById("date").value,
    type,
    homeroom: document.getElementById("homeroom").value,
    t1: document.getElementById("t1").value,
    t2: document.getElementById("t2").value,
    t3: document.getElementById("t3").value,
    t4: document.getElementById("t4").value,
    message: document.getElementById("message").value
  };

  const res = await fetch("/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  document.getElementById("msg").innerText = data.message;
});
