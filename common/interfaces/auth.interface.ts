export interface ILoginResponse {
  login: {
    accessToken: string;
    refreshToken: string;
    userId: string;
    email: string;
    avatar: string;
    __typename: string;
  };
}
