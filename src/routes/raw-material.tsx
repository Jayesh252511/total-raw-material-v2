import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/raw-material")({
  component: () => <Navigate to="/pc-entries" replace />,
});
