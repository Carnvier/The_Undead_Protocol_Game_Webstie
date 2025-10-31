// Leaderboard Display Logic

// Initialize leaderboard on page load
window.addEventListener('load', () => {
    displayLeaderboard();
});

// Fetch and display top 10 players from localStorage
function displayLeaderboard() {
    const leaderboardBody = document.getElementById('leaderboardBody');

    // Retrieve leaderboard data from localStorage
    let leaderboard = localStorage.getItem('leaderboard');
    leaderboard = leaderboard ? JSON.parse(leaderboard) : [];

    // Sort entries by score in descending order
    leaderboard.sort((a, b) => b.score - a.score);

    // Limit to top 10 entries
    leaderboard = leaderboard.slice(0, 10);

    // Clear existing table rows
    leaderboardBody.innerHTML = '';

    // Populate leaderboard table
    if (leaderboard.length === 0) {
        // Display message if no scores exist
        leaderboardBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 30px;">No scores yet. Be the first to play!</td></tr>';
    } else {
        // Create row for each leaderboard entry
        leaderboard.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.username || 'Anonymous'}</td>
                <td>${entry.score || 0}</td>
                <td>${entry.wave || 1}</td>
                <td>${entry.kills || 0}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    }
}
