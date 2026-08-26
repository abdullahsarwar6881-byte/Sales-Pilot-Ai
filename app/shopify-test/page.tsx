"use client";

import { useEffect, useState } from "react";

type Product = {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  status: string;
  variants: {
    nodes: {
      id: string;
      title: string;
      price: string;
      inventoryQuantity: number | null;
    }[];
  };
};

type ApiResponse = {
  success?: boolean;
  shop?: string;
  scope?: string;
  products?: {
    nodes: Product[];
  };
  error?: string;
  details?: unknown;
};

type Order = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  totalPriceSet: {
    shopMoney: {
      amount: string;
      currencyCode: string;
    };
  };
  customer: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
  lineItems: {
    nodes: {
      id: string;
      title: string;
      quantity: number;
      originalUnitPriceSet: {
        shopMoney: {
          amount: string;
          currencyCode: string;
        };
      };
    }[];
  };
};

type OrdersResponse = {
  success?: boolean;
  shop?: string;
  scope?: string;
  orders?: {
    nodes: Order[];
  };
  error?: string;
  details?: unknown;
};

type SyncResponse = {
  success?: boolean;
  shop?: string;
  storeId?: string;
  productsSynced?: number;
  ordersSynced?: number;
  message?: string;
  error?: string;
  details?: unknown;
};

