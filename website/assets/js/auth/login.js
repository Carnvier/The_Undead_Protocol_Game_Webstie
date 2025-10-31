// get the user info from the login form
export function getLoginFormValues(){
   const username = document.getElementById('loginUsername').value
   const password = document.getElementById('loginPassword').value
   console.log(username, password)
    return { username, password };
}

// Check user credentials against Local Storage
export function checkUserCredentials(usernameInput, passwordInput){
    console.log("Checking credentials for:", usernameInput);
    const storedUser = localStorage.getItem(usernameInput);
    console.log(JSON.parse(storedUser));
   if (storedUser) {
       const userObject = JSON.parse(storedUser);
   
   
        if (userObject.password === passwordInput) {
                sessionStorage.setItem('currentUser', JSON.stringify(userObject))
                return userObject;
            }
    }
   return false;

}

// Get user details
export function getSessionDetails(){
    let userObject = sessionStorage.getItem('currentUser')
    console.log(userObject)
    if (userObject){
        const user = JSON.parse(userObject)
        return user
    }
    else {
        return false
    }
}