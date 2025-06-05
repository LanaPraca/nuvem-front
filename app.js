const productList = document.querySelector("#products");
const addProductForm = document.querySelector("#add-product-form");
const updateProductForm = document.querySelector("#update-product-form");
const searchProductForm = document.querySelector("#search-product-form");
const searchResultDiv = document.querySelector("#search-result");

// Get references to the sections for easier show/hide
const addSection = document.querySelector("#add-section");
const updateSection = document.querySelector("#update-section");
const searchSection = document.querySelector("#search-section"); // Contains search form and results

// Add form elements
const productNameInput = document.querySelector("#name");
const productPriceInput = document.querySelector("#price");
const productDescriptionInput = document.querySelector("#description");

// Update form elements
const updateProductId = document.querySelector("#update-id");
const updateProductName = document.querySelector("#update-name");
const updateProductPrice = document.querySelector("#update-price");
const updateProductDescription = document.querySelector("#update-description");
const cancelUpdateButton = document.querySelector("#cancel-update");

// Search form elements
const searchIdInput = document.querySelector("#search-id");

// Base URL for the API
const API_URL = "18.188.252.233:3000/products"; // Make sure this is correct

// --- Toastify Configuration --- (Unchanged)
const toastOptions = {
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    stopOnFocus: true,
    style: {
        background: "linear-gradient(to right, #00b09b, #96c93d)",
    },
    onClick: function(){}
};

const errorToastOptions = {
    ...toastOptions,
    style: {
        background: "linear-gradient(to right, #ff5f6d, #ffc371)",
    }
};

function showSuccessToast(message) {
    Toastify({...toastOptions, text: message}).showToast();
}

function showErrorToast(message) {
    Toastify({...errorToastOptions, text: message}).showToast();
}

// Function to switch the view in the actions column
function showAddView() {
    addSection.style.display = "block";
    updateSection.style.display = "none";
    searchSection.style.display = "block"; // Keep search visible usually
    searchResultDiv.style.display = "none"; // Hide search results when switching back
    searchIdInput.value = ""; // Clear search input
}

function showUpdateView() {
    addSection.style.display = "none";
    updateSection.style.display = "block";
    searchSection.style.display = "none"; // Hide search while updating
    searchResultDiv.style.display = "none";
}

// Function to fetch all products from the server
async function fetchProducts() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const products = await response.json();

    // Clear product list (search results are handled separately)
    productList.innerHTML = "";
    // Ensure product list is visible (it should always be in the new layout)
    productList.style.display = 'grid'; 

    if (products.length === 0) {
        productList.innerHTML = "<li>No products found. Add one using the form!</li>";
    }

    // Add each product to the list
    products.forEach((product) => {
      const li = document.createElement("li");
      li.dataset.productId = product.id;
      li.innerHTML = `
        <strong>${product.name}</strong> - $${product.price.toFixed(2)}
        <p>${product.description || "No description"}</p>
        <div>
            <button class="update-btn">Update</button>
            <button class="delete-btn">Delete</button>
        </div>
      `;

      // Add delete button event listener
      const deleteButton = li.querySelector('.delete-btn');
      deleteButton.addEventListener("click", async () => {
        if (confirm(`Are you sure you want to delete ${product.name}?`)) {
             await deleteProduct(product.id);
        }
      });

      // Add update button event listener
      const updateButton = li.querySelector('.update-btn');
      updateButton.addEventListener("click", () => {
        // Populate update form
        updateProductId.value = product.id;
        updateProductName.value = product.name;
        updateProductPrice.value = product.price;
        updateProductDescription.value = product.description || "";
        // Switch to update view in actions column
        showUpdateView();
        // Scroll to the top of the actions column might be helpful
        updateSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      productList.appendChild(li);
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    showErrorToast(`Error loading products: ${error.message}`);
    productList.innerHTML =
      "<li>Error loading products. Check console or backend server.</li>";
  }
}

// Event listener for Add Product form submit button
addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = productNameInput.value;
  const price = parseFloat(productPriceInput.value);
  const description = productDescriptionInput.value;
  if (name && !isNaN(price)) {
    const success = await addProduct(name, price, description);
    if (success) {
        addProductForm.reset();
        await fetchProducts(); // Refresh list
        // Ensure view is correct (should already be on Add view)
        showAddView();
    }
  } else {
    showErrorToast("Please enter a valid name and price.");
  }
});

