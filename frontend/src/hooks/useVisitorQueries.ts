import { gql } from '@apollo/client';
import { useLazyQuery } from '@apollo/client/react';
import { Visitor } from '../../components/guard/types';

export const GET_VISITORS_QUERY = gql`
  query GetVisitors($search: String, $limit: Int) {
    getVisitors(search: $search, limit: $limit) {
      visitors {
        _id
        name
        phone
        email
        company
        purpose
        hostName
        status
        photoUrl
        updatedAt
        createdAt
        approvedAt
        checkInTime
        checkOutTime
        meetInTime
        meetOutTime
        expectedCheckout
        requestedDuration
        idProofType
        idProofNumber
        idProofPhotoUrl
        aadhaarVerified
        maskedAadhaar
        aadhaarImageUrl
        hostRemark
        processedBy
        hostId
      }
      total
    }
  }
`;

export const GET_VISITOR_QUERY = gql`
  query GetVisitor($id: ID!) {
    getVisitor(id: $id) {
      _id
      name
      phone
      email
      company
      purpose
      hostName
      status
      photoUrl
      updatedAt
      createdAt
      approvedAt
      checkInTime
      checkOutTime
      meetInTime
      meetOutTime
      expectedCheckout
      requestedDuration
      idProofType
      idProofNumber
      idProofPhotoUrl
      aadhaarVerified
      maskedAadhaar
      aadhaarImageUrl
      hostRemark
      processedBy
      hostId
    }
  }
`;

export interface GetVisitorsResponse {
  getVisitors: {
    visitors: Visitor[];
    total: number;
  };
}

export interface GetVisitorsVariables {
  search?: string;
  limit?: number;
}

export interface GetVisitorResponse {
  getVisitor: Visitor;
}

export interface GetVisitorVariables {
  id: string;
}

export function useVisitorQueries() {
  const [getVisitorsGql] = useLazyQuery<GetVisitorsResponse, GetVisitorsVariables>(GET_VISITORS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [getVisitorGql] = useLazyQuery<GetVisitorResponse, GetVisitorVariables>(GET_VISITOR_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const [searchRevisitorsGql] = useLazyQuery<GetVisitorsResponse, GetVisitorsVariables>(GET_VISITORS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  return {
    getVisitorsGql,
    getVisitorGql,
    searchRevisitorsGql,
  };
}
