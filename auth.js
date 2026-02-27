
const USERS_KEY = 'app_users';
const CURRENT_USER_KEY = 'app_current_user';

function getUsers() {
    const usersJSON = localStorage.getItem(USERS_KEY);
    return usersJSON ? JSON.parse(usersJSON) : [];
}

export function signup(username, email, password) {
    const users = getUsers();

    const userExists = users.find(user => user.email === email);
    if (userExists) {
        return { success: false, message: 'Email already registered.' };
    }

    const newUser = { username, email, password };
   
    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    return { success: true, message: 'Signup successful!' };
}

export function login(email, password) {
    const users = getUsers();
    
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {

        const sessionUser = { username: user.username, email: user.email };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));
        return { success: true, message: 'Login successful!' };
    }

    return { success: false, message: 'Invalid email or password.' };
}

export function getCurrentUser() {
    const userJSON = localStorage.getItem(CURRENT_USER_KEY);
    return userJSON ? JSON.parse(userJSON) : null;
}

export function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
}
