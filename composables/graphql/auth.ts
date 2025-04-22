export const mutationlLogin = gql`
    mutation login($input: LoginUserInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        userId
      }
    }
  `;
