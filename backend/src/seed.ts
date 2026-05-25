import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Employee from './models/Employee';
import Blacklist from './models/Blacklist';
import Tenant from './models/Tenant';

dotenv.config();

const seedUsers = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ng-vms';
    await mongoose.connect(MONGODB_URI);
    console.log('connected to mongodb...');

    // Clear existing
    await Tenant.deleteMany({});
    await Employee.deleteMany({});
    await Blacklist.deleteMany({});

    // Create Default Tenant
    // License features: Email: true, SMS: false, Aadhaar: true
    const license = Buffer.from(JSON.stringify({
      companyCode: 'demo',
      companyName: 'VMS Enterprise',
      features: { email: true, sms: false, aadhaar: true },
      expiresAt: '2027-12-31',
      status: 'ACTIVE'
    })).toString('base64');

    const defaultTenant = await Tenant.create({
      name: 'VMS Enterprise',
      subdomain: 'demo',
      licenseKey: license,
      logoUrl: 'https://vms-demo.com/logo.png'
    });

    console.log(`Tenant created: ${defaultTenant.name} (${defaultTenant.subdomain})`);

    const salt = await bcrypt.genSalt(10);

    const users = [
      {
        tenantId: defaultTenant._id,
        name: 'Super Admin',
        email: 'admin@vms.com',
        password: await bcrypt.hash('Admin@123', salt),
        department: 'IT Security',
        role: 'ADMIN',
        isAvailable: true
      },
      {
        tenantId: defaultTenant._id,
        name: 'Security Guard 01',
        email: 'guard01@vms.com',
        password: await bcrypt.hash('Guard@123', salt),
        department: 'Main Gate',
        role: 'GUARD',
        isAvailable: true
      },
      {
        tenantId: defaultTenant._id,
        name: 'Ankit Sharma',
        email: 'ankit@vms.com',
        password: await bcrypt.hash('Welcome@123', salt),
        department: 'Product Design',
        role: 'STAFF',
        isAvailable: true,
        isHost: true
      }
    ];

    await Employee.insertMany(users);

    // Seed sample blacklist
    const sampleIdNumber = "123456789012"; 
    const hash = crypto.createHash('sha256').update(sampleIdNumber).digest('hex');
    await Blacklist.create({
       tenantId: defaultTenant._id,
       idNumberHash: hash,
       name: 'Suspicious Individual',
       reason: 'Security Protocol Violation: Previous unauthorized access attempt.',
       active: true
    });

    console.log('Success: Test credentials & blacklist seeded successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedUsers();
