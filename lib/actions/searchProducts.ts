import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ProductSearchResult {
  id: string;
  name: string;
  url: string;
  description: string;
  price?: string;
}

// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// =====================================================
// NORMALIZE SEARCH WORD
// =====================================================

function normalizeSearchWord(word: string) {
  let normalized = normalizeText(word);

  if (
    normalized.endsWith("ies") &&
    normalized.length > 4
  ) {
    normalized =
      normalized.slice(0, -3) + "y";
  } else if (
    normalized.endsWith("es") &&
    normalized.length > 4
  ) {
    normalized =
      normalized.slice(0, -2);
  } else if (
    normalized.endsWith("s") &&
    normalized.length > 3
  ) {
    normalized =
      normalized.slice(0, -1);
  }

  return normalized;
}

// =====================================================
// GET SEARCH WORDS
// =====================================================

function getSearchWords(query: string) {
  const ignoredWords = new Set([
    "show",
    "me",
    "find",
    "get",
    "give",
    "the",
    "a",
    "an",
    "some",
    "please",
    "i",
    "want",
    "need",
    "looking",
    "for",
    "can",
    "you",
    "recommend",
    "something",
    "products",
    "product",
    "what",
    "which",
    "do",
    "have",
    "is",
    "are",
    "there",
    "any",
    "sell",
    "available",
    "to",
    "buy",
    "your",
    "we",
    "offer",
    "offers",
    "price",
    "cost",
    "much",
    "it",
    "its",
    "this",
    "that",
  ]);

  return normalizeText(query)
    .split(" ")
    .map(normalizeSearchWord)
    .filter(
      (word) =>
        word.length >= 2 &&
        !ignoredWords.has(word)
    );
}

// =====================================================
// BROAD PRODUCT SEARCH
// =====================================================

function isBroadProductSearch(
  query: string
) {
  const text =
    normalizeText(query);

  const broadPhrases = [
    "which products",
    "what products",
    "what do you sell",
    "products do you have",
    "what products do you have",
    "which products do you have",
    "what can i buy",
    "what can i purchase",
    "show me products",
    "show products",
    "available products",
    "all products",
    "browse products",
    "browse",
    "shop",
  ];

  return broadPhrases.some(
    (phrase) =>
      text.includes(phrase)
  );
}

// =====================================================
// EXTRACT PRICE
// =====================================================

function extractPrice(
  content: string
) {
  if (!content) {
    return undefined;
  }

  const pricePatterns = [
    /\$\s?\d+(?:\.\d{1,2})?/,
    /USD\s?\d+(?:\.\d{1,2})?/i,
    /€\s?\d+(?:\.\d{1,2})?/,
    /£\s?\d+(?:\.\d{1,2})?/,
  ];

  for (
    const pattern of pricePatterns
  ) {
    const match =
      content.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return undefined;
}

// =====================================================
// CLEAN DESCRIPTION
// =====================================================

function cleanDescription(
  content: string,
  title: string
) {
  if (!content) {
    return "";
  }

  let description =
    content.trim();

  // Remove the product title
  if (title) {
    description =
      description.replace(
        new RegExp(
          title.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          ),
          "gi"
        ),
        ""
      );
  }

  // Remove URLs
  description =
    description.replace(
      /https?:\/\/\S+/gi,
      ""
    );

  // Remove excessive whitespace
  description =
    description
      .replace(/\s+/g, " ")
      .trim();

  // Keep response short
  if (
    description.length > 220
  ) {
    description =
      description.slice(0, 220)
        .trim() + "...";
  }

  return description;
}

// =====================================================
// CONVERT DATABASE PRODUCT
// =====================================================

function formatProduct(
  product: any
): ProductSearchResult {
  const title =
    product.title ||
    "Unnamed Product";

  return {
    id: product.id,

    name: title,

    url:
      product.page_url ||
      "",

    description:
      cleanDescription(
        product.content || "",
        title
      ),

    price:
      extractPrice(
        product.content || ""
      ),
  };
}

// =====================================================
// SEARCH PRODUCTS
// =====================================================

