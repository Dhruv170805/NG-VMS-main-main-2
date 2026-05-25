import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Tenant from '../../models/Tenant';
import Employee from '../../models/Employee';
import { AuthService } from '../../modules/auth/auth.service';

const TEST_MONGO_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ng-vms-integration-tests?directConnection=true';

export let testTenant: any;
export let testEmployee: any;
export let adminToken: string;

export async function setupIntegration() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }

  // Clear existing data
  await Tenant.deleteMany({});
  await Employee.deleteMany({});
  await mongoose.model('Visitor').deleteMany({});

  // Seed active license
  const licensePayload = {
    companyName: 'Print Electronics',
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // 1 year
    features: {
      email: true,
      sms: true,
      aadhaar: true,
      storage: 'local'
    }
  };
  const licenseKey = Buffer.from(JSON.stringify(licensePayload)).toString('base64');

  // Seed Tenant
  testTenant = await Tenant.create({
    name: 'Test Tenant',
    subdomain: 'test',
    licenseKey
  });

  // Seed Admin Employee
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123!', salt);

  testEmployee = await Employee.create({
    name: 'Test Admin',
    email: 'admin@test.com',
    password: hashedPassword,
    role: 'ADMIN',
    department: 'IT',
    tenantId: testTenant._id,
    requiresPasswordChange: false
  });

  // Generate tokens
  const tokens = await AuthService.generateTokens(
    testEmployee._id.toString(),
    testEmployee.name,
    testEmployee.role,
    testEmployee.tenantId.toString()
  );

  adminToken = tokens.accessToken;
}

export async function teardownIntegration() {
  await Tenant.deleteMany({});
  await Employee.deleteMany({});
  await mongoose.model('Visitor').deleteMany({});
  await mongoose.connection.close();
}
