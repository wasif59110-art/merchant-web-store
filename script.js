/* ============================================================
   MERCHANT WEB — CUSTOMER WEBSITE
   FIRESTORE CONNECTED VERSION
   ============================================================ */

(async function () {
  "use strict";

  console.log("MERCHANT WEB: Starting...");

  /* ==========================================================
     1. FIREBASE CONFIG
     ========================================================== */

  const firebaseConfig = {
    apiKey: "AIzaSyDvwcnA5kRxg6kgWTbV9Dkk8U9eAIgxplA",
    authDomain: "merchant-9acf6.firebaseapp.com",
    projectId: "merchant-9acf6",
    storageBucket: "merchant-9acf6.firebasestorage.app",
    messagingSenderId: "1068455123589",
    appId: "1:1068455123589:web:ffe6236d489b414bf6a7ec",
    measurementId: "G-WCZQBHBHV0"
  };

  const SHOP_ID = "5d6OHoXqA1HZRRFtFayy";

  /* ==========================================================
     2. LOAD FIREBASE
     ========================================================== */

  try {

    const [
      { initializeApp },
      {
        getAuth,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        onAuthStateChanged,
        signOut
      },
      {
        getFirestore,
        collection,
        addDoc ,
        doc,
        setDoc,
        getDoc,
        getDocs,
        serverTimestamp,
        query,
        where,
        onSnapshot
      }
    ] = await Promise.all([

      import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js"
      ),

      import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js"
      ),

      import(
        "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js"
      )

    ]);

    /* ========================================================
       3. INITIALIZE FIREBASE
       ======================================================== */

    const app = initializeApp(firebaseConfig);

    const auth = getAuth(app);

    const db = getFirestore(app);

    console.log("MERCHANT WEB: Firebase initialized");


    /* ========================================================
       4. STATE
       ======================================================== */

    let products = [];

    let cart = [];

    let activeCategory = "all";

    let searchQuery = "";

    let currentProducts = [];

    let unsubscribeProducts = null;


    /* ========================================================
       5. ELEMENTS
       ======================================================== */

    const productGrid =
      document.getElementById("productGrid");

    const resultCount =
      document.getElementById("resultCount");

    const noResults =
      document.getElementById("noResults");

    const searchInput =
      document.getElementById("searchInput");

    const searchButton =
      document.getElementById("searchButton");

    const sortSelect =
      document.getElementById("sortSelect");

    const cartDrawer =
      document.getElementById("cartDrawer");

    const cartItems =
      document.getElementById("cartItems");

    const cartCount =
      document.getElementById("cartCount");

    const cartTotal =
      document.getElementById("cartTotal");

    const productOverlay =
      document.getElementById("productOverlay");

    const productDetails =
      document.getElementById("productDetails");

    const loginOverlay =
      document.getElementById("loginOverlay");

    const toast =
      document.getElementById("toast");


    /* ========================================================
       6. HELPERS
       ======================================================== */

    function money(value) {

      const number = Number(value) || 0;

      return "Rs. " +
        number.toLocaleString("en-PK");

    }


    function escapeHTML(value) {

      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    }


    function getProductImage(product) {

      if (product.image) {
        return product.image;
      }

      return "https://via.placeholder.com/800x600?text=Merchant+Product";

    }


    function getDiscount(product) {

      const discount =
        Number(product.discount);

      if (
        Number.isFinite(discount) &&
        discount > 0
      ) {
        return discount;
      }

      const oldPrice =
        Number(product.oldPrice);

      const price =
        Number(product.price);

      if (
        oldPrice > price &&
        price > 0
      ) {

        return Math.round(
          ((oldPrice - price) / oldPrice) * 100
        );

      }

      return 0;

    }


    function getRating(product) {

      const rating =
        Number(product.rating);

      return Number.isFinite(rating)
        ? rating
        : 0;

    }


    function getReviews(product) {

      const reviews =
        Number(product.reviews);

      return Number.isFinite(reviews)
        ? reviews
        : 0;

    }


    /* ========================================================
       7. FIRESTORE PRODUCT LISTENER
       ======================================================== */

    function startProductListener() {

      if (unsubscribeProducts) {

        unsubscribeProducts();

        unsubscribeProducts = null;

      }


      console.log(
        "MERCHANT WEB: Loading products from Firestore..."
      );


      const productsRef =
        collection(db, "products");


      const productsQuery =
        query(
          productsRef,
          where("shopId", "==", SHOP_ID)
        );


      unsubscribeProducts =
        onSnapshot(

          productsQuery,

          (snapshot) => {

            products =
              snapshot.docs.map(document => ({

                id: document.id,

                ...document.data()

              }));


            console.log(
              "MERCHANT WEB: Products loaded:",
              products.length
            );


            renderProducts();

            updateCartAgainstStock();

          },

          (error) => {

            console.error(
              "MERCHANT WEB: Firestore product error:",
              error
            );


            if (
              error.code === "permission-denied"
            ) {

              showToast(
                "Products cannot be read. Check Firestore rules."
              );

            } else {

              showToast(
                "Could not load products."
              );

            }

          }

        );

    }


    /* ========================================================
       8. RENDER PRODUCTS
       ======================================================== */

    function renderProducts() {

      if (!productGrid) return;

      productGrid.innerHTML = "";


      let filtered =
        products.filter(product => {

          const matchesCategory =
            activeCategory === "all" ||
            product.category === activeCategory;


          const productName =
            String(product.name || "")
              .toLowerCase();


          const matchesSearch =
            productName.includes(searchQuery);


          return (
            matchesCategory &&
            matchesSearch
          );

        });


      /* ======================================================
         SORT
         ====================================================== */

      const sort =
        sortSelect?.value || "recommended";


      if (sort === "price-low") {

        filtered.sort(
          (a, b) =>
            Number(a.price || 0) -
            Number(b.price || 0)
        );

      }


      if (sort === "price-high") {

        filtered.sort(
          (a, b) =>
            Number(b.price || 0) -
            Number(a.price || 0)
        );

      }


      if (sort === "rating") {

        filtered.sort(
          (a, b) =>
            getRating(b) -
            getRating(a)
        );

      }


      if (sort === "name") {

        filtered.sort(
          (a, b) =>
            String(a.name || "")
              .localeCompare(
                String(b.name || "")
              )
        );

      }


      currentProducts = filtered;


      /* ======================================================
         RESULT COUNT
         ====================================================== */

      if (resultCount) {

        resultCount.textContent =
          `${filtered.length} product${
            filtered.length !== 1
              ? "s"
              : ""
          }`;

      }


      /* ======================================================
         NO RESULTS
         ====================================================== */

      if (filtered.length === 0) {

        if (noResults) {
          noResults.classList.remove("hidden");
        }

        return;

      }


      if (noResults) {
        noResults.classList.add("hidden");
      }


      /* ======================================================
         PRODUCT CARDS
         ====================================================== */

      filtered.forEach(product => {

        const card =
          document.createElement("article");

        card.className =
          "product-card";


        const image =
          getProductImage(product);

        const discount =
          getDiscount(product);

        const stock =
          Number(product.stock) || 0;

        const rating =
          getRating(product);

        const reviews =
          getReviews(product);


        let ratingHTML = "";

        if (rating > 0) {

          ratingHTML = `
            <div class="rating">
              ★ ${escapeHTML(rating)}
              ${
                reviews > 0
                  ? `<span>(${escapeHTML(reviews)})</span>`
                  : ""
              }
            </div>
          `;

        }


        let oldPriceHTML = "";

        if (
          Number(product.oldPrice) >
          Number(product.price)
        ) {

          oldPriceHTML = `
            <span class="old-price">
              ${money(product.oldPrice)}
            </span>
          `;

        }


        let discountHTML = "";

        if (discount > 0) {

          discountHTML = `
            <span class="discount-badge">
              -${discount}%
            </span>
          `;

        }


        let stockHTML = "";

        if (stock > 0) {

          stockHTML = `
            <span class="stock-badge">
              ${stock} left
            </span>
          `;

        } else {

          stockHTML = `
            <span
              class="stock-badge"
              style="color:#dc2626;"
            >
              Out of Stock
            </span>
          `;

        }


        const addButtonText =
          stock > 0
            ? "Add to Cart"
            : "Out of Stock";


        const addButtonDisabled =
          stock <= 0
            ? "disabled"
            : "";


        card.innerHTML = `

          <div class="product-image">

            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(product.name)}"
              loading="lazy"
            >

            ${discountHTML}

            ${stockHTML}

          </div>


          <div class="product-info">

            <div class="product-category">
              ${escapeHTML(
                product.category || "Other"
              )}
            </div>


            <h3 class="product-name">
              ${escapeHTML(
                product.name || "Unnamed Product"
              )}
            </h3>


            ${ratingHTML}


            <div class="price-row">

              <strong class="current-price">
                ${money(product.price)}
              </strong>

              ${oldPriceHTML}

            </div>


            <div class="product-actions">

              <button
                class="view-button"
                data-action="view"
                data-id="${product.id}"
              >
                View
              </button>


              <button
                class="add-button"
                data-action="add"
                data-id="${product.id}"
                ${addButtonDisabled}
              >
                ${addButtonText}
              </button>

            </div>

          </div>

        `;


        productGrid.appendChild(card);

      });


      /* ======================================================
         CONNECT CARD BUTTONS
         ====================================================== */

      productGrid
        .querySelectorAll("[data-action='view']")
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              viewProduct(
                button.dataset.id
              );

            }
          );

        });


      productGrid
        .querySelectorAll("[data-action='add']")
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              addToCart(
                button.dataset.id
              );

            }
          );

        });

    }


    /* ========================================================
       9. SEARCH
       ======================================================== */

    function performSearch() {

      searchQuery =
        String(
          searchInput?.value || ""
        )
        .toLowerCase()
        .trim();


      renderProducts();

    }


    searchButton?.addEventListener(
      "click",
      performSearch
    );


    searchInput?.addEventListener(
      "keydown",
      event => {

        if (event.key === "Enter") {
          performSearch();
        }

      }
    );


    /* ========================================================
       10. CATEGORIES
       ======================================================== */

    document
      .querySelectorAll(".category")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            document
              .querySelectorAll(".category")
              .forEach(item => {

                item.classList.remove(
                  "active"
                );

              });


            button.classList.add("active");


            activeCategory =
              button.dataset.category;


            renderProducts();

          }
        );

      });


    /* ========================================================
       11. SORT
       ======================================================== */

    sortSelect?.addEventListener(
      "change",
      renderProducts
    );


    /* ========================================================
       12. ADD TO CART
       ======================================================== */

    function addToCart(id) {

      const product =
        products.find(
          item => item.id === id
        );


      if (!product) {

        showToast(
          "Product no longer exists."
        );

        return;

      }


      const stock =
        Number(product.stock) || 0;


      if (stock <= 0) {

        showToast(
          "This product is out of stock."
        );

        return;

      }


      const existing =
        cart.find(
          item => item.id === id
        );


      if (existing) {

        if (
          existing.quantity <
          stock
        ) {

          existing.quantity++;

        } else {

          showToast(
            "Maximum available stock reached."
          );

          return;

        }

      } else {

        cart.push({

          id: product.id,

          name: product.name,

          price: Number(product.price) || 0,

          image: getProductImage(product),

          stock: stock,

          quantity: 1

        });

      }


      updateCart();


      showToast(
        `${product.name} added to cart`
      );

    }


    /* ========================================================
       13. UPDATE CART
       ======================================================== */

    function updateCart() {

      if (!cartItems) return;


      cartItems.innerHTML = "";


      if (cart.length === 0) {

        cartItems.innerHTML = `

          <div class="empty-cart">

            <div style="font-size:50px">
              🛒
            </div>

            <h3>
              Your cart is empty
            </h3>

            <p>
              Add some products to get started.
            </p>

          </div>

        `;


        cartCount.textContent = "0";

        cartTotal.textContent =
          "Rs. 0";

        return;

      }


      let total = 0;

      let count = 0;


      cart.forEach(item => {

        total +=
          item.price *
          item.quantity;


        count +=
          item.quantity;


        const div =
          document.createElement("div");

        div.className =
          "cart-item";


        div.innerHTML = `

          <div class="cart-item-image">

            <img
              src="${escapeHTML(item.image)}"
              alt="${escapeHTML(item.name)}"
            >

          </div>


          <div>

            <div class="cart-item-name">
              ${escapeHTML(item.name)}
            </div>


            <div class="cart-item-price">
              ${money(item.price)}
            </div>


            <div class="cart-controls">

              <button
                class="quantity-button"
                data-action="decrease"
                data-id="${item.id}"
              >
                −
              </button>


              <strong>
                ${item.quantity}
              </strong>


              <button
                class="quantity-button"
                data-action="increase"
                data-id="${item.id}"
              >
                +
              </button>


              <button
                class="remove-item"
                data-action="remove"
                data-id="${item.id}"
              >
                Remove
              </button>

            </div>

          </div>

        `;


        cartItems.appendChild(div);

      });


      cartCount.textContent =
        count;


      cartTotal.textContent =
        money(total);


      /* ======================================================
         CART BUTTON EVENTS
         ====================================================== */

      cartItems
        .querySelectorAll(
          "[data-action='decrease']"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              changeQuantity(
                button.dataset.id,
                -1
              );

            }
          );

        });


      cartItems
        .querySelectorAll(
          "[data-action='increase']"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              changeQuantity(
                button.dataset.id,
                1
              );

            }
          );

        });


      cartItems
        .querySelectorAll(
          "[data-action='remove']"
        )
        .forEach(button => {

          button.addEventListener(
            "click",
            () => {

              removeFromCart(
                button.dataset.id
              );

            }
          );

        });

    }


    /* ========================================================
       14. CHECK CURRENT STOCK
       ======================================================== */

    function updateCartAgainstStock() {

      cart =
        cart
          .map(item => {

            const product =
              products.find(
                product =>
                  product.id === item.id
              );


            if (!product) {
              return null;
            }


            const stock =
              Number(product.stock) || 0;


            if (stock <= 0) {
              return null;
            }


            return {

              ...item,

              name: product.name,

              price:
                Number(product.price) || 0,

              image:
                getProductImage(product),

              stock: stock,

              quantity:
                Math.min(
                  item.quantity,
                  stock
                )

            };

          })
          .filter(Boolean);


      updateCart();

    }


    /* ========================================================
       15. CHANGE QUANTITY
       ======================================================== */

    function changeQuantity(
      id,
      amount
    ) {

      const item =
        cart.find(
          product =>
            product.id === id
        );


      if (!item) return;


      const product =
        products.find(
          product =>
            product.id === id
        );


      if (!product) {

        removeFromCart(id);

        return;

      }


      const stock =
        Number(product.stock) || 0;


      item.quantity += amount;


      if (item.quantity <= 0) {

        removeFromCart(id);

        return;

      }


      if (
        item.quantity >
        stock
      ) {

        item.quantity =
          stock;


        showToast(
          "Maximum available stock reached."
        );

      }


      updateCart();

    }


    /* ========================================================
       16. REMOVE FROM CART
       ======================================================== */

    function removeFromCart(id) {

      cart =
        cart.filter(
          item =>
            item.id !== id
        );


      updateCart();

    }


    /* ========================================================
       17. OPEN CART
       ======================================================== */

    document
      .getElementById("cartButton")
      ?.addEventListener(
        "click",
        () => {

          cartDrawer?.classList.add(
            "open"
          );

        }
      );


    /* ========================================================
       18. CLOSE CART
       ======================================================== */

    document
      .getElementById("closeCart")
      ?.addEventListener(
        "click",
        () => {

          cartDrawer?.classList.remove(
            "open"
          );

        }
      );


    /* ========================================================
       19. PRODUCT DETAILS
       ======================================================== */

    function viewProduct(id) {

      const product =
        products.find(
          item =>
            item.id === id
        );


      if (!product) return;


      const image =
        getProductImage(product);


      const stock =
        Number(product.stock) || 0;


      const rating =
        getRating(product);


      const reviews =
        getReviews(product);


      const description =
        product.description ||
        "Quality product available from your local Merchant.";


      let ratingHTML = "";


      if (rating > 0) {

        ratingHTML = `

          <div class="rating">

            ★ ${escapeHTML(rating)}

            ${
              reviews > 0
                ? `(${escapeHTML(reviews)} reviews)`
                : ""
            }

          </div>

        `;

      }


      const addButton =
        stock > 0

          ? `

            <button
              class="details-add"
              id="modalAddToCart"
            >
              Add to Cart
            </button>

          `

          : `

            <button
              class="details-add"
              disabled
              style="opacity:.5;cursor:not-allowed;"
            >
              Out of Stock
            </button>

          `;


      productDetails.innerHTML = `

        <div class="details-layout">

          <div class="details-image">

            <img
              src="${escapeHTML(image)}"
              alt="${escapeHTML(product.name)}"
            >

          </div>


          <div>

            <div class="details-category">
              ${escapeHTML(
                product.category || "Other"
              )}
            </div>


            <h2>
              ${escapeHTML(product.name)}
            </h2>


            ${ratingHTML}


            <p class="details-description">
              ${escapeHTML(description)}
            </p>


            <div class="details-price">
              ${money(product.price)}
            </div>


            <p
              style="
                margin-bottom:18px;
                color:${
                  stock > 0
                    ? "#16803c"
                    : "#dc2626"
                };
              "
            >

              ${
                stock > 0
                  ? `✓ ${stock} units available`
                  : "✕ Out of stock"
              }

            </p>


            ${addButton}

          </div>

        </div>

      `;


      if (stock > 0) {

        document
          .getElementById(
            "modalAddToCart"
          )
          ?.addEventListener(
            "click",
            () => {

              addToCart(product.id);

              productOverlay.classList.add(
                "hidden"
              );

            }
          );

      }


      productOverlay.classList.remove(
        "hidden"
      );

    }


    /* ========================================================
       20. CLOSE PRODUCT MODAL
       ======================================================== */

    document
      .getElementById("closeProduct")
      ?.addEventListener(
        "click",
        () => {

          productOverlay.classList.add(
            "hidden"
          );

        }
      );


    productOverlay?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          productOverlay
        ) {

          productOverlay.classList.add(
            "hidden"
          );

        }

      }
    );


    /* ========================================================
       21. SHOP BUTTON
       ======================================================== */

    document
      .getElementById("shopButton")
      ?.addEventListener(
        "click",
        () => {

          document
            .getElementById("productGrid")
            ?.scrollIntoView({
              behavior: "smooth"
            });

        }
      );


    /* ========================================================
       22. CUSTOMER LOGIN
       ======================================================== */

    document
      .getElementById("loginButton")
      ?.addEventListener(
        "click",
        () => {

          loginOverlay?.classList.remove(
            "hidden"
          );

        }
      );


    document
      .getElementById("closeLogin")
      ?.addEventListener(
        "click",
        () => {

          loginOverlay?.classList.add(
            "hidden"
          );

        }
      );


    loginOverlay?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          loginOverlay
        ) {

          loginOverlay.classList.add(
            "hidden"
          );

        }

      }
    );


   /* ========================================================
   23. CUSTOMER LOGIN / CREATE ACCOUNT
   ======================================================== */

