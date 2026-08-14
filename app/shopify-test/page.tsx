"use client";

import { useState } from "react";

type Product = {
  id: string;
  title: string;
  handle: string;
  description: string;
  status: string;
  variants: {
    nodes: {
      id: string;
      title: string;
      price: string;
      inventoryQuantity: number;
    }[];
  };
};

export default function ShopifyTestPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function testShopify() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/shopify/products", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json();

      console.log("Shopify response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Shopify request failed");
      }

      setProducts(data.products?.nodes ?? []);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to connect to Shopify"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white p-10 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">
          Shopify Connection Test
        </h1>

        <p className="mt-2 text-gray-600">
          Test the connection between Sales Pilot and Shopify.
        </p>

        <button
          onClick={testShopify}
          disabled={loading}
          className="mt-6 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {loading
            ? "Connecting to Shopify..."
            : "Test Shopify Connection"}
        </button>

        {error && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
            <strong>Shopify Error:</strong>

            <p className="mt-1">{error}</p>
          </div>
        )}

        {products.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold">
              Shopify Products
            </h2>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-gray-200 p-5 shadow-sm"
                >
                  <h3 className="text-lg font-semibold">
                    {product.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Status: {product.status}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    Handle: {product.handle}
                  </p>

                  <div className="mt-4">
                    <p className="font-medium">
                      Variants
                    </p>

                    {product.variants.nodes.map((variant) => (
                      <div
                        key={variant.id}
                        className="mt-2 rounded-lg bg-gray-50 p-3"
                      >
                        <p>{variant.title}</p>

                        <p className="text-sm text-gray-600">
                          Price: ${variant.price}
                        </p>

                        <p className="text-sm text-gray-600">
                          Inventory:{" "}
                          {variant.inventoryQuantity}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading &&
          !error &&
          products.length === 0 && (
            <div className="mt-8 rounded-lg border border-gray-200 p-6 text-gray-500">
              No products loaded yet. Click the button above.
            </div>
          )}
      </div>
    </main>
  );
}