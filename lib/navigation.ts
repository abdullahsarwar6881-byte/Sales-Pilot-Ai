import {
  LayoutDashboard,
  MessageSquare,
  Database,
  Paintbrush,
  Settings,
  CreditCard,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Conversations",
    href: "/dashboard/conversations",
    icon: MessageSquare,
  },
  {
    title: "Knowledge Base",
    href: "/dashboard/knowledge",
    icon: Database,
  },
  {
    title: "Widget Studio",
    href: "/dashboard/widget",
    icon: Paintbrush,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Billing",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
];