let authMode = "login";


const authTitle =
  document.getElementById("authTitle");

const authSubtitle =
  document.getElementById("authSubtitle");

const nameInput =
  document.getElementById("nameInput");

const emailInput =
  document.getElementById("emailInput");

const passwordInput =
  document.getElementById("passwordInput");

const confirmPasswordInput =
  document.getElementById("confirmPasswordInput");

const loginSubmit =
  document.getElementById("loginSubmit");

const authSwitchButton =
  document.getElementById("authSwitchButton");

const authSwitchText =
  document.getElementById("authSwitchText");


/* ========================================================
   SWITCH LOGIN / CREATE ACCOUNT
   ======================================================== */

authSwitchButton?.addEventListener(
  "click",
  () => {

    if (authMode === "login") {

      /* ==============================================
         SWITCH TO CREATE ACCOUNT
         ============================================== */

      authMode = "signup";

      if (authTitle) {
        authTitle.textContent =
          "Create Your Account";
      }

      if (authSubtitle) {
        authSubtitle.textContent =
          "Create an account to manage your orders.";
      }

      if (nameInput) {
        nameInput.style.display = "block";
      }

      if (confirmPasswordInput) {
        confirmPasswordInput.style.display = "block";
      }

      if (loginSubmit) {
        loginSubmit.textContent =
          "Create Account";
      }

      if (authSwitchText) {
        authSwitchText.textContent =
          "Already have an account?";
      }

      if (authSwitchButton) {
        authSwitchButton.textContent =
          "Login";
      }

    } else {

      /* ==============================================
         SWITCH BACK TO LOGIN
         ============================================== */

      authMode = "login";

      if (authTitle) {
        authTitle.textContent =
          "Welcome to Merchant";
      }

      if (authSubtitle) {
        authSubtitle.textContent =
          "Sign in to manage your orders.";
      }

      if (nameInput) {
        nameInput.style.display = "none";
      }

      if (confirmPasswordInput) {
        confirmPasswordInput.style.display = "none";
      }

      if (loginSubmit) {
        loginSubmit.textContent =
          "Login";
      }

      if (authSwitchText) {
        authSwitchText.textContent =
          "Don't have an account?";
      }

      if (authSwitchButton) {
        authSwitchButton.textContent =
          "Create Account";
      }

    }

  }
);


