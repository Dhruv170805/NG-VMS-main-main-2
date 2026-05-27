'use client';

import React from 'react';
import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
} from '@apollo/client';
import { ApolloProvider } from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';
import { API_CONFIG } from '@/app/config';

// Resolve GraphQL endpoint from API_BASE_URL
const graphqlUrl = `${API_CONFIG.BASE_URL.replace('/api/v1', '')}/api/graphql`;

const httpLink = createHttpLink({
  uri: graphqlUrl,
  credentials: 'include', // Ensure HttpOnly cookies are sent with requests
});

const authLink = setContext((_, { headers }) => {
  const tenantId = typeof window !== 'undefined' ? (localStorage.getItem('vms_tenant_id') || '') : '';
  
  // return the headers to the context so httpLink can read them
  return {
    headers: {
      ...headers,
      'x-tenant-id': tenantId,
    }
  }
});

const client = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache(),
});

export function ApolloWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
