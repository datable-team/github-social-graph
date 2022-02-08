import { ApolloClient, InMemoryCache } from '@apollo/client/core'

const ACCESS_TOKEN = "Your access token" // Get from https://github.com/settings/tokens

export const apolloClient = new ApolloClient({
  uri: 'https://api.github.com/graphql',
  cache: new InMemoryCache(),
  headers: {
  //  Authorization: `Bearer ${ACCESS_TOKEN}`,
  }
})
