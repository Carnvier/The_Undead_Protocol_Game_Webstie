import { getSessionDetails } from './auth/login.js';

// Check if user is logged in
const currentUser = sessionStorage.getItem('currentUser');
if (!currentUser) {
    sessionStorage.setItem('loginMessage', 'Please log in to access your profile!');
    window.location.href = '../html/landing_page.html';
}

// Get user details
const user = getSessionDetails();
const username = user['username'];

// Load user profile data
function loadProfileData() {
    // Display user info
    document.getElementById('profileUsername').textContent = username;
    document.getElementById('profileEmail').textContent = user['email'] || 'No email set';

    // Get leaderboard data to calculate statistics
    const leaderboardData = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    const userGames = leaderboardData.filter(game => game.username === username);

    if (userGames.length === 0) {
        // No games played yet
        document.getElementById('gamesPlayed').textContent = '0';
        document.getElementById('totalKills').textContent = '0';
        document.getElementById('highestScore').textContent = '0';
        document.getElementById('highestWave').textContent = '0';
        document.getElementById('averageAccuracy').textContent = '0%';
        document.getElementById('totalScore').textContent = '0';
        return;
    }

    // Calculate statistics
    const gamesPlayed = userGames.length;
    const totalKills = userGames.reduce((sum, game) => sum + (game.kills || 0), 0);
    const highestScore = Math.max(...userGames.map(game => game.score || 0));
    const highestWave = Math.max(...userGames.map(game => game.wave || 0));
    const totalScore = userGames.reduce((sum, game) => sum + (game.score || 0), 0);

    // Get personal best from localStorage
    const bestScoreKey = username + '_bestScore';
    const personalBest = localStorage.getItem(bestScoreKey) || highestScore;

    // Update stat cards
    document.getElementById('gamesPlayed').textContent = gamesPlayed;
    document.getElementById('totalKills').textContent = totalKills;
    document.getElementById('highestScore').textContent = personalBest;
    document.getElementById('highestWave').textContent = highestWave;
    document.getElementById('totalScore').textContent = totalScore;

    // Average accuracy (if stored in future)
    document.getElementById('averageAccuracy').textContent = 'N/A';

    // Display recent games (last 10)
    displayRecentGames(userGames);
}

// Display recent games in table
function displayRecentGames(userGames) {
    const tableBody = document.getElementById('recentGamesTable');
    tableBody.innerHTML = '';

    if (userGames.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No games played yet</td></tr>';
        return;
    }

    // Show last 10 games (most recent first)
    const recentGames = userGames.slice(-10).reverse();

    recentGames.forEach((game, index) => {
        const row = document.createElement('tr');

        // Create fake date (since we don't store timestamps yet)
        const date = new Date();
        date.setDate(date.getDate() - index);
        const dateStr = date.toLocaleDateString();

        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${game.score || 0}</td>
            <td>${game.wave || 0}</td>
            <td>${game.kills || 0}</td>
        `;

        tableBody.appendChild(row);
    });
}

// Clear statistics button
document.getElementById('clearStatsBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all your statistics? This action cannot be undone!')) {
        // Remove user entries from leaderboard
        const leaderboardData = JSON.parse(localStorage.getItem('leaderboard') || '[]');
        const filteredLeaderboard = leaderboardData.filter(game => game.username !== username);
        localStorage.setItem('leaderboard', JSON.stringify(filteredLeaderboard));

        // Clear personal best
        const bestScoreKey = username + '_bestScore';
        localStorage.removeItem(bestScoreKey);

        // Clear tutorial flag
        const tutorialKey = username + '_tutorialCompleted';
        localStorage.removeItem(tutorialKey);

        // Reload page to show updated stats
        alert('Statistics cleared successfully!');
        location.reload();
    }
});

// Delete account button
document.getElementById('deleteAccountBtn').addEventListener('click', () => {
    if (confirm('⚠️ WARNING: This will permanently delete your account and all data. Are you absolutely sure?')) {
        if (confirm('This is your FINAL warning. Type OK to confirm deletion.')) {
            // Remove user from localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const filteredUsers = users.filter(u => u.username !== username);
            localStorage.setItem('users', JSON.stringify(filteredUsers));

            // Remove user entries from leaderboard
            const leaderboardData = JSON.parse(localStorage.getItem('leaderboard') || '[]');
            const filteredLeaderboard = leaderboardData.filter(game => game.username !== username);
            localStorage.setItem('leaderboard', JSON.stringify(filteredLeaderboard));

            // Clear personal data
            const bestScoreKey = username + '_bestScore';
            localStorage.removeItem(bestScoreKey);
            const tutorialKey = username + '_tutorialCompleted';
            localStorage.removeItem(tutorialKey);

            // Clear session
            sessionStorage.clear();

            // Redirect to landing page
            alert('Account deleted successfully. You will be redirected to the login page.');
            window.location.href = '../html/landing_page.html';
        }
    }
});

// Load profile data on page load
loadProfileData();