// Function to add a new product
async function addProduct(name, price, description) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, price, description }),
    });
    if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
            const errText = await response.text();
            errorMsg += `: ${errText}`;
        } catch (e) { /* Ignore */ }
        throw new Error(errorMsg);
    }
    await response.text();
    showSuccessToast(`Product "${name}" added successfully!`);
    return true;
  } catch (error) {
    console.error("Error adding product:", error);
    showErrorToast(`Failed to add product: ${error.message}`);
    return false;
  }
}

// Function to delete a product
async function deleteProduct(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    await response.text();
    showSuccessToast(`Product deleted successfully!`);
    await fetchProducts(); // Refresh list
    showAddView(); // Ensure we are not stuck in update view if delete happened there
  } catch (error) {
    console.error("Error deleting product:", error);
    showErrorToast(`Failed to delete product: ${error.message}`);
  }
}

// Event listener for Update Product form submit button
updateProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = updateProductId.value;
  const name = updateProductName.value;
  const price = parseFloat(updateProductPrice.value);
  const description = updateProductDescription.value;

  if (id && name && !isNaN(price)) {
    const success = await updateProduct(id, name, price, description);
    if (success) {
        await fetchProducts(); // Refresh list
        showAddView(); // Switch back to Add view after update
    }
  } else {
    showErrorToast("Please enter valid name and price.");
  }
});

// Function to update a product
async function updateProduct(id, name, price, description) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, price, description }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    await response.text();
    showSuccessToast(`Product "${name}" updated successfully!`);
    return true;
  } catch (error) {
    console.error("Error updating product:", error);
    showErrorToast(`Failed to update product: ${error.message}`);
    return false;
  }
}

// Event listener for Cancel Update button
cancelUpdateButton.addEventListener("click", () => {
  showAddView(); // Switch back to Add view
});

// --- Search Product by ID --- 

// Event listener for Search Product form submit button
searchProductForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = searchIdInput.value.trim();
    if (id) {
        await findProductById(id);
    } else {
        showErrorToast("Please enter a Product ID to search.");
        searchResultDiv.innerHTML = ""; // Clear previous results
        searchResultDiv.style.display = 'none';
    }
});

// Function to find a product by ID
async function findProductById(id) {
    searchResultDiv.innerHTML = "<p>Searching...</p>";
    searchResultDiv.style.display = 'block';
    // DO NOT HIDE productList -> productList.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) {
            if (response.status === 404) {
                 searchResultDiv.innerHTML = `<p>Product with ID <strong>${id}</strong> not found.</p>
                 <button id="clear-search-results">Clear Search</button>`;
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } else {
            const productsArray = await response.json(); // API returns array even for single ID
            if (!productsArray || productsArray.length === 0) { // Check if array is empty or null
                 searchResultDiv.innerHTML = `<p>Product with ID <strong>${id}</strong> not found.</p>
                 <button id="clear-search-results">Clear Search</button>`;
            } else {
                const product = productsArray[0]; // Get the first product
                searchResultDiv.innerHTML = `
                    <h3>Product Found:</h3>
                    <div>
                        <strong>ID:</strong> ${product.id}<br>
                        <strong>Name:</strong> ${product.name}<br>
                        <strong>Price:</strong> $${product.price.toFixed(2)}<br>
                        <strong>Description:</strong> ${product.description || 'N/A'}
                    </div>
                    <button id="clear-search-results">Clear Search</button>
                `;
            }
        }
        // Add event listener to the clear button *after* it's added to the DOM
        const clearButton = document.getElementById('clear-search-results');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                searchResultDiv.innerHTML = '';
                searchResultDiv.style.display = 'none';
                searchIdInput.value = ''; // Clear search input
                // No need to touch productList display, it should remain visible
            });
        }
    } catch (error) {
        console.error('Error searching product by ID:', error);
        showErrorToast(`Error searching for product: ${error.message}`);
        searchResultDiv.innerHTML = `<p>Error searching for product. Please check the console.</p>
        <button id="clear-search-results">Clear Search</button>`;
        // Ensure clear button works even on error display
        const clearButton = document.getElementById('clear-search-results');
        if (clearButton) {
             clearButton.addEventListener('click', () => {
                searchResultDiv.innerHTML = '';
                searchResultDiv.style.display = 'none';
                searchIdInput.value = '';
            });
        }
    }
}


// Initial setup on load
window.addEventListener('load', () => {
    fetchProducts();
    showAddView(); // Ensure the initial view is correct
});

