import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonTitle, SkeletonCard } from '../../../components/ui/Skeleton';

export default function Loading() {
  return (
    <div style={{ padding: '40px', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px', background: '#000' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <SkeletonAvatar width={60} height={60} borderRadius="50%" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div>
          <SkeletonTitle width={200} height={24} style={{ marginBottom: '8px', background: 'rgba(255,255,255,0.1)' }} />
          <SkeletonText width={120} height={14} style={{ background: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <SkeletonCard width="30%" height={120} borderRadius={16} style={{ background: 'rgba(255,255,255,0.1)' }} />
        <SkeletonCard width="30%" height={120} borderRadius={16} style={{ background: 'rgba(255,255,255,0.1)' }} />
        <SkeletonCard width="30%" height={120} borderRadius={16} style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>

      <div style={{ marginTop: '30px' }}>
        <SkeletonText width="100%" height={60} borderRadius={12} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.1)' }} />
        <SkeletonText width="100%" height={60} borderRadius={12} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.1)' }} />
        <SkeletonText width="100%" height={60} borderRadius={12} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.1)' }} />
        <SkeletonText width="100%" height={60} borderRadius={12} style={{ background: 'rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}