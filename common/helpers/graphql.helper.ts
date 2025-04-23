import type { GraphQLFormattedError } from "graphql";
import type { GraphQLResponse } from "../interfaces";

export function GraphQLResult<T>(
  result: { data?: T | null; errors?: readonly GraphQLFormattedError[] } | null,
): GraphQLResponse<T | null> {
  return {
    data: result?.data ?? null,
    errors: result?.errors,
  };
}

export function InternalError(error: any): GraphQLResponse<null> {
  return {
    data: null,
    errors: [
      {
        message: error?.message || "Unexpected error occurred",
        extensions: {
          code: "EXCEPTION",
        },
      },
    ],
  };
}
