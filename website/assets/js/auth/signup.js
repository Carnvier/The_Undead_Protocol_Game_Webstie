// get the user info from the signup form
export function getSignupFormValues(){
    const username = document.getElementById('username').value
    const firstName = document.getElementById('firstName').value
    const lastName = document.getElementById('lastName').value
    const email = document.getElementById('email').value
    const password = document.getElementById('password')
    const confirmPassword = document.getElementById('confirmPassword')
    return { username, firstName, lastName, email, password, confirmPassword };    
}


export function checkPassword(password, confirmPassword) {
    const passkeyErrorMessages = []

    //check if both passwords are the same
    if (password.value != confirmPassword.value){
        passkeyErrorMessages.push('Passwords do not match. Please try again')
        password.value = ''
        confirmPassword.value = ''
    }

    //check if length less than 8
    if (password.value.length < 8){
        passkeyErrorMessages.push('Password should be more than 8 characters.')
    }

    //check if length greater than 20
    if (password.value.length > 20){
        passkeyErrorMessages.push('Password should not be more than 20 characters.')
    }

    //check for uppercase 
    if (!/[A-Z]/.test(password.value)){
        passkeyErrorMessages.push('Password should contain at least one uppercase letter.')
    }

    //check for numbers
    if (!/[0-9]/.test(password.value)){
        passkeyErrorMessages.push('Password should contain at least one number.')
    }

    //check for special expressions
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password.value)){
        passkeyErrorMessages.push('Password should contain at least one special character. Limited to !@#$%^&*(),.?":{}|<>')
    }

    // check for regular expressions
    if (/[\s]/.test(password.value)){
        passkeyErrorMessages.push('Password should not contain spaces.')
    }
    
    // check for common passwords
    const commonPasswords = ['password', '123456', '123456789', '12345678', '12345', '1234567', 'qwerty', 'abc123', 'password1', 'iloveyou'];
    if (commonPasswords.includes(password.value)){
        passkeyErrorMessages.push('Password is too common. Please choose a more secure password.')
    }


    // check if either fields are empty
    if (password.value.length === 0 || confirmPassword.value.length === 0){
        passkeyErrorMessages.push('Password and Confirm Password cannot be empty.')
    }

    return passkeyErrorMessages
    
}

// Save user info to Local Storage
export function saveUserInfo(usernameInput, firstNameInput, lastNameInput, emailInput, passwordInput){
    const user = {
        username: usernameInput,
        firstName: firstNameInput,
        lastName: lastNameInput,
        email: emailInput,
        password: passwordInput,
        xp: 0,
        level: 1,
        Cash: 100,
        inventory: [],  
        achievements: []
    }

    // Storing the user object in Local Storage
    try {
    localStorage.setItem(usernameInput, JSON.stringify(user));
    console.log(`User data stored under key: ${usernameInput}`);
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    window.location.href = "lobby.html";

    } catch (error) {
    console.error('Error saving to Local Storage', error);
}
return
    
}