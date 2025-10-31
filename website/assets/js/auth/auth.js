// import functions from other modules 
import { getLoginFormValues, checkUserCredentials } from './login.js';
import { getSignupFormValues, checkPassword, saveUserInfo } from './signup.js';


// checking if user playing the game is logged in
const message = sessionStorage.getItem('loginMessage');
if (message) {
    let popUp = document.getElementById('popUp');
    popUp.innerText = message
    popUp.style.display = 'block'
    setTimeout(() => {
        popUp.style.display = 'none'
    }, 4000)
    sessionStorage.removeItem('loginMessage');
}

// Show login form by default
window.onload = function() {
    showLoginForm();
};

function showSignupForm() {
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
}

function showLoginForm() {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

// Handle Form Displayed 
const loginToggle = document.getElementById('loginToggle')
const signupToggle = document.getElementById('signupToggle')

loginToggle.addEventListener('click', showLoginForm)
signupToggle.addEventListener('click', showSignupForm)

// Error Message Display Elements
const loginFormMessage = document.getElementById('loginFormMessage')
const signupFormMessage = document.getElementById('signupFormMessage')

function showMessage(messageElement, messages) {
    messageElement.innerHTML = ''; // Clear previous messages
    for(let i = 0; i < messages.length; i++) {
        const element = messages[i];   
        messageElement.innerHTML += '<li>' + element + '</li>';
    }
}

// Login For Submission and Authentication
const loginButton = document.getElementById('loginButton') 

loginButton.addEventListener('click', function(event){
    event.preventDefault();
    const { username, password } = getLoginFormValues();
    const userObject = checkUserCredentials(username, password);
    if (userObject) {
        console.log("Login successful");
        sessionStorage.setItem(username, JSON.stringify(userObject));
        window.location.href = "lobby.html";
    } else {
        console.log("Invalid credentials");
        showMessage(loginFormMessage, ['Invalid username or password. Please try again.']);

        // Clear the input fields
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
    }
});

// Signup Form Submission and User Registration
const signupButton = document.getElementById('signupButton')

signupButton.addEventListener('click', function(event){
    event.preventDefault();
    const { username, firstName, lastName, email, password, confirmPassword } = getSignupFormValues();

    // Validate passwords
    let passkeyErrorMessages = checkPassword(password, confirmPassword)
    if (passkeyErrorMessages.length > 0){
        showMessage(signupFormMessage, passkeyErrorMessages);
        password.value = ''
        confirmPassword.value = ''
        return; 
    }

    const userObject = checkUserCredentials(username, password.value);
    if (userObject) {
        console.log("User already exists");
        showMessage(signupFormMessage, ['User already exists. Please try a different username.']);
        return;
    }

    // Save user info if validations pass and user does not exist
    userObject =  saveUserInfo(username, firstName, lastName, email, password.value);
 

});


// Logout Functionality


