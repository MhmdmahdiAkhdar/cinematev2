document.addEventListener("DOMContentLoaded", () => {
	const signupForm = document.getElementById("signup-form");
	const loginForm = document.getElementById("login-form");
	const loginBtn = document.querySelector(".login-btn");
	
	if (loginBtn) {
		loginBtn.addEventListener("click", () => {
			if (window.location.pathname.includes("login")) {
				window.location.href = "/signup";
			} else if (window.location.pathname.includes("signup")) {
				window.location.href = "/login";
			}
		});
	}
	
	if (signupForm) {
		signupForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const data = Object.fromEntries(new FormData(signupForm));
			const btn = signupForm.querySelector("button");
			btn.disabled = true;
			btn.textContent = "Creating account...";
			
			try {
				const res = await fetch("/api/auth/signup", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});
				
				const result = await res.json();
				if (result.success) {
					alert("Signup successful! Redirecting...");
					window.location.href = "/dashboard";
				} else {
					alert(result.message || "Signup failed");
				}
			} catch (err) {
				console.error("Signup error:", err);
			} finally {
				btn.disabled = false;
				btn.textContent = "Sign Up";
			}
		});
	}
	
	if (loginForm) {
		loginForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const data = Object.fromEntries(new FormData(loginForm));
			const btn = loginForm.querySelector("button");
			btn.disabled = true;
			btn.textContent = "Logging in...";
			
			try {
				const res = await fetch("/api/auth/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify(data),
				});
				
				const result = await res.json();
				if (result.success) {
					alert("Login successful! Redirecting...");
					window.location.href = "/dashboard";
				} else {
					alert(result.message || "Login failed");
				}
			} catch (err) {
				console.error("Login error:", err);
			} finally {
				btn.disabled = false;
				btn.textContent = "Login";
			}
		});
	}
});
