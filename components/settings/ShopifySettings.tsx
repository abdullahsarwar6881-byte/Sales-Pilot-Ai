"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { shopifyFetch, isShopifyEmbedded } from "@/lib/shopify/client";
import {
  Store,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Package,
  ShoppingCart,
  ExternalLink,
} from "lucide-react";

type SyncStatus = "Connected" | "Not Connected" | "Syncing" | "Error";

interface StoreRecord {
  id: string;
  shop_domain: string;
  is_active: boolean;
  updated_at: string | null;
  created_at: string | null;
}

interface SyncSummary {
  shop: string;
  productsSynced: number;
  ordersSynced: number;
}

export default function ShopifySettings() {
  const supabase = createClient();

  const [status, setStatus] = useState<SyncStatus>("Not Connected");
  const [store, setStore] = useState<StoreRecord | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [embedded, setEmbedded] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncSummary | null>(null);

  const loadStore = useCallback(async () => {
    try {
      setLoadingStore(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoadingStore(false);
        return;
      }

      const { data, error } = await supabase
        .from("shopify_stores")
        .select("id, shop_domain, is_active, updated_at, created_at")
        .or(`user_id.eq.${user.id},profile_id.eq.${user.id}`)
        .maybeSingle();

      if (error) {
        console.error("Error loading Shopify store:", error);
      } else if (data && data.is_active) {
        setStore(data);
        setStatus("Connected");
      } else {
        setStore(null);
        setStatus("Not Connected");
      }
    } catch (err) {
      console.error("Failed to load store status:", err);
    } finally {
      setLoadingStore(false);
    }
  }, [supabase]);

  useEffect(() => {
    setEmbedded(isShopifyEmbedded());
    loadStore();
  }, [loadStore]);

  async function handleProductSync() {
    setSyncingProducts(true);
    setStatus("Syncing");
    setErrorMessage(null);
    setSyncResult(null);

    try {
      const response = await shopifyFetch("/api/shopify/products/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus("Error");
        const msg = data.error || "Shopify product synchronization failed.";
        setErrorMessage(msg);
        return;
      }

      setStatus("Connected");
      setSyncResult({
        shop: data.shop || store?.shop_domain || "Connected Shop",
        productsSynced: data.totalSynced ?? data.productsSynced ?? 0,
        ordersSynced: 0,
      });

      await loadStore();
    } catch (err) {
      console.error("Shopify product sync error:", err);
      setStatus("Error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Network error occurred while syncing products with Shopify."
      );
    } finally {
      setSyncingProducts(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setStatus("Syncing");
    setErrorMessage(null);
    setSyncResult(null);

    try {
      const response = await shopifyFetch("/api/shopify/sync", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus("Error");
        const msg = data.error || "Shopify synchronization failed.";
        setErrorMessage(msg);
        return;
      }

      // Success
      setStatus("Connected");
      setSyncResult({
        shop: data.shop || store?.shop_domain || "Connected Shop",
        productsSynced: data.productsSynced ?? 0,
        ordersSynced: data.ordersSynced ?? 0,
      });

      // Reload store details to get updated timestamps
      await loadStore();
    } catch (err) {
      console.error("Shopify sync error:", err);
      setStatus("Error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Network error occurred while syncing with Shopify."
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">
                Shopify Connection
              </h2>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold ${
                  status === "Connected"
                    ? "bg-emerald-100 text-emerald-800"
                    : status === "Syncing"
                    ? "bg-indigo-100 text-indigo-800 animate-pulse"
                    : status === "Error"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {status === "Connected" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
                {status === "Syncing" && (
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                )}
                {status === "Error" && (
                  <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                )}
                {status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Synchronize your catalog and orders with Sales Pilot AI via Shopify App Bridge.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleProductSync}
            disabled={syncing || syncingProducts || loadingStore}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-xs transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Package
              className={`h-4 w-4 ${syncingProducts ? "animate-spin" : ""}`}
            />
            {syncingProducts ? "Syncing Products..." : "Sync Products"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || syncingProducts || loadingStore}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing Store..." : "Sync All Data"}
          </button>
        </div>
      </div>

      {/* Embedded App Context Indicator */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">Environment:</span>
          {embedded ? (
            <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              Shopify Admin Embedded (App Bridge Active)
            </span>
          ) : (
            <span className="text-slate-600">
              Sales Pilot Web Dashboard
            </span>
          )}
        </div>

        {store?.shop_domain && (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Connected Shop:</span>
            <span className="font-mono text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              {store.shop_domain}
            </span>
          </div>
        )}
      </div>

      {/* Sync Success Results */}
      {syncResult && (
        <div className="mt-5 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Shopify sync completed</span>
          </div>
          <div className="mt-2 text-xs text-emerald-800">
            Successfully synchronized data for{" "}
            <span className="font-medium">{syncResult.shop}</span>.
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:w-80">
            <div className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-emerald-200/60 shadow-xs">
              <Package className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-[11px] text-slate-500">Products synced</p>
                <p className="font-bold text-slate-900">{syncResult.productsSynced}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-white/80 p-2.5 border border-emerald-200/60 shadow-xs">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-[11px] text-slate-500">Orders synced</p>
                <p className="font-bold text-slate-900">{syncResult.ordersSynced}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-rose-900">Synchronization Error</p>
              <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
              {!embedded && (
                <div className="mt-2.5 text-xs text-rose-800 bg-white/60 p-2 rounded-lg border border-rose-200/80">
                  <p className="font-medium">To sync via Shopify App Bridge:</p>
                  <p className="mt-0.5 text-slate-600">
                    Open your store&apos;s Shopify Admin, navigate to{" "}
                    <strong>Apps &rarr; Sales Pilot</strong>, and trigger the sync directly
                    from within the embedded app.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected Store Details */}
      {store && !syncResult && !errorMessage && (
        <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="text-slate-500">
                Store ID:{" "}
                <span className="font-mono text-slate-800">{store.id}</span>
              </div>
              {store.updated_at && (
                <div className="text-slate-500">
                  Last Synced:{" "}
                  <span className="font-medium text-slate-800">
                    {new Date(store.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <a
              href={`https://${store.shop_domain}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-700"
            >
              Open Shopify Admin <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

