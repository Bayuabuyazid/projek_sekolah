const productCards = Array.from(document.querySelectorAll(".product-card"));
const filterButtons = Array.from(document.querySelectorAll(".filter-button"));
const searchInput = document.querySelector("#product-search");
const productCount = document.querySelector("#product-count");
const emptyState = document.querySelector("#empty-state");
const orderList = document.querySelector("#order-list");
const orderEmpty = document.querySelector("#order-empty");
const orderItemCount = document.querySelector("#order-item-count");
const orderTotal = document.querySelector("#order-total");

let selectedCategory = "semua";

const formatPrice = (price) => `Rp${new Intl.NumberFormat("id-ID").format(price)}`;

productCards.forEach((card) => {
    const priceText = card.querySelector(".product-price").textContent;
    const price = Number(priceText.replace(/\D/g, ""));
    const quantityControl = document.createElement("div");
    quantityControl.className = "quantity-control";

    const decreaseButton = document.createElement("button");
    decreaseButton.className = "quantity-button";
    decreaseButton.type = "button";
    decreaseButton.textContent = "−";
    decreaseButton.setAttribute("aria-label", `Kurangi ${card.querySelector("h3").textContent}`);
    decreaseButton.disabled = true;

    const quantity = document.createElement("span");
    quantity.className = "quantity-value";
    quantity.textContent = "0";
    quantity.setAttribute("aria-live", "polite");

    const increaseButton = document.createElement("button");
    increaseButton.className = "quantity-button";
    increaseButton.type = "button";
    increaseButton.textContent = "+";
    increaseButton.setAttribute("aria-label", `Tambah ${card.querySelector("h3").textContent}`);

    decreaseButton.addEventListener("click", () => {
        const nextQuantity = Number(quantity.textContent) - 1;
        quantity.textContent = String(nextQuantity);
        decreaseButton.disabled = nextQuantity === 0;
        updateOrder();
    });

    increaseButton.addEventListener("click", () => {
        quantity.textContent = String(Number(quantity.textContent) + 1);
        decreaseButton.disabled = false;
        updateOrder();
    });

    quantityControl.append(decreaseButton, quantity, increaseButton);
    card.querySelector(".product-info").append(quantityControl);
    card.dataset.price = String(price);
});

function updateOrder() {
    let totalItems = 0;
    let totalPrice = 0;
    orderList.replaceChildren();

    productCards.forEach((card) => {
        const quantity = Number(card.querySelector(".quantity-value").textContent);
        if (quantity === 0) {
            return;
        }

        const lineTotal = quantity * Number(card.dataset.price);
        totalItems += quantity;
        totalPrice += lineTotal;

        const item = document.createElement("li");
        item.className = "order-line";

        const details = document.createElement("span");
        details.className = "order-line-details";
        const name = document.createElement("strong");
        name.textContent = card.querySelector("h3").textContent;
        const quantityText = document.createElement("span");
        quantityText.textContent = `${quantity} × ${formatPrice(Number(card.dataset.price))}`;
        details.append(name, quantityText);

        const subtotal = document.createElement("strong");
        subtotal.className = "order-line-subtotal";
        subtotal.textContent = formatPrice(lineTotal);
        item.append(details, subtotal);
        orderList.append(item);
    });

    orderItemCount.textContent = `${totalItems} barang`;
    orderTotal.textContent = formatPrice(totalPrice);
    orderEmpty.hidden = totalItems > 0;
    orderList.hidden = totalItems === 0;
}

function updateProducts() {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase("id");
    let visibleProducts = 0;

    productCards.forEach((card) => {
        const matchesCategory = selectedCategory === "semua" || card.dataset.category === selectedCategory;
        const matchesSearch = card.dataset.name.includes(searchTerm);
        const isVisible = matchesCategory && matchesSearch;

        card.hidden = !isVisible;
        if (isVisible) {
            visibleProducts += 1;
        }
    });

    productCount.textContent = `${visibleProducts} produk`;
    emptyState.hidden = visibleProducts > 0;
}

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        selectedCategory = button.dataset.category;
        filterButtons.forEach((filterButton) => {
            const isSelected = filterButton === button;
            filterButton.classList.toggle("is-active", isSelected);
            filterButton.setAttribute("aria-pressed", String(isSelected));
        });
        updateProducts();
    });
});

searchInput.addEventListener("input", updateProducts);
