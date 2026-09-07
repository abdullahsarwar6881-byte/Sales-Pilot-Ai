import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { authenticateShopifyRequest } from "./auth";
import { upsertProductVisualIndex } from "@/lib/products/visualIndex";

const SHOPIFY_API_VERSION = "2026-07";

export const SHOPIFY_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      nodes {
        id
        title
        handle
        description
        status
        productType
        vendor
        tags
        updatedAt
        featuredImage {
          id
          url
          altText
        }
        images(first: 20) {
          nodes {
            id
            url
            altText
          }
        }
        options {
          id
          name
          values
        }
        variants(first: 100) {
          nodes {
            id
            title
            sku
            price
            compareAtPrice
            availableForSale
            inventoryQuantity
            selectedOptions {
              name
              value
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export interface ShopifyGraphQLImage {
  id?: string;
  url: string;
  src?: string;
  altText?: string | null;
}

export interface ShopifyGraphQLVariant {
  id: string;
  title: string;
  sku?: string | null;
  price: string;
  compareAtPrice?: string | null;
  availableForSale?: boolean;
  inventoryQuantity?: number | null;
  selectedOptions?: Array<{
    name: string;
    value: string;
  }>;
}

export interface ShopifyGraphQLProductNode {
  id: string;
  title: string;
  handle: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  updatedAt?: string;
  featuredImage?: ShopifyGraphQLImage | null;
  images?: {
    nodes: ShopifyGraphQLImage[];
  } | null;
  options?: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
  variants: {
    nodes: ShopifyGraphQLVariant[];
  };
}

export interface ShopifyProductsGraphQLResponse {
  data?: {
    products: {
      nodes: ShopifyGraphQLProductNode[];
      pageInfo: {
        hasNextPage: boolean;
        endCursor: string | null;
      };
    };
  };
  errors?: unknown[];
}

export interface ProductSyncResult {
  success: boolean;
  shop: string;
  storeId: string;
  totalSynced: number;
  created: number;
  updated: number;
  archivedOrDeleted: number;
  durationMs: number;
  message: string;
}

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(
    `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      cache: "no-store",
    }
  );

  const result = (await response.json()) as { data?: T; errors?: unknown[] };

  if (!response.ok) {
    throw new Error(
      `Shopify API returned HTTP ${response.status}: ${JSON.stringify(result)}`
    );
  }

  if (result.errors && Array.isArray(result.errors) && result.errors.length > 0) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  if (!result.data) {
    throw new Error("Shopify returned no data.");
  }

  return result.data;
}

/**
 * Fetch all Shopify products using cursor-based pagination
 */
export async function fetchAllShopifyProducts(
  shop: string,
  accessToken: string,
  pageSize = 100,
  maxPages = 100
): Promise<ShopifyGraphQLProductNode[]> {
  const allProducts: ShopifyGraphQLProductNode[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  let pageCount = 0;

  while (hasNextPage && pageCount < maxPages) {
    pageCount++;

    const data = await shopifyGraphQL<{
      products: {
        nodes: ShopifyGraphQLProductNode[];
        pageInfo: {
          hasNextPage: boolean;
          endCursor: string | null;
        };
      };
    }>(shop, accessToken, SHOPIFY_PRODUCTS_QUERY, {
      first: pageSize,
      after: cursor,
    });

    const pageProducts = data.products?.nodes || [];
    allProducts.push(...pageProducts);

    hasNextPage = Boolean(data.products?.pageInfo?.hasNextPage);
    cursor = data.products?.pageInfo?.endCursor || null;

    if (!cursor) {
      break;
    }
  }

  return allProducts;
}

/**
 * Synchronize Shopify products to Supabase (shopify_products and public.products mirror)
 */
export async function syncShopifyProducts(request: Request): Promise<ProductSyncResult> {
  const startTime = Date.now();

  // ---------------------------------------------------------
  // 1. Authenticate Shopify request
  // ---------------------------------------------------------
  const { shop, accessToken, scope } = await authenticateShopifyRequest(request);

  const supabase = getSupabaseAdmin();

  // ---------------------------------------------------------
  // 2. Validate merchant ownership & multi-tenant isolation
  // ---------------------------------------------------------
  let currentUserId: string | null = null;
  try {
    const serverSupabase = await createServerSupabase();
    const { data: authData } = await serverSupabase.auth.getUser();
    if (authData?.user?.id) {
      currentUserId = authData.user.id;
    }
  } catch {
    // Cookie session not available (e.g. non-browser context)
  }

  if (!currentUserId) {
    const customAuth = request.headers.get("x-supabase-auth");
    if (customAuth) {
      try {
        const { data: tokenUser } = await supabase.auth.getUser(customAuth);
        if (tokenUser?.user?.id) {
          currentUserId = tokenUser.user.id;
        }
      } catch {
        // invalid token
      }
    }
  }

  // Check if store already exists
  const { data: existingStore, error: lookupError } = await supabase
    .from("shopify_stores")
    .select("id, user_id, profile_id, shop_domain")
    .eq("shop_domain", shop)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Database error querying store: ${lookupError.message}`);
  }

  // Prevent cross-tenant store hijacking
  if (existingStore) {
    const existingOwnerId = existingStore.user_id || existingStore.profile_id;
    if (existingOwnerId && currentUserId && existingOwnerId !== currentUserId) {
      const forbiddenError = new Error(
        `Forbidden: This Shopify store (${shop}) is already connected to another Sales Pilot merchant account.`
      );
      (forbiddenError as any).statusCode = 403;
      throw forbiddenError;
    }
  }

  const resolvedUserId = currentUserId || existingStore?.user_id || null;
  const resolvedProfileId = currentUserId || existingStore?.profile_id || null;

  // ---------------------------------------------------------
  // 3. Save / update Shopify store record
  // ---------------------------------------------------------
  const { data: store, error: storeError } = await supabase
    .from("shopify_stores")
    .upsert(
      {
        shop_domain: shop,
        access_token: accessToken,
        scope,
        is_active: true,
        user_id: resolvedUserId,
        profile_id: resolvedProfileId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "shop_domain",
      }
    )
    .select("id, user_id, profile_id, shop_domain")
    .single();

  if (storeError) {
    throw new Error(`Failed to save Shopify store: ${storeError.message}`);
  }

  const effectiveUserId = store.user_id || store.profile_id || null;

  // ---------------------------------------------------------
  // 4. Fetch all products via GraphQL cursor-based pagination
  // ---------------------------------------------------------
  const products = await fetchAllShopifyProducts(shop, accessToken, 100);

  // ---------------------------------------------------------
  // 5. Query existing shopify_products for delta stats & cleanup
  // ---------------------------------------------------------
  const { data: existingShopifyProducts } = await supabase
    .from("shopify_products")
    .select("id, shopify_id, status")
    .eq("store_id", store.id);

  const existingShopifyIdMap = new Map<string, { id: string; status: string }>();
  if (existingShopifyProducts) {
    for (const p of existingShopifyProducts) {
      existingShopifyIdMap.set(p.shopify_id, { id: p.id, status: p.status });
    }
  }

  let createdCount = 0;
  let updatedCount = 0;
  const currentSyncedShopifyIds = new Set<string>();

  // ---------------------------------------------------------
  // 6. Upsert into shopify_products
  // ---------------------------------------------------------
  if (products.length > 0) {
    const productRows = products.map((product) => {
      currentSyncedShopifyIds.add(product.id);
      if (existingShopifyIdMap.has(product.id)) {
        updatedCount++;
      } else {
        createdCount++;
      }

      // Collect unified images array
      const rawImages: ShopifyGraphQLImage[] = [];
      if (product.featuredImage) {
        rawImages.push(product.featuredImage);
      }
      if (product.images?.nodes) {
        for (const img of product.images.nodes) {
          if (!rawImages.some((existing) => existing.url === img.url || existing.id === img.id)) {
            rawImages.push(img);
          }
        }
      }

      const formattedImages = rawImages.map((img) => ({
        id: img.id,
        src: img.url,
        url: img.url,
        altText: img.altText || null,
      }));

      return {
        store_id: store.id,
        shopify_id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        status: product.status,
        product_type: product.productType,
        vendor: product.vendor,
        data: {
          tags: product.tags || [],
          options: product.options || [],
          variants: product.variants?.nodes || [],
          images: formattedImages,
          featuredImage: product.featuredImage || formattedImages[0] || null,
          updatedAt: product.updatedAt,
        },
        updated_at: new Date().toISOString(),
      };
    });

    // Chunk upserts in batches of 100 for stability
    const BATCH_SIZE = 100;
    for (let i = 0; i < productRows.length; i += BATCH_SIZE) {
      const batch = productRows.slice(i, i + BATCH_SIZE);
      const { error: productsError } = await supabase
        .from("shopify_products")
        .upsert(batch, {
          onConflict: "store_id,shopify_id",
        });

      if (productsError) {
        throw new Error(`Failed to save shopify_products: ${productsError.message}`);
      }
    }
  }

  // ---------------------------------------------------------
  // 7. Handle deleted / removed products in shopify_products
  // ---------------------------------------------------------
  let archivedOrDeletedCount = 0;
  if (existingShopifyProducts) {
    const missingProductIds: string[] = [];
    for (const ep of existingShopifyProducts) {
      if (!currentSyncedShopifyIds.has(ep.shopify_id) && ep.status !== "DELETED") {
        missingProductIds.push(ep.shopify_id);
      }
    }

    if (missingProductIds.length > 0) {
      archivedOrDeletedCount = missingProductIds.length;
      await supabase
        .from("shopify_products")
        .update({
          status: "DELETED",
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", store.id)
        .in("shopify_id", missingProductIds);
    }
  }

  // ---------------------------------------------------------
  // 8. Mirror into public.products for search & AI assistant
  // ---------------------------------------------------------
  if (effectiveUserId && products.length > 0) {
    const publicProductRows = products.map((product) => {
      const firstVariant = product.variants?.nodes?.[0];
      const parsedPrice = firstVariant?.price ? parseFloat(firstVariant.price) : null;
      const isAvailable =
        product.status?.toUpperCase() === "ACTIVE" &&
        product.variants?.nodes?.some(
          (v) => v.availableForSale === true || (typeof v.inventoryQuantity === "number" && v.inventoryQuantity > 0)
        );

      const featuredImageUrl =
        product.featuredImage?.url ||
        product.images?.nodes?.[0]?.url ||
        null;

      const productUrl = product.handle ? `https://${shop}/products/${product.handle}` : null;
      const primarySku = firstVariant?.sku || null;
      const collections = product.productType ? [product.productType] : [];

      return {
        user_id: effectiveUserId,
        external_id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        price: isNaN(Number(parsedPrice)) ? null : parsedPrice,
        currency: null,
        available: isAvailable ?? true,
        image_url: featuredImageUrl,
        product_url: productUrl,
        sku: primarySku,
        collection_names: collections,
        collection_urls: [],
        source: "shopify",
        updated_at: new Date().toISOString(),
      };
    });

    // Perform batch upsert on public.products (idempotent, conflict target: user_id, external_id)
    const BATCH_SIZE = 100;
    for (let i = 0; i < publicProductRows.length; i += BATCH_SIZE) {
      const batch = publicProductRows.slice(i, i + BATCH_SIZE);
      const { error: upsertError } = await supabase
        .from("products")
        .upsert(batch, {
          onConflict: "user_id,external_id",
        });

      if (upsertError) {
        console.error("Failed to upsert public.products mirror:", upsertError);
      }
    }

    // If products were removed from Shopify, mark available=false in public.products
    if (existingShopifyProducts) {
      const removedExternalIds: string[] = [];
      for (const ep of existingShopifyProducts) {
        if (!currentSyncedShopifyIds.has(ep.shopify_id)) {
          removedExternalIds.push(ep.shopify_id);
        }
      }

      if (removedExternalIds.length > 0) {
        await supabase
          .from("products")
          .update({
            available: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", effectiveUserId)
          .eq("source", "shopify")
          .in("external_id", removedExternalIds);
      }
    }
  }

  // ---------------------------------------------------------
  // 9. Index product images for visual matching (async / non-blocking)
  // ---------------------------------------------------------
  for (const product of products) {
    upsertProductVisualIndex(
      supabase,
      {
        ...product,
        store_id: store.id,
      },
      {
        userId: effectiveUserId || undefined,
        storeId: store.id,
        source: "shopify",
      }
    ).catch((e) => {
      console.error("PRODUCT VISUAL INDEX ERROR:", e?.message || e);
    });
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    shop,
    storeId: store.id,
    totalSynced: products.length,
    created: createdCount,
    updated: updatedCount,
    archivedOrDeleted: archivedOrDeletedCount,
    durationMs,
    message: `Shopify product sync completed successfully in ${durationMs}ms. ${products.length} products processed (${createdCount} new, ${updatedCount} updated).`,
  };
}

