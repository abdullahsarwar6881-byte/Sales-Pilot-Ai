export type ActionName =
  | "search_products"
  | "get_product_details"
  | "check_product_stock"
  | "get_order_status"
  | "get_order_details"
  | "get_shipping_policy"
  | "get_return_policy"
  | "handoff_to_human";

export interface ActionRequest {
  action: ActionName;

  parameters: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;

  data?: unknown;

  error?: string;
}