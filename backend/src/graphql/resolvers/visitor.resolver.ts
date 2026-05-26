import mongoose from 'mongoose';
import { VisitorService } from '../../modules/visitor/visitor.service';

export const visitorResolvers = {
  Query: {
    getVisitors: async (_: any, args: any, context: any) => {
      const { user, tenantId } = context;
      
      if (!user || !tenantId) {
        throw new Error('Unauthorized');
      }

      // If user is STAFF, restrict query to only their visitors
      const queryParams = { ...args };
      if (user.role === 'STAFF') {
        queryParams.hostId = user.id;
      }

      const result = await VisitorService.getVisitors(queryParams, new mongoose.Types.ObjectId(tenantId as string));
      
      // Map Mongoose _id to GraphQL id, and convert dates to ISO strings
      return {
        visitors: result.data.map((v: any) => {
          const doc = v.toObject ? v.toObject() : v;
          return {
            ...doc,
            id: doc._id.toString(),
            _id: doc._id.toString(),
            tenantId: doc.tenantId?.toString() || tenantId,
            hostId: doc.hostId?._id?.toString() || doc.hostId?.toString(),
            createdAt: doc.createdAt?.toISOString(),
            updatedAt: doc.updatedAt?.toISOString(),
            visitTime: doc.visitTime?.toISOString(),
            approvedAt: doc.approvedAt?.toISOString(),
            expectedCheckout: doc.expectedCheckout?.toISOString(),
            startDate: doc.startDate?.toISOString(),
            endDate: doc.endDate?.toISOString(),
            checkInTime: doc.checkInTime?.toISOString(),
            checkOutTime: doc.checkOutTime?.toISOString(),
            meetInTime: doc.meetInTime?.toISOString(),
            meetOutTime: doc.meetOutTime?.toISOString(),
            consentTimestamp: doc.consentTimestamp?.toISOString(),
            visitorSignature: doc.visitorSignature ? {
              ...doc.visitorSignature,
              signedAt: doc.visitorSignature.signedAt?.toISOString()
            } : null,
            guardSignature: doc.guardSignature ? {
              ...doc.guardSignature,
              signedAt: doc.guardSignature.signedAt?.toISOString()
            } : null,
            hostSignature: doc.hostSignature ? {
              ...doc.hostSignature,
              signedAt: doc.hostSignature.signedAt?.toISOString()
            } : null,
          };
        }),
        total: result.pagination.total,
        page: result.pagination.page,
        totalPages: result.pagination.pages
      };
    },

    getVisitor: async (_: any, { id }: { id: string }, context: any) => {
      const { user, tenantId } = context;
      
      if (!user || !tenantId) {
        throw new Error('Unauthorized');
      }

      const v = await VisitorService.getById(id, new mongoose.Types.ObjectId(tenantId as string));
      if (!v) return null;

      // Restrict STAFF from viewing others' visitors
      if (user.role === 'STAFF' && v.hostId?.toString() !== user.id) {
        throw new Error('Forbidden');
      }

      const doc = v.toObject ? v.toObject() : v;
      return {
        ...doc,
        id: doc._id.toString(),
        _id: doc._id.toString(),
        tenantId: doc.tenantId?.toString() || tenantId,
        hostId: doc.hostId?._id?.toString() || doc.hostId?.toString(),
        createdAt: doc.createdAt?.toISOString(),
        updatedAt: doc.updatedAt?.toISOString(),
        visitTime: doc.visitTime?.toISOString(),
        approvedAt: doc.approvedAt?.toISOString(),
        expectedCheckout: doc.expectedCheckout?.toISOString(),
        startDate: doc.startDate?.toISOString(),
        endDate: doc.endDate?.toISOString(),
        checkInTime: doc.checkInTime?.toISOString(),
        checkOutTime: doc.checkOutTime?.toISOString(),
        meetInTime: doc.meetInTime?.toISOString(),
        meetOutTime: doc.meetOutTime?.toISOString(),
        consentTimestamp: doc.consentTimestamp?.toISOString(),
        visitorSignature: doc.visitorSignature ? {
          ...doc.visitorSignature,
          signedAt: doc.visitorSignature.signedAt?.toISOString()
        } : null,
        guardSignature: doc.guardSignature ? {
          ...doc.guardSignature,
          signedAt: doc.guardSignature.signedAt?.toISOString()
        } : null,
        hostSignature: doc.hostSignature ? {
          ...doc.hostSignature,
          signedAt: doc.hostSignature.signedAt?.toISOString()
        } : null,
      };
    }
  }
};
