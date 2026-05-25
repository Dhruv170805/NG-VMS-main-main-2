import mongoose from 'mongoose';
import Visitor from '../../models/Visitor';
import VisitorLog from '../../models/VisitorLog';

export class AnalyticsService {
  static async getVisitorTraffic(days: number, tenantId: mongoose.Types.ObjectId) {
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const traffic = await Visitor.aggregate([
      { $match: { createdAt: { $gte: dateLimit }, tenantId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const filledTraffic = [];
    for (let i = 0; i <= days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - i));
      const dateStr = d.toISOString().split('T')[0];
      const match = traffic.find(t => t._id === dateStr);
      filledTraffic.push({ _id: dateStr, count: match ? match.count : 0 });
    }

    return filledTraffic;
  }

  static async getPurposeDistribution(tenantId: mongoose.Types.ObjectId) {
    return await Visitor.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: "$purpose",
          count: { $sum: 1 }
        }
      },
      { $sort: { "count": -1 } }
    ]);
  }

  static async getHostDistribution(tenantId: mongoose.Types.ObjectId) {
    return await Visitor.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: "$hostName",
          count: { $sum: 1 }
        }
      },
      { $sort: { "count": -1 } },
      { $limit: 10 }
    ]);
  }

  static async getShiftSummary(start: string | undefined, tenantId: mongoose.Types.ObjectId) {
    const startDate = start ? new Date(start) : new Date(new Date().setHours(0, 0, 0, 0));

    const stats = await VisitorLog.aggregate([
      { $match: { createdAt: { $gte: startDate }, tenantId } },
      {
        $group: {
          _id: "$event",
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      GATE_IN: 0,
      GATE_OUT: 0,
      DENIED: 0
    };

    stats.forEach((s: any) => {
      if (s._id === 'GATE_IN') summary.GATE_IN = s.count;
      if (s._id === 'GATE_OUT') summary.GATE_OUT = s.count;
      if (s._id === 'DENIED_BLACKLIST' || s._id === 'ERROR') summary.DENIED += s.count;
    });

    return summary;
  }

  static async getHourlyDensity(tenantId: mongoose.Types.ObjectId) {
    const density = await Visitor.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    return Array.from({ length: 24 }, (_, i) => {
      const match = density.find(d => d._id === i);
      return { hour: `${i}:00`, count: match ? match.count : 0 };
    });
  }

  static async getDayOfWeekDistribution(tenantId: mongoose.Types.ObjectId) {
    const distribution = await Visitor.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.map((day, i) => {
      const match = distribution.find(d => d._id === i + 1);
      return { day, count: match ? match.count : 0 };
    });
  }

  static async getStatusDistribution(tenantId: mongoose.Types.ObjectId) {
    return await Visitor.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      { $sort: { "count": -1 } }
    ]);
  }

  static async getSystemOverview(tenantId: mongoose.Types.ObjectId) {
    // Optimization: Use $facet to get all key metrics in one query
    const overview = await Visitor.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          statusDistribution: [
            { $group: { _id: "$status", count: { $sum: 1 } } }
          ],
          totalVisitors: [
            { $count: "count" }
          ],
          todaysVisitors: [
            { $match: { createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } } },
            { $count: "count" }
          ]
        }
      }
    ]);
    return overview[0];
  }
}
