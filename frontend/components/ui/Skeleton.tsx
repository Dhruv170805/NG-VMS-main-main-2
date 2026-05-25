import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  width, 
  height, 
  borderRadius, 
  style 
}) => {
  const combinedStyle: React.CSSProperties = {
    width,
    height,
    borderRadius,
    ...style
  };

  return (
    <div 
      className={`skeleton ${className}`} 
      style={combinedStyle}
    />
  );
};

export const SkeletonText: React.FC<SkeletonProps> = (props) => (
  <Skeleton className="skeleton_text" {...props} />
);

export const SkeletonTitle: React.FC<SkeletonProps> = (props) => (
  <Skeleton className="skeleton_title" {...props} />
);

export const SkeletonAvatar: React.FC<SkeletonProps> = (props) => (
  <Skeleton className="skeleton_avatar" {...props} />
);

export const SkeletonCard: React.FC<SkeletonProps> = (props) => (
  <Skeleton className="skeleton_card" {...props} />
);
