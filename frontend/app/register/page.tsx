"use client";
import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the registration form with SSR disabled
// This prevents @vladmandic/face-api from crashing during server-side rendering
const RegistrationForm = dynamic(
  () => import('./RegistrationForm'),
  { 
    ssr: false,
    loading: () => (
      <div className="reg_page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="bg-mesh" />
        <div style={{ textAlign: 'center' }}>
          <div className="spinner_apple" style={{ margin: '0 auto 20px' }} />
          <p style={{ fontWeight: 800, opacity: 0.5, letterSpacing: '1px' }}>LOADING AETHER BIOMETRICS...</p>
        </div>
      </div>
    )
  }
);

export default function RegisterPage() {
  return <RegistrationForm />;
}
