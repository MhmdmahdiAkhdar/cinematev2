document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("password-form");
  const message = document.getElementById("password-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      email: form.email.value,
      currentPassword: form.currentPassword.value,
      newPassword: form.newPassword.value,
    };

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      message.innerText = result.message;

    } catch (err) {
      console.error(err);
      message.innerText = "Error changing password.";
    }
  });
});
