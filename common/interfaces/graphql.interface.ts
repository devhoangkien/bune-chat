import type { GraphQLFormattedError } from "graphql";


export interface GraphQLResponse<T> {
  data: T | null;
  errors?: readonly GraphQLFormattedError[];
}
