import { getCurrentUser, logout } from '../auth.js';

// Verify user session; redirect to login if no active user is found
const currentUser = getCurrentUser();

if (!currentUser) {
    alert("You must log in first to access the home page.");
    window.location.href = '../login.html';
} else {
    document.getElementById('app').style.display = 'block';
    document.getElementById('displayUsername').textContent = currentUser.username;
    document.getElementById('displayEmail').textContent = currentUser.email;

    document.getElementById('logoutBtn').addEventListener('click', () => {
        logout();
        window.location.href = '../login.html';
    });
}

// Initialize global variables for application data and retrieve saved cart
const CART_KEY = 'app_cart';
let products = [];
let cart = loadCartFromStorage(); // Restore cart data from previous sessions

// Cache DOM node references for performance
const productsContainer = document.getElementById('productsContainer');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutStatus = document.getElementById('checkoutStatus');

// Bootstrap the application by fetching initial data and rendering the UI
async function init() {
    try {
        // Fetch product list from the remote API endpoint
        const response = await fetch("https://api.escuelajs.co/api/v1/products/?categoryId=1&limit=25&offset=0");
        products = await response.json();
        document.getElementById('loadingProducts').style.display = 'none';
        renderProducts(products);
        updateCartUI(); // Render the cart loaded from storage
    } catch (error) {
        document.getElementById('loadingProducts').textContent = 'Failed to load products.';
        console.error('Error fetching products:', error);
    }
}

function getCleanImage(imageInput) {
    const fallback = 'https://tse1.mm.bing.net/th/id/OIP.Y9Keo9JVZtot43AUNQBhTAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';
    if (!imageInput || imageInput.length === 0) return fallback;

    const stringifiedInput = typeof imageInput === 'string' ? imageInput : JSON.stringify(imageInput);
    
    // Extract the first valid image URL using a regular expression
    const match = stringifiedInput.match(/https?:\/\/[^"'\s\]\[,]+/);

    if (match) {
        const url = match[0];
        
        if (url.includes('placeimg.com')) {
            return fallback;
        }
        return url;
    }

    return fallback;
}

// Functions handling the reading and writing of cart data to local storage
function loadCartFromStorage() {
    const cartJSON = localStorage.getItem(CART_KEY);
    return cartJSON ? JSON.parse(cartJSON) : [];
}

function saveCartToStorage() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// Functions responsible for building and updating the DOM
function renderProducts(itemsToRender) {
    productsContainer.innerHTML = '';
    if (itemsToRender.length === 0) {
        productsContainer.innerHTML = '<p>No products found in this price range.</p>';
        return;
    }
    
    itemsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const imageUrl = getCleanImage(product.images);
        const fallbackUrl = 'https://tse1.mm.bing.net/th/id/OIP.Y9Keo9JVZtot43AUNQBhTAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';

        // Build the HTML structure for each product, including fallback image handling
        card.innerHTML = `
            <img src="${imageUrl}" alt="${product.title}" referrerpolicy="no-referrer" crossorigin="anonymous" onerror="this.onerror=null; this.src='${fallbackUrl}'">
            <h4>${product.title}</h4>
            <p>$${product.price}</p>
            <button data-id="${product.id}" class="add-to-cart-btn">Add to Cart</button>
        `;
        productsContainer.appendChild(card);
    });
}

function updateCartUI() {
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="color: #1f6153;">Cart is empty.</p>';
        cartTotalEl.textContent = '$0.00';
        checkoutBtn.disabled = true; // Prevent checkout when there are no items
        return;
    }

    let total = 0;

    cart.forEach(item => {
        total += item.price * item.quantity;
        
        const cartItemEl = document.createElement('div');
        cartItemEl.className = 'cart-item';
        cartItemEl.innerHTML = `
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                $${item.price}
            </div>
            <div class="cart-item-controls">
                <span>${item.quantity}</span>
                <button class="btn-decrease" data-id="${item.id}">-</button>
                <button class="btn-increase" data-id="${item.id}">+</button>
                <button class="btn-remove" data-id="${item.id}">x</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemEl);
    });

    cartTotalEl.textContent = `$${total.toFixed(2)}`;
    checkoutBtn.disabled = false; // Allow checkout when items are present
}

// Core business logic for cart manipulation (adding, updating, removing)
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.title,
            price: product.price,
            quantity: 1
        });
    }
    saveCartToStorage();
    updateCartUI();
}

function handleCartAction(productId, action) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;

    switch (action) {
        case 'increase':
            cart[itemIndex].quantity++;
            break;
        case 'decrease':
            cart[itemIndex].quantity--;
            if (cart[itemIndex].quantity === 0) {
                cart.splice(itemIndex, 1);
            }
            break;
        case 'remove':
            cart.splice(itemIndex, 1);
            break;
    }
    saveCartToStorage();
    updateCartUI();
}

// Bind user interactions to their respective handler functions

productsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        addToCart(id);
    }
});

cartItemsContainer.addEventListener('click', (e) => {
    const id = parseInt(e.target.getAttribute('data-id'));
    if (!id) return;

    if (e.target.classList.contains('btn-increase')) handleCartAction(id, 'increase');
    if (e.target.classList.contains('btn-decrease')) handleCartAction(id, 'decrease');
    if (e.target.classList.contains('btn-remove')) handleCartAction(id, 'remove');
});

document.getElementById('applyFilterBtn').addEventListener('click', () => {
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;
    
    const filtered = products.filter(p => p.price >= minPrice && p.price <= maxPrice);
    renderProducts(filtered);
});

document.getElementById('resetFilterBtn').addEventListener('click', () => {
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    renderProducts(products);
});

// Manage the checkout flow, payload creation, and simulated API request
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Show loading indicators while processing
    checkoutBtn.disabled = true;
    checkoutStatus.style.display = 'block';
    checkoutStatus.className = 'status-message status-loading';
    checkoutStatus.textContent = 'Processing checkout...';

    // Mock an asynchronous network request with a timeout
    setTimeout(() => {
        try {
            // Construct the order details object
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const payload = {
                user: {
                    email: currentUser.email,
                    username: currentUser.username
                },
                items: [...cart],
                totalPrice: total,
                date: new Date().toISOString()
            };

            // Append the new order to the existing orders in local storage
            const orders = JSON.parse(localStorage.getItem('app_orders') || '[]');
            orders.push(payload);
            localStorage.setItem('app_orders', JSON.stringify(orders));

            // Update interface to reflect a successful transaction
            checkoutStatus.className = 'status-message status-success';
            checkoutStatus.textContent = 'Order placed successfully!';
            
            // Clear local cart array
            cart = [];
            saveCartToStorage(); // Overwrite local storage cart with empty state
            updateCartUI(); // Refresh cart display
        } catch (error) {
            // Show failure message on error
            console.error("Checkout Error:", error);
            checkoutStatus.className = 'status-message status-error';
            checkoutStatus.textContent = 'Checkout failed. Please try again.';
        } finally {
            checkoutBtn.disabled = false;
            // Automatically dismiss the notification toast
            setTimeout(() => { checkoutStatus.style.display = 'none'; }, 4000);
        }
    }, 2000); // Delay duration
});

// Execute the main initialization function
init();