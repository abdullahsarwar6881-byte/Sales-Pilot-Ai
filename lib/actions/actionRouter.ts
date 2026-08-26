import {
  ActionName,
  ActionResult,
} from "./types";

import {
  searchProducts,
} from "./searchProducts";

import {
  getOrder,
} from "./getOrder";

// =====================================================
// EXECUTE ACTION
// =====================================================

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

  switch (
    action
  ) {
    // =================================================
    // SEARCH PRODUCTS
    // =================================================

    case "search_products": {
      const profileId =
        parameters.profileId;

      const query =
        parameters.query;

      if (
        typeof profileId !==
          "string" ||
        !profileId.trim()
      ) {
        return {
          success: false,

          error:
            "Profile information is missing.",
        };
      }

      if (
        typeof query !==
          "string" ||
        !query.trim()
      ) {
        return {
          success: false,

          error:
            "Product search query is missing.",
        };
      }

      try {
        const products =
          await searchProducts(
            profileId,
            query
          );

        return {
          success: true,

          data: {
            products,
            query,
          },
        };
      } catch (
        error: any
      ) {
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

    // =================================================
    // ORDER STATUS
    // =================================================

    case "get_order_status": {
      const profileId =
        parameters.profileId;

      const orderNumber =
        parameters.orderNumber;

      if (
        typeof profileId !==
          "string" ||
        !profileId.trim()
      ) {
        return {
          success: false,

          error:
            "Profile information is missing.",
        };
      }

      if (
        typeof orderNumber !==
          "string" ||
        !orderNumber.trim()
      ) {
        return {
          success: false,

          error:
            "Please provide your order number, for example #1001.",
        };
      }

      try {
        const order =
          await getOrder(
            profileId,
            orderNumber
          );

        if (!order) {
          return {
            success: true,

            data: {
              found: false,

              orderNumber,
            },
          };
        }

        return {
          success: true,

          data: {
            found: true,

            order,
          },
        };
      } catch (
        error: any
      ) {
        console.error(
          "ORDER STATUS ERROR:",
          error
        );

        return {
          success: false,

          error:
            error?.message ||
            "Unable to retrieve your order status.",
        };
      }
    }

    // =================================================
    // ORDER DETAILS
    // =================================================

    case "get_order_details": {
      const profileId =
        parameters.profileId;

      const orderNumber =
        parameters.orderNumber;

      if (
        typeof profileId !==
          "string" ||
        !profileId.trim()
      ) {
        return {
          success: false,

          error:
            "Profile information is missing.",
        };
      }

      if (
        typeof orderNumber !==
          "string" ||
        !orderNumber.trim()
      ) {
        return {
          success: false,

          error:
            "Please provide your order number, for example #1001.",
        };
      }

      try {
        const order =
          await getOrder(
            profileId,
            orderNumber
          );

        if (!order) {
          return {
            success: true,

            data: {
              found: false,

              orderNumber,
            },
          };
        }

        return {
          success: true,

          data: {
            found: true,

            order,
          },
        };
      } catch (
        error: any
      ) {
        console.error(
          "ORDER DETAILS ERROR:",
          error
        );

        return {
          success: false,

          error:
            error?.message ||
            "Unable to retrieve your order details.",
        };
      }
    }

    // =================================================
    // PRODUCT STOCK
    // =================================================

    case "check_product_stock":
      return {
        success: false,

        error:
          "Product inventory is not connected yet.",
      };

    // =================================================
    // PRODUCT DETAILS
    // =================================================

    case "get_product_details":
      return {
        success: false,

        error:
          "Product details are not connected yet.",
      };

    // =================================================
    // SHIPPING POLICY
    // =================================================

    case "get_shipping_policy":
      return {
        success: false,

        error:
          "Shipping policy action is not connected yet.",
      };

    // =================================================
    // RETURN POLICY
    // =================================================

    case "get_return_policy":
      return {
        success: false,

        error:
          "Return policy action is not connected yet.",
      };

    // =================================================
    // HUMAN HANDOFF
    // =================================================

    case "handoff_to_human":
      return {
        success: true,

        data: {
          status:
            "handoff_requested",
        },
      };

    // =================================================
    // UNKNOWN
    // =================================================

    default:
      return {
        success: false,

        error:
          "Action is not allowed.",
      };
  }
}