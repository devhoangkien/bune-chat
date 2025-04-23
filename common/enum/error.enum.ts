export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}


export enum MessageCode {
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
}

export const MessageCodeText: {
  [key in MessageCode]: string
} = {
  [MessageCode.INVALID_CREDENTIALS]: "Invalid credentials!",
};
