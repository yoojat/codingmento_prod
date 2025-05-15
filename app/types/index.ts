import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";

export namespace Route {
  export interface LoaderArgs extends LoaderFunctionArgs {}
  export interface ActionArgs extends ActionFunctionArgs {}

  export interface ComponentProps<
    TLoaderData = unknown,
    TActionData = unknown
  > {
    loaderData: TLoaderData;
    actionData: TActionData;
  }
}
