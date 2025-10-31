// checking if user is logged in
const currentUser = sessionStorage.getItem('currentUser');
if (!currentUser) {
    sessionStorage.setItem('loginMessage', 'Please log in to access the game!');
    window.location.href = '../html/landing_page.html'; 
}
