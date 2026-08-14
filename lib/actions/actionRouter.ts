import {
  ActionName,
  ActionResult,
} from "./types";

import {
  searchProducts,
} from "./searchProducts";

export async function executeAction(
  action: ActionName,
  parameters: Record<string, unknown>
): Promise<ActionResult> {
  console.log(
    "================================="
  );

  console.log(
    "EXECUTING ACTION:",
    action
  );

  console.log(
    "PARAMETERS:",
    parameters
  );

  console.log(
    "================================="
  );

  switch (action) {
    // --------------------------------
    // SEARCH PRODUCTS
    // --------------------------------

    case "search_products": {
      const profileId =
        parameters.profileId;

      const query =
        parameters.query;

      // --------------------------------
      // VALIDATE PROFILE ID
      // --------------------------------

      if (
        typeof profileId !== "string" ||
        !profileId.trim()
      ) {
        console.error(
          "PRODUCT SEARCH FAILED: PROFILE ID MISSING"
        );

        return {
          success: false,
          error:
            "Profile information is missing.",
        };
      }

      // --------------------------------
      // VALIDATE QUERY
      // --------------------------------

      if (
        typeof query !== "string" ||
        !query.trim()
      ) {
        console.error(
          "PRODUCT SEARCH FAILED: QUERY MISSING"
        );

        return {
          success: false,
          error:
            "Product search query is missing.",
        };
      }

      console.log(
        "USING PROFILE ID:",
        profileId
      );

      console.log(
        "SEARCH QUERY:",
        query
      );

      // --------------------------------
      // SEARCH PRODUCTS
      // --------------------------------

      try {
        const products =
          await searchProducts(
            profileId,
            query
          );

        console.log(
          "================================="
        );

        console.log(
          "PRODUCT SEARCH COMPLETED"
        );

        console.log(
          "PRODUCTS FOUND:",
          products.length
        );

        console.log(
          "PRODUCTS:",
          products
        );

        console.log(
          "================================="
        );

        // --------------------------------
        // NO PRODUCTS
        // --------------------------------

        if (
          products.length === 0
        ) {
          return {
            success: true,

            data: {
              products: [],
              query,
            },
          };
        }

        // --------------------------------
        // PRODUCTS FOUND
        // --------------------------------

        return {
          success: true,

          data: {
            products,
            query,
          },
        };
      } catch (error: any) {
        console.error(
          "PRODUCT SEARCH ERROR:",
          error
        );

        return {
          success: false,

          error:
            error?.message ||
            "Unable to search products.",
        };
      }
    }

    // --------------------------------
    // ORDER STATUS
    // --------------------------------

    case "get_order_status":
      return {
        success: false,

        error:
          "Order status is not connected yet.",
      };

    // --------------------------------
    // ORDER DETAILS
    // --------------------------------

    case "get_order_details":
      return {
        success: false,

        error:
          "Order details are not connected yet.",
      };

    // --------------------------------
    // PRODUCT STOCK
    // --------------------------------

    case "check_product_stock":
      return {
        success: false,

        error:
          "Product inventory is not connected yet.",
      };

    // --------------------------------
    // PRODUCT DETAILS
    // --------------------------------

    case "get_product_details":
      return {
        success: false,

        error:
          "Product details are not connected yet.",
      };

    // --------------------------------
    // SHIPPING POLICY
    // --------------------------------

    case "get_shipping_policy":
      return {
        success: false,

        error:
          "Shipping policy action is not connected yet.",
      };

    // --------------------------------
    // RETURN POLICY
    // --------------------------------

    case "get_return_policy":
      return {
        success: false,

        error:
          "Return policy action is not connected yet.",
      };

    // --------------------------------
    // HUMAN HANDOFF
    // --------------------------------

    case "handoff_to_human":
      return {
        success: true,

        data: {
          status:
            "handoff_requested",
        },
      };

    // --------------------------------
    // UNKNOWN ACTION
    // --------------------------------

    default:
      return {
        success: false,

        error:
          "Action is not allowed.",
      };
  }
}