/* ========================================================
   LOGIN / CREATE ACCOUNT BUTTON
   ======================================================== */

loginSubmit?.addEventListener(
  "click",
  async () => {

    /* ======================================================
       CREATE ACCOUNT
       ====================================================== */

    if (authMode === "signup") {

      const name =
        nameInput?.value.trim();

      const email =
        emailInput?.value.trim();

      const password =
        passwordInput?.value;

      const confirmPassword =
        confirmPasswordInput?.value;


      /* ==============================================
         VALIDATION
         ============================================== */

      if (
        !name ||
        !email ||
        !password ||
        !confirmPassword
      ) {

        showToast(
          "Please fill in all account fields."
        );

        return;

      }


      if (name.length < 2) {

        showToast(
          "Please enter your name."
        );

        return;

      }


      if (password.length < 6) {

        showToast(
          "Password must be at least 6 characters."
        );

        return;

      }


      if (password !== confirmPassword) {

        showToast(
          "Passwords do not match."
        );

        return;

      }


      /* ==============================================
         DISABLE BUTTON
         ============================================== */

      loginSubmit.disabled = true;

      loginSubmit.textContent =
        "Creating Account...";


      try {

        /* ==========================================
           1. CREATE FIREBASE AUTH ACCOUNT
           ========================================== */

        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );


        const user =
          userCredential.user;


        console.log(
          "MERCHANT WEB: Buyer account created:",
          user.uid
        );


        /* ==========================================
           2. CREATE FIRESTORE BUYER PROFILE
           ========================================== */

        await setDoc(
          doc(db, "users", user.uid),
          {
            name: name,
            email: email,
            role: "buyer",
            createdAt: serverTimestamp()
          }
        );


        console.log(
          "MERCHANT WEB: Buyer profile created:",
          user.uid
        );


        /* ==========================================
           3. CLOSE LOGIN MODAL
           ========================================== */

        loginOverlay?.classList.add(
          "hidden"
        );


        /* ==========================================
           4. RESET FORM
           ========================================== */

        if (nameInput) {
          nameInput.value = "";
        }

        if (emailInput) {
          emailInput.value = "";
        }

        if (passwordInput) {
          passwordInput.value = "";
        }

        if (confirmPasswordInput) {
          confirmPasswordInput.value = "";
        }


        /* ==========================================
           5. RETURN MODAL TO LOGIN MODE
           ========================================== */

        authMode = "login";

        if (nameInput) {
          nameInput.style.display = "none";
        }

        if (confirmPasswordInput) {
          confirmPasswordInput.style.display = "none";
        }

        if (authTitle) {
          authTitle.textContent =
            "Welcome to Merchant";
        }

        if (authSubtitle) {
          authSubtitle.textContent =
            "Sign in to manage your orders.";
        }

        if (loginSubmit) {
          loginSubmit.textContent =
            "Login";
        }

        if (authSwitchText) {
          authSwitchText.textContent =
            "Don't have an account?";
        }

        if (authSwitchButton) {
          authSwitchButton.textContent =
            "Create Account";
        }


        showToast(
          "Account created successfully!"
        );


      } catch (error) {

        console.error(
          "MERCHANT CUSTOMER SIGNUP ERROR:",
          error
        );


        let message =
          "Unable to create account.";


        if (
          error.code ===
          "auth/email-already-in-use"
        ) {

          message =
            "An account with this email already exists.";

        }


        if (
          error.code ===
          "auth/invalid-email"
        ) {

          message =
            "Please enter a valid email.";

        }


        if (
          error.code ===
          "auth/weak-password"
        ) {

          message =
            "Password is too weak.";

        }


        if (
          error.code ===
          "auth/network-request-failed"
        ) {

          message =
            "Network error. Please try again.";

        }


        if (
          error.code ===
          "permission-denied"
        ) {

          message =
            "Account created, but profile setup was blocked by Firestore rules.";

        }


        showToast(message);


      } finally {

        loginSubmit.disabled = false;

        loginSubmit.textContent =
          authMode === "signup"
            ? "Create Account"
            : "Login";

      }


      return;
    }


    /* ======================================================
       NORMAL LOGIN
       ====================================================== */

    const email =
      emailInput?.value.trim();

    const password =
      passwordInput?.value;


    if (!email || !password) {

      showToast(
        "Please enter email and password."
      );

      return;

    }


    loginSubmit.disabled = true;

    loginSubmit.textContent =
      "Signing in...";


    try {

      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


      loginOverlay?.classList.add(
        "hidden"
      );


      showToast(
        "Login successful."
      );


    } catch (error) {

      console.error(
        "MERCHANT CUSTOMER LOGIN ERROR:",
        error
      );


      let message =
        "Unable to sign in.";


      if (
        error.code ===
        "auth/invalid-credential"
      ) {

        message =
          "Incorrect email or password.";

      }


      if (
        error.code ===
        "auth/invalid-email"
      ) {

        message =
          "Please enter a valid email.";

      }


      if (
        error.code ===
        "auth/user-not-found"
      ) {

        message =
          "No account exists with this email.";

      }


      if (
        error.code ===
        "auth/wrong-password"
      ) {

        message =
          "Incorrect password.";

      }


      if (
        error.code ===
        "auth/too-many-requests"
      ) {

        message =
          "Too many attempts. Try again later.";

      }


      showToast(message);


    } finally {

      loginSubmit.disabled = false;

      loginSubmit.textContent =
        "Login";

    }

  }
);


