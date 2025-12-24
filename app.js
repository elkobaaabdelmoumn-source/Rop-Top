/* ===========================================================
   TIENDA PROFESIONAL DE ZAPATOS - JS REFACTORIZADO
   Grid de 4 productos por fila, thumbnails funcionales, carrito y admin
   =========================================================== */

/* =========================
   DATOS BASE / LOCALSTORAGE
========================= */

let users = JSON.parse(localStorage.getItem("users")) || [
  { email: "admin@admin.com", code: "1234", active: true, super: true }
];

let products = JSON.parse(localStorage.getItem("products")) || [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let settings = JSON.parse(localStorage.getItem("settings")) || { 
  title: "Tienda Profesional de Zapatos", 
  mainColor: "#333", 
  bgColor: "#f4f4f4" 
};
let whatsappNumber = localStorage.getItem("whatsappNumber") || "34662218632";
let orders = JSON.parse(localStorage.getItem("orders")) || [];
let currentUser = null;

/* =========================
   FUNCIONES DE UTILIDAD
========================= */

function saveAll() {
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("products", JSON.stringify(products));
  localStorage.setItem("cart", JSON.stringify(cart));
  localStorage.setItem("settings", JSON.stringify(settings));
  localStorage.setItem("orders", JSON.stringify(orders));
  localStorage.setItem("whatsappNumber", whatsappNumber);
}

function finalPrice(p) {
  return p.price - (p.price * p.offer) / 100;
}

function updateCount() {
  document.getElementById("count").textContent = cart.reduce((a, b) => a + b.qty, 0);
}

function show(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");

  if (pageId === "shop") renderShop();
  if (pageId === "cart") renderCart();
  if (pageId === "admin") renderAdminLogin();
}

/* =========================
   RENDER TIENDA (GRID + THUMBS)
========================= */

function renderShop() {
  const shop = document.getElementById("shop");
  document.getElementById("title").textContent = settings.title;
  document.documentElement.style.setProperty("--main", settings.mainColor);
  document.documentElement.style.setProperty("--bg", settings.bgColor);
  shop.innerHTML = "";

  if(products.length === 0){
    shop.innerHTML = "<p style='text-align:center;'>No hay productos disponibles. Añade productos desde el panel admin.</p>";
    return;
  }

  products.forEach(p => {
    const sizeOptions = Object.entries(p.stock || {})
      .map(([size, qty]) => qty > 0 ? `<option value='${size}'>${size} (${qty})</option>` : `<option value='${size}' disabled>${size} (agotado)</option>`)
      .join('');

    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image">
        ${p.offer ? `<div class="label-offer">-${p.offer}%</div>` : ''}
        <img class="main-img" src="${p.images[0]}" alt="${p.name}">
        ${p.images.length > 1 ? `
          <div class="thumbs">
            ${p.images.map((img, idx) => `
              <img src="${img}" alt="thumb" onclick="this.closest('.product-card').querySelector('.main-img').src='${img}'">
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="product-info">
        <h3>${p.name}</h3>
        <p>$${finalPrice(p).toFixed(2)}</p>
        ${sizeOptions ? `<select id="size-${p.id}">${sizeOptions}</select>` : '<p>No hay stock</p>'}
        <input type="number" min="1" value="1" id="qty-${p.id}">
        <button onclick="addToCartWithSize(${p.id})">🛒 Añadir</button>
      </div>
    `;
    shop.appendChild(card);
  });

  updateCount();
}

/* =========================
   CARRITO
========================= */

function addToCartWithSize(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const sizeSelect = document.getElementById(`size-${id}`);
  const size = sizeSelect ? sizeSelect.value : null;
  if (!size) return alert("Selecciona una talla con stock");

  const qty = Math.max(1, parseInt(document.getElementById(`qty-${id}`).value) || 1);
  if (product.stock[size] < qty) return alert(`Solo hay ${product.stock[size]} unidades disponibles de la talla ${size}`);

  product.stock[size] -= qty;

  const existing = cart.find(item => item.id === id && item.size === size);
  if (existing) existing.qty += qty;
  else cart.push({ id: product.id, name: product.name, price: product.price, offer: product.offer, size, qty });

  saveAll();
  updateCount();
  renderShop();
}

function renderCart() {
  const cartDiv = document.getElementById("cart");
  cartDiv.innerHTML = "<h2>Carrito</h2>";
  let total = 0;

  if(cart.length === 0){
    cartDiv.innerHTML += "<p>El carrito está vacío</p>";
    return;
  }

  cart.forEach(item => {
    const price = finalPrice(item) * item.qty;
    total += price;
    const pEl = document.createElement("p");
    pEl.innerHTML = `${item.name} - Talla ${item.size} x${item.qty} - $${price.toFixed(2)} <button onclick='removeFromCart(${item.id}, "${item.size}")'>❌</button>`;
    cartDiv.appendChild(pEl);
  });

  cartDiv.innerHTML += `<h3>Total: $${total.toFixed(2)}</h3>`;
  cartDiv.innerHTML += `
    <hr>
    <h3>Finalizar compra</h3>
    <input id='c_name' placeholder='Nombre completo'><br>
    <input id='c_phone' placeholder='Teléfono móvil'><br>
    <input id='c_address' placeholder='Dirección completa'><br>
    <input id='c_street' placeholder='Calle'><br>
    <input id='c_floor' placeholder='Piso'><br><br>
    <button onclick='sendOrder()'>📲 Enviar por WhatsApp</button>
  `;
}

function removeFromCart(id, size) {
  const index = cart.findIndex(p => p.id === id && p.size === size);
  if (index === -1) return;

  const product = products.find(p => p.id === id);
  if (product && product.stock[size] !== undefined) product.stock[size] += cart[index].qty;

  cart.splice(index, 1);
  saveAll();
  renderCart();
  renderShop();
}

function sendOrder() {
  const name = document.getElementById('c_name').value;
  const phone = document.getElementById('c_phone').value;
  const address = `${document.getElementById('c_address').value}, ${document.getElementById('c_street').value}, Piso ${document.getElementById('c_floor').value}`;
  if (!name || !phone || !address) return alert("Completa todos los campos");

  let msg = `🛒 *Nuevo pedido*\n\n👤 ${name}\n📞 ${phone}\n🏠 ${address}\n\n`;
  let total = 0;
  cart.forEach(item => { msg += `• ${item.name} - Talla ${item.size} x${item.qty}\n`; total += finalPrice(item) * item.qty; });
  msg += `\n💰 Total: $${total.toFixed(2)}`;

  orders.push({ date: new Date().toLocaleString(), customer: { name, phone, address }, items: cart, total });
  cart = [];
  saveAll();
  window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`);
  renderCart();
  renderShop();
}

/* =========================
   ADMIN
========================= */

function renderAdminLogin() {
  const a = document.getElementById("admin");
  a.innerHTML = `
    <h2>Login Admin</h2>
    <input id='email' placeholder='Correo'>
    <input id='code' placeholder='Código'>
    <button onclick='login()'>Entrar</button>
  `;
}

function login() {
  const email = document.getElementById('email').value;
  const code = document.getElementById('code').value;
  const user = users.find(u => u.email === email && u.code === code && u.active);
  if (!user) return alert("Acceso denegado");
  currentUser = user;
  renderAdminPanel();
}

function renderAdminPanel() {
  const a = document.getElementById("admin");
  a.innerHTML = `
    <h2>Panel Admin</h2>
    <h3>🎨 Tienda</h3>
    <input value='${settings.title}' oninput='settings.title=this.value;saveAll();renderShop()'>
    <input type='color' value='${settings.mainColor}' onchange='settings.mainColor=this.value;saveAll();renderShop()'>
    <input type='color' value='${settings.bgColor}' onchange='settings.bgColor=this.value;saveAll();renderShop()'>
    <h3>📱 WhatsApp</h3>
    <input value='${whatsappNumber}' onchange='whatsappNumber=this.value;saveAll()'>
    <h3>🛒 Productos</h3>
    <button onclick='addProduct()'>➕ Añadir producto</button>
    <div id='admin-products'></div>
  `;

  const adminProducts = document.getElementById('admin-products');
  products.forEach(p => {
    const div = document.createElement('div');
    div.style = 'background:#f4f4f4;padding:10px;border-radius:8px;margin:10px 0';
    div.innerHTML = `
      <input type='text' value='${p.name}' onchange='updateProductName(${p.id}, this.value)'>
      <input type='number' min='0' step='0.01' value='${p.price}' onchange='updateProductPrice(${p.id}, this.value)'>
      <input type='number' min='0' max='100' step='1' value='${p.offer}' onchange='updateProductOffer(${p.id}, this.value)'>
      <br><br>
      <strong>Stock por tallas:</strong><br>
      <div id='sizes-${p.id}'>${Object.entries(p.stock || {}).map(([s,q]) => `Talla ${s}: <input type='number' value='${q}' min='0' onchange='updateStock(${p.id}, "${s}", this.value)'><br>`).join('')}</div>
      <button onclick='addSize(${p.id})'>➕ Añadir talla</button>
      <br><br>
      <strong>Imágenes:</strong><br>
      <div style='display:flex;gap:5px;flex-wrap:wrap'>${p.images.map((img,idx) => `<div style='position:relative'><img src='${img}' style='width:60px;height:60px;object-fit:cover;border-radius:4px'><button style='position:absolute;top:-5px;right:-5px;padding:2px 4px;font-size:10px' onclick='removeImage(${p.id},${idx})'>❌</button></div>`).join('')}</div>
      <button onclick='uploadImages(${p.id})'>📷 Añadir imágenes desde URL</button>
      <button onclick='removeProduct(${p.id})'>❌ Eliminar producto</button>
    `;
    adminProducts.appendChild(div);
  });
}

/* =========================
   FUNCIONES ADMIN
========================= */

function addProduct() {
  const newP = { id: Date.now(), name: 'Nuevo producto', price: 50, offer: 0, images: ['https://via.placeholder.com/300'], stock: { 36:5,37:5,38:5 } };
  products.push(newP);
  saveAll();
  renderAdminPanel();
  renderShop();
}

function removeProduct(id) {
  products = products.filter(p => p.id !== id);
  saveAll();
  renderAdminPanel();
  renderShop();
}

function uploadImages(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  // Pedir URLs de imágenes separadas por coma
  const urls = prompt("Introduce las URLs de las imágenes separadas por comas:");
  if (!urls) return;

  const urlArray = urls.split(',').map(u => u.trim()).filter(u => u);
  urlArray.forEach(u => p.images.push(u));

  saveAll();
  renderAdminPanel();
  renderShop();
}

function removeImage(id,idx){ 
  const p=products.find(x=>x.id===id); 
  if(!p) return; 
  p.images.splice(idx,1); 
  saveAll(); 
  renderAdminPanel(); 
}

function updateProductName(id,value){ const p=products.find(x=>x.id===id); if(!p) return; p.name=value; saveAll(); renderShop(); }
function updateProductPrice(id,value){ const p=products.find(x=>x.id===id); if(!p) return; p.price=parseFloat(value); saveAll(); renderShop(); }
function updateProductOffer(id,value){ const p=products.find(x=>x.id===id); if(!p) return; p.offer=parseFloat(value); saveAll(); renderShop(); }
function updateStock(id,size,value){ const p=products.find(x=>x.id===id); if(!p.stock) p.stock={}; p.stock[size]=parseInt(value); saveAll(); renderAdminPanel(); renderShop(); }
function addSize(id){ const s=prompt('Número de talla:'); if(!s) return; const p=products.find(x=>x.id===id); if(!p.stock) p.stock={}; p.stock[s]=1; saveAll(); renderAdminPanel(); renderShop(); }

/* =========================
   INICIALIZACIÓN
========================= */
show('shop');
