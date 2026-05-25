const CryptoJS = require('crypto-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function decodeLicense(licenseKey, secretKey = 'default-secret-key-123', publicKeyPath = 'public.pem') {
  console.log('🔑 Decoding License Key...');
  
  let rawData = null;
  let payload = null;
  let isSigned = false;
  let signatureVerified = null;

  try {
    // 1. Attempt to parse as Signed Base64 JSON: { "enc": "...", "sig": "..." }
    const decoded = JSON.parse(Buffer.from(licenseKey, 'base64').toString('utf8'));
    
    if (decoded.enc && decoded.sig) {
      isSigned = true;
      console.log('📝 Detected format: Signed License Payload');
      
      // Load public key to verify signature if available
      const resolvedPublicKeyPath = path.resolve(publicKeyPath);
      if (fs.existsSync(resolvedPublicKeyPath)) {
        const publicKey = fs.readFileSync(resolvedPublicKeyPath, 'utf8');
        try {
          const verifier = crypto.createVerify('SHA256');
          verifier.update(decoded.enc);
          signatureVerified = verifier.verify(publicKey, decoded.sig, 'base64');
          console.log(signatureVerified ? '✅ RSA Signature: VERIFIED' : '❌ RSA Signature: FAILED VERIFICATION');
        } catch (err) {
          console.error('❌ Error verifying signature:', err.message);
          signatureVerified = false;
        }
      } else {
        console.warn(`⚠️  RSA Signature: Bypassed (public.pem not found at ${resolvedPublicKeyPath})`);
      }

      // Decrypt the AES payload
      try {
        const bytes = CryptoJS.AES.decrypt(decoded.enc, secretKey.substring(0, 32));
        rawData = bytes.toString(CryptoJS.enc.Utf8);
        if (!rawData) {
          // Fallback: Check if the dec field was already plain JSON
          const raw = Buffer.from(decoded.enc, 'base64').toString('utf8');
          JSON.parse(raw);
          rawData = raw;
        }
      } catch (err) {
        console.error('❌ AES Decryption Failed:', err.message);
      }
    } else {
      console.log('📝 Detected format: Direct Base64 JSON (Unsigned)');
      rawData = Buffer.from(licenseKey, 'base64').toString('utf8');
    }
    
    if (rawData) {
      payload = JSON.parse(rawData);
    }
  } catch (e) {
    // 2. Fallback to Raw AES encrypted mode
    console.log('📝 Detected format: Direct Encrypted Ciphertext');
    try {
      const bytes = CryptoJS.AES.decrypt(licenseKey, secretKey.substring(0, 32));
      rawData = bytes.toString(CryptoJS.enc.Utf8);
      if (!rawData) {
        // Direct Base64 JSON fallback if JSON parsing failed in step 1
        rawData = Buffer.from(licenseKey, 'base64').toString('utf8');
      }
      payload = JSON.parse(rawData);
    } catch (err) {
      console.error('❌ All decryption attempts failed:', err.message);
    }
  }

  if (payload) {
    console.log('\n🎉 Successfully Decoded Payload:\n', JSON.stringify(payload, null, 2));
    return { payload, isSigned, signatureVerified };
  } else {
    console.error('\n❌ Could not decode license key. Please check the secret key and license key format.');
    return null;
  }
}

// Command Line execution support
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node decode.js <licenseKey> [secretKey] [publicKeyPath]');
    process.exit(1);
  }
  
  const licenseKey = args[0];
  const secretKey = args[1] || process.env.LICENSE_SECRET || 'default-secret-key-123';
  const publicKeyPath = args[2] || path.join(__dirname, '../../public.pem');
  
  decodeLicense(licenseKey, secretKey, publicKeyPath);
}

module.exports = { decodeLicense };