export async function searchProducts(
  profileId: string,
  query: string
): Promise<ProductSearchResult[]> {
  console.log(
    "================================="
  );

  console.log(
    "SEARCH PRODUCTS ACTION"
  );

  console.log(
    "PROFILE ID:",
    profileId
  );

  console.log(
    "QUERY:",
    query
  );

  console.log(
    "================================="
  );

  // =================================================
  // VALIDATION
  // =================================================

  if (
    !profileId ||
    !query
  ) {
    console.log(
      "PROFILE ID OR QUERY MISSING"
    );

    return [];
  }

  // =================================================
  // GET PRODUCT PAGES
  // =================================================

  const {
    data: products,
    error,
  } = await supabaseAdmin
    .from(
      "knowledge_pages"
    )
    .select(
      "id, user_id, title, page_url, content, page_type"
    )
    .eq(
      "user_id",
      profileId
    )
    .eq(
      "page_type",
      "product"
    )
    .limit(100);

  // =================================================
  // DATABASE ERROR
  // =================================================

  if (error) {
    console.error(
      "PRODUCT DATABASE ERROR:",
      error
    );

    throw error;
  }

  // =================================================
  // NO PRODUCTS
  // =================================================

  if (
    !products ||
    products.length === 0
  ) {
    console.log(
      "NO PRODUCT PAGES FOUND"
    );

    return [];
  }

  console.log(
    "PRODUCT PAGES FOUND:",
    products.length
  );

  // =================================================
  // BROAD SEARCH
  // =================================================

  const broadSearch =
    isBroadProductSearch(
      query
    );

  const searchWords =
    getSearchWords(query);

  console.log(
    "SEARCH WORDS:",
    searchWords
  );

  // =================================================
  // BROAD PRODUCT LIST
  // =================================================

  if (
    broadSearch ||
    searchWords.length === 0
  ) {
    console.log(
      "BROAD PRODUCT SEARCH"
    );

    return products
      .slice(0, 6)
      .map(formatProduct);
  }

  // =================================================
  // SCORE PRODUCTS
  // =================================================

  const normalizedQuery =
    normalizeText(query);

  const scored =
    products.map(
      (product) => {
        const title =
          normalizeText(
            product.title || ""
          );

        const content =
          normalizeText(
            product.content || ""
          );

        let score = 0;

        // -------------------------------------------------
        // FULL TITLE MATCH
        // -------------------------------------------------

        if (
          normalizedQuery.includes(
            title
          ) &&
          title.length > 3
        ) {
          score += 100;
        }

        // -------------------------------------------------
        // SEARCH WORDS
        // -------------------------------------------------

        for (
          const word of searchWords
        ) {
          // Exact title word
          const titleWords =
            title.split(" ");

          if (
            titleWords.includes(
              word
            )
          ) {
            score += 50;

            console.log(
              `STRONG TITLE MATCH: ${word} -> ${product.title}`
            );
          }

          // Title contains word
          else if (
            title.includes(word)
          ) {
            score += 35;

            console.log(
              `TITLE MATCH: ${word} -> ${product.title}`
            );
          }

          // Content match
          if (
            content.includes(word)
          ) {
            score += 3;
          }
        }

        // -------------------------------------------------
        // CATEGORY BOOSTS
        // -------------------------------------------------

        const queryText =
          normalizedQuery;

        if (
          queryText.includes(
            "shirt"
          ) &&
          (
            title.includes(
              "shirt"
            ) ||
            title.includes(
              "t shirt"
            )
          )
        ) {
          score += 100;
        }

        if (
          queryText.includes(
            "hoodie"
          ) &&
          title.includes(
            "hoodie"
          )
        ) {
          score += 100;
        }

        if (
          queryText.includes(
            "shoe"
          ) &&
          title.includes(
            "shoe"
          )
        ) {
          score += 100;
        }

        if (
          queryText.includes(
            "jacket"
          ) &&
          title.includes(
            "jacket"
          )
        ) {
          score += 100;
        }

        if (
          queryText.includes(
            "cap"
          ) &&
          title.includes(
            "cap"
          )
        ) {
          score += 100;
        }

        return {
          product,
          score,
        };
      }
    );

  // =================================================
  // SORT
  // =================================================

  scored.sort(
    (a, b) =>
      b.score - a.score
  );

  console.log(
    "PRODUCT SCORES:"
  );

  console.log(
    scored.map(
      (item) => ({
        title:
          item.product.title,

        score:
          item.score,
      })
    )
  );

  // =================================================
  // MATCHING PRODUCTS
  // =================================================

  const results =
    scored
      .filter(
        (item) =>
          item.score > 0
      )
      .slice(0, 4);

  console.log(
    "MATCHING PRODUCTS:",
    results.length
  );

  // =================================================
  // RETURN PRODUCTS
  // =================================================

  return results.map(
    ({ product }) =>
      formatProduct(product)
  );
}