export default function ShopifyTestPage() {
  const [mounted, setMounted] = useState(false);

  // --------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);

  // --------------------------------------------------
  // ORDERS
  // --------------------------------------------------

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersStatus, setOrdersStatus] = useState("Ready");
  const [ordersError, setOrdersError] = useState("");
  const [ordersData, setOrdersData] =
    useState<OrdersResponse | null>(null);

  // --------------------------------------------------
  // SHOPIFY → SUPABASE SYNC
  // --------------------------------------------------

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Ready");
  const [syncError, setSyncError] = useState("");
  const [syncData, setSyncData] =
    useState<SyncResponse | null>(null);

  // --------------------------------------------------
  // CLIENT MOUNT
  // --------------------------------------------------

  useEffect(() => {
    console.log(
      "SALES PILOT CLIENT JAVASCRIPT IS RUNNING"
    );

    setMounted(true);
  }, []);

  // ==================================================
  // TEST PRODUCTS
  // ==================================================

  async function testShopifyConnection() {
    console.log(
      "SHOPIFY PRODUCTS TEST STARTED"
    );

    setLoading(true);
    setError("");
    setData(null);
    setStatus("Connecting to Shopify...");

    try {
      const response = await fetch(
        "/api/shopify/products",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      console.log(
        "PRODUCTS HTTP STATUS:",
        response.status
      );

      const result: ApiResponse =
        await response.json();

      console.log(
        "SHOPIFY PRODUCTS RESPONSE:",
        result
      );

      setData(result);

      if (!response.ok) {
        setStatus(
          "Shopify connection failed."
        );

        setError(
          result.error ||
            "Shopify API request failed."
        );

        return;
      }

      if (!result.success) {
        setStatus(
          "Shopify connection failed."
        );

        setError(
          result.error ||
            "Shopify connection failed."
        );

        return;
      }

      const count =
        result.products?.nodes?.length || 0;

      setStatus(
        `Connected successfully to ${
          result.shop || "Shopify"
        }. Found ${count} product(s).`
      );
    } catch (err) {
      console.error(
        "SHOPIFY PRODUCTS ERROR:",
        err
      );

      setStatus("Connection failed.");

      setError(
        err instanceof Error
          ? err.message
          : "Unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==================================================
  // TEST ORDERS
  // ==================================================

  async function testShopifyOrders() {
    console.log(
      "SHOPIFY ORDERS TEST STARTED"
    );

    setOrdersLoading(true);
    setOrdersError("");
    setOrdersData(null);
    setOrdersStatus(
      "Loading Shopify orders..."
    );

    try {
      const response = await fetch(
        "/api/shopify/orders",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      console.log(
        "ORDERS HTTP STATUS:",
        response.status
      );

      const result: OrdersResponse =
        await response.json();

      console.log(
        "SHOPIFY ORDERS RESPONSE:",
        result
      );

      setOrdersData(result);

      if (!response.ok) {
        setOrdersStatus(
          "Shopify Orders request failed."
        );

        setOrdersError(
          result.error ||
            "Shopify Orders API request failed."
        );

        return;
      }

      if (!result.success) {
        setOrdersStatus(
          "Shopify Orders request failed."
        );

        setOrdersError(
          result.error ||
            "Shopify Orders request failed."
        );

        return;
      }

      const count =
        result.orders?.nodes?.length || 0;

      setOrdersStatus(
        `Orders connected successfully. Found ${count} order(s).`
      );
    } catch (err) {
      console.error(
        "SHOPIFY ORDERS ERROR:",
        err
      );

      setOrdersStatus(
        "Orders connection failed."
      );

      setOrdersError(
        err instanceof Error
          ? err.message
          : "Unknown error occurred."
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  // ==================================================
  // SYNC SHOPIFY DATA TO SUPABASE
  // ==================================================

  async function syncShopifyData() {
    console.log(
      "SHOPIFY SUPABASE SYNC STARTED"
    );

    setSyncLoading(true);
    setSyncError("");
    setSyncData(null);
    setSyncStatus(
      "Synchronizing Shopify data..."
    );

    try {
      const response = await fetch(
        "/api/shopify/sync",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      console.log(
        "SYNC HTTP STATUS:",
        response.status
      );

      const result: SyncResponse =
        await response.json();

      console.log(
        "SHOPIFY SYNC RESPONSE:",
        result
      );

      setSyncData(result);

      if (!response.ok) {
        setSyncStatus(
          "Shopify synchronization failed."
        );

        setSyncError(
          result.error ||
            "Shopify synchronization failed."
        );

        return;
      }

      if (!result.success) {
        setSyncStatus(
          "Shopify synchronization failed."
        );

        setSyncError(
          result.error ||
            "Shopify synchronization failed."
        );

        return;
      }

      setSyncStatus(
        result.message ||
          "Shopify synchronization completed successfully."
      );
    } catch (err) {
      console.error(
        "SHOPIFY SYNC ERROR:",
        err
      );

      setSyncStatus(
        "Synchronization failed."
      );

      setSyncError(
        err instanceof Error
          ? err.message
          : "Unknown synchronization error."
      );
    } finally {
      setSyncLoading(false);
    }
  }

  // --------------------------------------------------
  // DATA
  // --------------------------------------------------

  const products =
    data?.products?.nodes || [];

  const orders =
    ordersData?.orders?.nodes || [];

  // ==================================================
  // PAGE
  // ==================================================

  return (
    <main className="min-h-screen bg-white p-10 text-gray-900">
      <div className="mx-auto max-w-6xl">

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <h1 className="text-4xl font-bold">
          Shopify Connection Test
        </h1>

        <p className="mt-3 text-lg text-gray-600">
          Test the connection between Sales
          Pilot and Shopify.
        </p>

        {/* ==================================================
            CLIENT STATUS
        ================================================== */}

        <div className="mt-8 rounded-xl border bg-gray-50 p-6">
          <h2 className="font-bold">
            Client Status
          </h2>

          <p className="mt-2 text-lg">
            {mounted
              ? "Client JavaScript is running"
              : "Waiting for client JavaScript..."}
          </p>
        </div>

        {/* ==================================================
            TEST BUTTONS
        ================================================== */}

        <div className="mt-8 flex flex-wrap gap-4">

          {/* Products */}

          <button
            type="button"
            onClick={testShopifyConnection}
            disabled={loading}
            className="rounded-xl bg-purple-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Testing Shopify..."
              : "Test Shopify Connection"}
          </button>

          {/* Orders */}

          <button
            type="button"
            onClick={testShopifyOrders}
            disabled={ordersLoading}
            className="rounded-xl bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ordersLoading
              ? "Loading Orders..."
              : "Test Shopify Orders"}
          </button>

          {/* Sync */}

          <button
            type="button"
            onClick={syncShopifyData}
            disabled={syncLoading}
            className="rounded-xl bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-md transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {syncLoading
              ? "Syncing Shopify..."
              : "Sync Shopify to Supabase"}
          </button>
        </div>

        {/* ==================================================
            PRODUCTS STATUS
        ================================================== */}

        <div className="mt-8 rounded-xl border p-6">
          <h2 className="font-bold">
            Product Connection Status
          </h2>

          <p className="mt-2 text-lg">
            {status}
          </p>
        </div>

        {/* ==================================================
            PRODUCTS ERROR
        ================================================== */}

        {error && (
          <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-6">
            <h2 className="font-bold text-red-700">
              Product Error
            </h2>

            <p className="mt-2 whitespace-pre-wrap text-red-700">
              {error}
            </p>

            {data?.details && (
              <pre className="mt-4 overflow-auto rounded-lg bg-white p-4 text-sm">
                {JSON.stringify(
                  data.details,
                  null,
                  2
                )}
              </pre>
            )}
          </div>
        )}

        {/* ==================================================
            PRODUCTS CONNECTED
        ================================================== */}

        {data?.success && (
          <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="font-bold text-green-700">
              Shopify Products Connected
            </h2>

            <p className="mt-2">
              Store: {data.shop}
            </p>

            <p>
              Products loaded:{" "}
              {products.length}
            </p>
          </div>
        )}

        {/* ==================================================
            PRODUCTS LIST
        ================================================== */}

        {products.length > 0 && (
          <div className="mt-10">
            <h2 className="text-2xl font-bold">
              Shopify Products
            </h2>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {products.map(
                (product) => (
                  <div
                    key={product.id}
                    className="rounded-xl border p-6 shadow-sm"
                  >
                    <h3 className="text-xl font-bold">
                      {product.title}
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Handle:{" "}
                      {product.handle}
                    </p>

                    <p className="text-sm text-gray-500">
                      Status:{" "}
                      {product.status}
                    </p>

                    {product.description && (
                      <p className="mt-3 text-sm text-gray-600">
                        {product.description}
                      </p>
                    )}

                    {product.variants.nodes.length > 0 && (
                      <div className="mt-5">
                        <h4 className="font-semibold">
                          Variants
                        </h4>

                        {product.variants.nodes.map(
                          (variant) => (
                            <div
                              key={variant.id}
                              className="mt-2 rounded-lg bg-gray-50 p-3"
                            >
                              <p className="font-medium">
                                {variant.title}
                              </p>

                              <p className="text-sm">
                                Price: $
                                {variant.price}
                              </p>

                              <p className="text-sm">
                                Inventory:{" "}
                                {variant.inventoryQuantity ??
                                  "Unavailable"}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ==================================================
            ORDERS SECTION
        ================================================== */}

        <div className="mt-14 border-t pt-10">

          <h2 className="text-3xl font-bold">
            Shopify Orders
          </h2>

          <p className="mt-2 text-gray-600">
            Test Sales Pilot's ability to
            read Shopify orders.
          </p>

          {/* Orders status */}

          <div className="mt-6 rounded-xl border p-6">
            <h3 className="font-bold">
              Order Connection Status
            </h3>

            <p className="mt-2 text-lg">
              {ordersStatus}
            </p>
          </div>

          {/* Orders error */}

          {ordersError && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-6">
              <h3 className="font-bold text-red-700">
                Orders Error
              </h3>

              <p className="mt-2 whitespace-pre-wrap text-red-700">
                {ordersError}
              </p>

              {ordersData?.details && (
                <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-white p-4 text-sm text-gray-800">
                  {JSON.stringify(
                    ordersData.details,
                    null,
                    2
                  )}
                </pre>
              )}
            </div>
          )}

          {/* Orders connected */}

          {ordersData?.success && (
            <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-6">
              <h3 className="font-bold text-green-700">
                Shopify Orders Connected
              </h3>

              <p className="mt-2">
                Store:{" "}
                {ordersData.shop}
              </p>

              <p>
                Orders loaded:{" "}
                {orders.length}
              </p>
            </div>
          )}

          {/* No orders */}

          {ordersData?.success &&
            orders.length === 0 && (
              <div className="mt-6 rounded-xl border bg-gray-50 p-6">
                <p>
                  Shopify is connected,
                  but there are currently
                  no orders available.
                </p>
              </div>
            )}

          {/* Orders list */}

          {orders.length > 0 && (
            <div className="mt-8 space-y-6">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-xl border p-6 shadow-sm"
                >

                  <div className="flex flex-col justify-between gap-4 md:flex-row">

                    <div>
                      <h3 className="text-2xl font-bold">
                        {order.name}
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Order ID:{" "}
                        {order.id}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-xl font-bold">
                        {
                          order.totalPriceSet
                            .shopMoney
                            .amount
                        }{" "}
                        {
                          order.totalPriceSet
                            .shopMoney
                            .currencyCode
                        }
                      </p>
                    </div>

                  </div>

                  {/* Order information */}

                  <div className="mt-6 grid gap-4 md:grid-cols-3">

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">
                        Created
                      </p>

                      <p className="mt-1 font-medium">
                        {new Date(
                          order.createdAt
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">
                        Financial Status
                      </p>

                      <p className="mt-1 font-medium">
                        {order.displayFinancialStatus ||
                          "Unknown"}
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="text-sm text-gray-500">
                        Fulfillment Status
                      </p>

                      <p className="mt-1 font-medium">
                        {order.displayFulfillmentStatus ||
                          "Unknown"}
                      </p>
                    </div>

                  </div>

                  {/* Customer */}

                  {order.customer && (
                    <div className="mt-6">

                      <h4 className="font-bold">
                        Customer
                      </h4>

                      <div className="mt-2 rounded-lg bg-gray-50 p-4">

                        <p>
                          {
                            order.customer
                              .firstName
                          }{" "}
                          {
                            order.customer
                              .lastName
                          }
                        </p>

                        {order.customer.email && (
                          <p className="text-sm text-gray-500">
                            {
                              order.customer
                                .email
                            }
                          </p>
                        )}

                      </div>
                    </div>
                  )}

                  {/* Line items */}

                  {order.lineItems.nodes.length > 0 && (
                    <div className="mt-6">

                      <h4 className="font-bold">
                        Products in Order
                      </h4>

                      <div className="mt-3 space-y-2">

                        {order.lineItems.nodes.map(
                          (item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                            >

                              <div>

                                <p className="font-medium">
                                  {item.title}
                                </p>

                                <p className="text-sm text-gray-500">
                                  Quantity:{" "}
                                  {item.quantity}
                                </p>

                              </div>

                              <p className="font-medium">
                                {
                                  item
                                    .originalUnitPriceSet
                                    .shopMoney
                                    .amount
                                }{" "}
                                {
                                  item
                                    .originalUnitPriceSet
                                    .shopMoney
                                    .currencyCode
                                }
                              </p>

                            </div>
                          )
                        )}

                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

        {/* ==================================================
            SHOPIFY → SUPABASE SYNC
        ================================================== */}

        <div className="mt-14 border-t pt-10">

          <h2 className="text-3xl font-bold">
            Shopify → Supabase Sync
          </h2>

          <p className="mt-2 text-gray-600">
            Synchronize Shopify products and
            orders into Sales Pilot's database.
          </p>

          {/* Sync status */}

          <div className="mt-6 rounded-xl border p-6">

            <h3 className="font-bold">
              Sync Status
            </h3>

            <p className="mt-2 text-lg">
              {syncStatus}
            </p>

          </div>

          {/* Sync error */}

          {syncError && (
            <div className="mt-6 rounded-xl border border-red-300 bg-red-50 p-6">

              <h3 className="font-bold text-red-700">
                Sync Error
              </h3>

              <p className="mt-2 whitespace-pre-wrap text-red-700">
                {syncError}
              </p>

              {syncData?.details && (
                <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-white p-4 text-sm text-gray-800">
                  {JSON.stringify(
                    syncData.details,
                    null,
                    2
                  )}
                </pre>
              )}

            </div>
          )}

          {/* Sync successful */}

          {syncData?.success && (
            <div className="mt-6 rounded-xl border border-green-300 bg-green-50 p-6">

              <h3 className="font-bold text-green-700">
                Shopify Data Synchronized
              </h3>

              <p className="mt-2">
                Store: {syncData.shop}
              </p>

              <p>
                Products synchronized:{" "}
                {syncData.productsSynced ?? 0}
              </p>

              <p>
                Orders synchronized:{" "}
                {syncData.ordersSynced ?? 0}
              </p>

              {syncData.message && (
                <p className="mt-3 font-medium">
                  {syncData.message}
                </p>
              )}

            </div>
          )}

        </div>

        {/* ==================================================
            DEBUG INFORMATION
        ================================================== */}

        <div className="mt-14 rounded-xl border border-blue-200 bg-blue-50 p-6">

          <h2 className="font-bold">
            What Sales Pilot is testing
          </h2>

          <ul className="mt-3 list-disc space-y-2 pl-5">

            <li>
              Next.js page rendering
            </li>

            <li>
              React client hydration
            </li>

            <li>
              Shopify embedded app authentication
            </li>

            <li>
              Shopify Admin API
            </li>

            <li>
              Shopify products
            </li>

            <li>
              Shopify orders
            </li>

            <li>
              Product variants
            </li>

            <li>
              Inventory quantities
            </li>

            <li>
              Order customers
            </li>

            <li>
              Order line items
            </li>

            <li>
              Shopify → Supabase synchronization
            </li>

          </ul>

        </div>

      </div>
    </main>
  );
}