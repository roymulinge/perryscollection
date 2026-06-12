const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

async function getJson(path, params = {}) {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = response.status === 404
      ? "We could not find those products."
      : "Products could not be loaded right now.";
    throw new Error(message);
  }

  return response.json();
}

export function fetchProducts({ page = 1, q = "", featured = "" } = {}) {
  return getJson("/products/", { page, q, featured });
}

export function fetchCategories() {
  return getJson("/categories/");
}
