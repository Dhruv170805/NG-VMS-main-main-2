export const visitorTypeDefs = `#graphql
  type Signature {
    signed: Boolean
    signedBy: String
    signedAt: String
    signatureHash: String
  }

  type Visitor {
    id: ID!
    _id: ID!
    tenantId: ID!
    name: String!
    email: String!
    phone: String!
    company: String
    purpose: String!
    hostId: ID
    hostName: String!
    status: String!
    approvalLevel: String!
    visitTime: String
    requestedDuration: String
    approvedAt: String
    expectedCheckout: String
    photoUrl: String
    qrCode: String
    startDate: String
    endDate: String
    checkInTime: String
    checkOutTime: String
    meetInTime: String
    meetOutTime: String
    idProofType: String
    idProofNumber: String
    idProofPhotoUrl: String
    idNumberHash: String
    aadhaarVerified: Boolean
    maskedAadhaar: String
    aadhaarImageUrl: String
    encryptedIdProofPreview: String
    hostRemark: String
    processedBy: String
    consentGiven: Boolean
    consentTimestamp: String
    visitorSignature: Signature
    guardSignature: Signature
    hostSignature: Signature
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    getVisitors(
      status: String
      search: String
      startDate: String
      endDate: String
      hostId: ID
      page: Int
      limit: Int
    ): VisitorConnection!
    
    getVisitor(id: ID!): Visitor
  }

  type VisitorConnection {
    visitors: [Visitor!]!
    total: Int!
    page: Int!
    totalPages: Int!
  }
`;
