import { getCurrentUser, logout } from '../auth.js';

// --- Authentication Check ---
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

// --- State Management ---
let products = [];
let cart = []; // Cart array containing: { id, name, price, quantity }

// --- DOM Elements ---
const productsContainer = document.getElementById('productsContainer');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartTotalEl = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const checkoutStatus = document.getElementById('checkoutStatus');

// --- Initialize App ---
async function init() {
    try {
        // Fetch min 25 products from Category 1 (Clothes)
        const response = await fetch("https://api.escuelajs.co/api/v1/products/?categoryId=1&limit=25&offset=0");
        products = await response.json();
        document.getElementById('loadingProducts').style.display = 'none';
        renderProducts(products);
    } catch (error) {
        document.getElementById('loadingProducts').textContent = 'Failed to load products.';
        console.error('Error fetching products:', error);
    }
}

function getCleanImage(imageInput) {
    const fallback = 'https://tse1.mm.bing.net/th/id/OIP.Y9Keo9JVZtot43AUNQBhTAHaHa?rs=1&pid=ImgDetMain&o=7&rm=3';
    if (!imageInput || imageInput.length === 0) return fallback;

    const stringifiedInput = typeof imageInput === 'string' ? imageInput : JSON.stringify(imageInput);
    
    // Tweak: Added a comma to the exclusion list so it stops if it hits a comma-separated list
    const match = stringifiedInput.match(/https?:\/\/[^"'\s\]\[,]+/);

    if (match) {
        const url = match[0];
        
        // Log the extracted URL to your console so you can test it yourself!
        console.log("Extracted URL from API:", url);

        if (url.includes('placeimg.com')) {
            return fallback;
        }
        return url;
    }

    return fallback;
}

// --- Render UI ---
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

        // Note: I also updated the onerror attribute to use the safe fallbackUrl. 
        // Previously, it used product.category.image, which is often just as broken as product.images.
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
        cartItemsContainer.innerHTML = '<p style="color: #7f8c8d;">Cart is empty.</p>';
        cartTotalEl.textContent = '$0.00';
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
                <button class="btn-decrease" data-id="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button class="btn-increase" data-id="${item.id}">+</button>
                <button class="btn-remove" data-id="${item.id}">x</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemEl);
    });

    cartTotalEl.textContent = `$${total.toFixed(2)}`;
}

// --- Event Listeners (Delegation) ---

// Add to Cart
productsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('add-to-cart-btn')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        const product = products.find(p => p.id === id);
        
        const existingItem = cart.find(item => item.id === id);
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
        updateCartUI();
    }
});

// Cart Operations (Increase, Decrease, Remove)
cartItemsContainer.addEventListener('click', (e) => {
    const id = parseInt(e.target.getAttribute('data-id'));
    if (!id) return;

    const itemIndex = cart.findIndex(item => item.id === id);
    if (itemIndex === -1) return;

    if (e.target.classList.contains('btn-increase')) {
        cart[itemIndex].quantity++;
    } else if (e.target.classList.contains('btn-decrease')) {
        cart[itemIndex].quantity--;
        if (cart[itemIndex].quantity === 0) {
            cart.splice(itemIndex, 1);
        }
    } else if (e.target.classList.contains('btn-remove')) {
        cart.splice(itemIndex, 1);
    }
    updateCartUI();
});

// Filter Products
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

// --- Checkout Process ---
checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // UI Loading State
    checkoutBtn.disabled = true;
    checkoutStatus.className = 'status-message status-loading';
    checkoutStatus.textContent = 'Processing checkout...';

    // Simulate API request delay
    setTimeout(() => {
        try {
            // Create Payload
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

            // Save to localStorage
            const orders = JSON.parse(localStorage.getItem('app_orders') || '[]');
            orders.push(payload);
            localStorage.setItem('app_orders', JSON.stringify(orders));

            // Success UI
            checkoutStatus.className = 'status-message status-success';
            checkoutStatus.textContent = 'Order placed successfully!';
            
            // Reset Cart state
            cart = [];
            updateCartUI();
        } catch (error) {
            // Error handling UI
            console.error("Checkout Error:", error);
            checkoutStatus.className = 'status-message status-error';
            checkoutStatus.textContent = 'Checkout failed. Please try again.';
        } finally {
            checkoutBtn.disabled = false;
            // Hide status message after 4 seconds
            setTimeout(() => { checkoutStatus.style.display = 'none'; }, 4000);
        }
    }, 2000); // 2 second mock wait time
});

// Boot up
init();