import { redirect } from "react-router";
import type { Route } from "./+types/product-redirect-page";

export const loader = ({ params }: Route.LoaderArgs) => {
  return redirect(`/wemake/products/${params.productId}/overview`);
};
