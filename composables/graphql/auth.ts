export const mutationlLogin = gql`
    mutation login($input: LoginUserInput!) {
      login(input: $input) {
        accessToken
        refreshToken
        userId
      }
    }
  `;

export const queryCheckUserExists = gql`
  query CheckUserExists($data: CheckUserExistDto!) {
    checkUserExists(data: $data)
  }
`;