/* ========================================================
   24. AUTH STATE
   ======================================================== */

onAuthStateChanged(
  auth,
  user => {

    const loginButton =
      document.getElementById(
        "loginButton"
      );


    if (user) {

      console.log(
        "MERCHANT WEB: Buyer signed in:",
        user.email
      );


      if (loginButton) {

        loginButton.textContent =
          "Account";

      }

    } else {

      console.log(
        "MERCHANT WEB: Buyer not signed in."
      );


      if (loginButton) {

        loginButton.textContent =
          "Login";

      }

    }

  }
);
/* ========================================================
   25. BUYER ACCOUNT
   ======================================================== */

const accountOverlay =
  document.getElementById("accountOverlay");

const closeAccount =
  document.getElementById("closeAccount");

const accountName =
  document.getElementById("accountName");

const accountEmail =
  document.getElementById("accountEmail");

const accountRole =
  document.getElementById("accountRole");

const accountOrders =
  document.getElementById("accountOrders");

const logoutButton =
  document.getElementById("logoutButton");

let unsubscribeBuyerOrders = null;


/* ========================================================
   OPEN BUYER ACCOUNT
   ======================================================== */

loginButton?.addEventListener(
  "click",
  async () => {

    const user = auth.currentUser;


    /* ====================================================
       NOT LOGGED IN
       ==================================================== */

    if (!user) {

      loginOverlay?.classList.remove(
        "hidden"
      );

      return;

    }


    /* ====================================================
       LOGGED IN
       ==================================================== */

    accountOverlay?.classList.remove(
      "hidden"
    );


    await loadBuyerAccount(user);

  }
);


