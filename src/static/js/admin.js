document.getElementById('make-admin-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userEmail = document.getElementById('userEmail-input').value.trim();
    const msg = document.getElementById('admin-msg');
    msg.textContent = '';
    msg.className = 'status-msg';

    try {
        const res = await fetch('/admin/make_admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userEmail }),
        });

        if (res.ok) {
            msg.textContent = `User "${userEmail}" has been promoted to an admin.`;
            msg.classList.add('success');
            document.getElementById('make-admin-form').reset();
            setTimeout(() => {
                msg.textContent = '';
                msg.className = 'status-msg';
            }, 3000);
        } else {
            const text = await res.text();
            msg.textContent = text || 'An error occurred.';
            msg.classList.add('error');
            console.error(text);
            setTimeout(() => {
                msg.textContent = '';
                msg.className = 'status-msg';
            }, 3000);
        }
    } catch (err) {
        msg.textContent = 'Network error.';
        msg.classList.add('error');
        console.error(err);
        setTimeout(() => {
            msg.textContent = '';
            msg.className = 'status-msg';
        }, 3000);
    }
});

document.getElementById('sync-btn').addEventListener('click', async () => {
    const msg = document.getElementById('sync-msg');
    const btn = document.getElementById('sync-btn');
    msg.textContent = '';
    msg.className = 'status-msg';
    btn.disabled = true;
    btn.textContent = 'Syncing...';

    try {
        const res = await fetch('/api/media/sync', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (res.ok && data.success) {
            msg.textContent = data.message || 'Data synced successfully.';
            msg.classList.add('success');
        } else {
            msg.textContent = data.message || 'Failed to sync data.';
            msg.classList.add('error');
        }
    } catch (err) {
        msg.textContent = 'Network error — could not reach server.';
        msg.classList.add('error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Retrieve Data';
    }
});
