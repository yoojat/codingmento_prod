import type { ReactNode } from "react";
import type {
  LinksFunction as RouterLinksFunction,
  ShouldRevalidateFunctionArgs,
} from "react-router";

export namespace Route {
  export interface LinksFunction extends RouterLinksFunction {}

  export interface ErrorBoundaryProps {
    error: unknown;
    children?: ReactNode;
  }

  export interface ShouldRevalidateFunction {
    (args: ShouldRevalidateFunctionArgs): boolean;
  }
}
