document.addEventListener('DOMContentLoaded', () => {
	const root = document.documentElement;
	const body = document.body;
	const themeToggle = document.getElementById('theme-toggle');
	const themeInput = document.getElementById('themeInput');
	
	const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
	themeInput.value = savedTheme;
	
	if (savedTheme === 'dark') {
		root.classList.add('dark-theme');
		body.classList.add('dark-theme');
		if (themeToggle) themeToggle.checked = true;
	}
	
	if (themeToggle) {
		themeToggle.addEventListener('change', () => {
			const isDark = themeToggle.checked;
			if (isDark) {
				root.classList.add('dark-theme');
				body.classList.add('dark-theme');
				localStorage.setItem('theme', 'dark');
				themeInput.value = 'dark';
			} else {
				root.classList.remove('dark-theme');
				body.classList.remove('dark-theme');
				localStorage.setItem('theme', 'light');
				themeInput.value = 'light';
			}
		});
	}
});