/* ========================================================
   CLOSE ACCOUNT
   ======================================================== */

closeAccount?.addEventListener(
  "click",
  () => {

    accountOverlay?.classList.add(
      "hidden"
    );

  }
);


/* ========================================================
   LOAD BUYER ACCOUNT
   ======================================================== */

async function loadBuyerAccount(user) {

  if (!user) {
    return;
  }


  /* ======================================================
     BASIC AUTH INFORMATION
     ====================================================== */

  if (accountEmail) {

    accountEmail.textContent =
      user.email || "Not available";

  }


  if (accountRole) {

    accountRole.textContent =
      "Buyer";

  }


  /* ======================================================
     LOAD BUYER PROFILE
     ====================================================== */

  try {

    const userRef =
      doc(db, "users", user.uid);

    const userSnapshot =
      await getDoc(userRef);


    if (userSnapshot.exists()) {

      const profile =
        userSnapshot.data();


      if (accountName) {

        accountName.textContent =
          profile.name || "Not available";

      }


      if (accountEmail && profile.email) {

        accountEmail.textContent =
          profile.email;

      }


      if (accountRole) {

        accountRole.textContent =
          profile.role === "buyer"
            ? "Buyer"
            : profile.role || "Buyer";

      }

    } else {

      if (accountName) {

        accountName.textContent =
          "Not available";

      }

    }


  } catch (error) {

    console.error(
      "MERCHANT WEB: Failed to load buyer profile:",
      error
    );


    if (accountName) {

      accountName.textContent =
        "Unable to load";

    }

  }


  /* ======================================================
     LOAD BUYER ORDERS
     ====================================================== */

  loadBuyerOrders(user.uid);

}


/* ========================================================
   LOAD BUYER ORDERS
   ======================================================== */

function loadBuyerOrders(uid) {

  if (!accountOrders) {
    return;
  }


  /* ======================================================
     STOP PREVIOUS ORDER LISTENER
     ====================================================== */

  if (unsubscribeBuyerOrders) {

    unsubscribeBuyerOrders();

    unsubscribeBuyerOrders = null;

  }


  accountOrders.innerHTML = `
    <p class="orders-loading">
      Loading orders...
    </p>
  `;


  /* ======================================================
     QUERY BUYER ORDERS
     ====================================================== */

  const buyerOrdersQuery =
    query(
      collection(db, "orders"),
      where("shopId", "==", SHOP_ID),
      where("customerId", "==", uid)
    );


  /* ======================================================
     REAL-TIME ORDER LISTENER
     ====================================================== */

  unsubscribeBuyerOrders =
    onSnapshot(
      buyerOrdersQuery,
      snapshot => {

        if (snapshot.empty) {

          accountOrders.innerHTML = `
            <div class="orders-empty">
              You haven't placed any orders yet.
            </div>
          `;

          return;

        }


        const orders =
          snapshot.docs.map(
            orderDocument => ({

              id: orderDocument.id,

              ...orderDocument.data()

            })
          );


        /* ==============================================
           SORT NEWEST FIRST
           ============================================== */

        orders.sort(
          (a, b) => {

            const dateA =
              a.createdAt?.toMillis?.() || 0;

            const dateB =
              b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;

          }
        );


        /* ==============================================
           RENDER ORDERS
           ============================================== */

        accountOrders.innerHTML =
          orders
            .map(order => {

              const items =
                Array.isArray(order.items)
                  ? order.items
                  : [];


              const itemsHTML =
                items.length

                  ? `
                    <ul class="order-items">
                      ${items.map(item => `
                        <li>
                          ${escapeHTML(
                            item.name || "Product"
                          )}
                          × ${Number(
                            item.quantity || 0
                          )}
                        </li>
                      `).join("")}
                    </ul>
                  `

                  : `
                    <p>
                      No item details available.
                    </p>
                  `;


              let orderDate =
                "Date unavailable";


              if (
                order.createdAt &&
                typeof order.createdAt.toDate ===
                  "function"
              ) {

                orderDate =
                  order.createdAt
                    .toDate()
                    .toLocaleString();

              }


              const status =
                order.orderStatus ||
                "Pending";


              return `

                <div class="order-card">

                  <div class="order-card-header">

                    <span class="order-number">
                      Order #${escapeHTML(
                        order.id.substring(0, 8)
                      )}
                    </span>

                    <span class="order-status">
                      ${escapeHTML(status)}
                    </span>

                  </div>

                  ${itemsHTML}

                  <div class="order-total">

                    <span>
                      Total
                    </span>

                    <strong>
                      Rs. ${Number(
                        order.total || 0
                      ).toLocaleString()}
                    </strong>

                  </div>

                  <div class="order-date">
                    ${escapeHTML(orderDate)}
                  </div>

                </div>

              `;

            })
            .join("");

      },

      error => {

        console.error(
          "MERCHANT WEB: Buyer orders error:",
          error
        );


        accountOrders.innerHTML = `
          <div class="orders-empty">
            Unable to load your orders.
          </div>
        `;

      }
    );

}


/* ========================================================
   LOGOUT
   ======================================================== */

logoutButton?.addEventListener(
  "click",
  async () => {

    try {

      await signOut(auth);


      accountOverlay?.classList.add(
        "hidden"
      );


      showToast(
        "You have been logged out."
      );


    } catch (error) {

      console.error(
        "MERCHANT WEB: Logout error:",
        error
      );


      showToast(
        "Unable to log out."
      );

    }

  }
);



    /* ========================================================
       25. CLEAR SEARCH
       ======================================================== */

    document
      .getElementById("clearSearch")
      ?.addEventListener(
        "click",
        () => {

          if (searchInput) {
            searchInput.value = "";
          }


          searchQuery = "";

          activeCategory = "all";


          document
            .querySelectorAll(".category")
            .forEach(item => {

              item.classList.remove(
                "active"
              );

            });


          document
            .querySelector(
              '[data-category="all"]'
            )
            ?.classList.add(
              "active"
            );


          renderProducts();

        }
      );

    
    
  /* ========================================================
   26. CHECKOUT + CREATE ORDER
   ======================================================== */

  const checkoutOverlay = document.getElementById("checkoutOverlay");
  const checkoutForm = document.getElementById("checkoutForm");
  const closeCheckout = document.getElementById("closeCheckout");

  // Open checkout modal when clicking "Proceed to Checkout"
  document.getElementById("checkoutButton")?.addEventListener("click", () => {
    if (cart.length === 0) {
      showToast("Your cart is empty.");
      return;
    }
    
    // Close cart drawer and open checkout modal
    cartDrawer?.classList.remove("open");
    checkoutOverlay?.classList.remove("hidden");
  });

  // Close checkout modal via X button
  closeCheckout?.addEventListener("click", () => {
    checkoutOverlay?.classList.add("hidden");
  });

  // Close checkout modal when clicking outside background overlay
  checkoutOverlay?.addEventListener("click", event => {
    if (event.target === checkoutOverlay) {
      checkoutOverlay.classList.add("hidden");
    }
  });

  // Handle Order Placement
  document.getElementById("placeOrderButton")?.addEventListener("click", async () => {
   
    const name = document.getElementById("customerName")?.value.trim();
    const phone = document.getElementById("customerPhone")?.value.trim();
    const city = document.getElementById("customerCity")?.value.trim();
    const address = document.getElementById("customerAddress")?.value.trim();
    const paymentOption = document.getElementById("paymentOption")?.value || "Cash on Delivery";

    if (!name || !phone || !city || !address) {
      showToast("Please fill in all required delivery details.");
      return;
    }

    if (!auth.currentUser) {
      showToast("Please log in before placing an order.");
      return;
    }

    if (cart.length === 0) {
      showToast("Your cart is empty.");
      return;
    }

    const placeButton = document.getElementById("placeOrderButton");
    if (placeButton) {
      placeButton.disabled = true;
      placeButton.textContent = "Placing Order...";
    }

    try {
      const totalAmount = cart.reduce(
        (sum, item) => sum + (Number(item.price) * Number(item.quantity)), 
        0
      );

      const orderData = {
        shopId: SHOP_ID,
        customerId: auth.currentUser.uid,
        customerEmail: auth.currentUser.email,
        customerName: name,
        phone: phone,
        city: city,
        address: address,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: Number(item.quantity),
          image: item.image || ""
        })),
        total: totalAmount,
        paymentMethod: paymentOption,
        paymentStatus: "Pending",
        orderStatus: "Pending",
        createdAt: serverTimestamp()
      };

      const ordersRef = collection(db, "orders");
      const docRef = await addDoc(ordersRef, orderData);

      console.log("MERCHANT WEB: Order placed successfully with ID:", docRef.id);

      cart = [];
      updateCart();

      document.getElementById("checkoutOverlay")?.classList.add("hidden");
      document.getElementById("checkoutForm")?.reset();

      showToast("Order placed successfully!");

    } catch (error) {
      console.error("MERCHANT WEB: Error placing order:", error);
      showToast("Failed to place order. Check console for details.");
    } finally {
      if (placeButton) {
        placeButton.disabled = false;
        placeButton.textContent = "Place Order";
      }
    }
  });

    
    /* ========================================================
       27. TOAST
       ======================================================== */

    let toastTimer;


    function showToast(message) {

      if (!toast) return;


      toast.textContent =
        message;


      toast.classList.add(
        "show"
      );


      clearTimeout(
        toastTimer
      );


      toastTimer =
        setTimeout(
          () => {

            toast.classList.remove(
              "show"
            );

          },
          2500
        );

    }


    /* ========================================================
       28. INITIALIZE CART
       ======================================================== */

    updateCart();


    /* ========================================================
       29. START FIRESTORE
       ======================================================== */

    startProductListener();


    console.log(
      "MERCHANT WEB: Ready."
    );


  } catch (error) {

    console.error(
      "MERCHANT WEB: Firebase initialization failed:",
      error
    );


    alert(
      "Merchant Web could not connect to Firebase.\n\n" +
      error.message
    );

  }

})();
