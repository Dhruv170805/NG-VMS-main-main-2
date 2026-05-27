import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const ActiveTimer = ({ expectedCheckout }: { expectedCheckout: string }) => {
  const [status, setStatus] = useState({ text: "", isOverstay: false });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(expectedCheckout).getTime() - new Date().getTime();
      const isOverstay = diff < 0;
      const absDiff = Math.abs(diff);

      const hours = Math.floor(absDiff / 3600000);
      const mins = Math.floor((absDiff % 3600000) / 60000);
      
      const timeStr = `${hours}h ${mins}m ${isOverstay ? 'OVER' : 'LEFT'}`;
      setStatus({ text: timeStr, isOverstay });
    }, 1000);
    return () => clearInterval(interval);
  }, [expectedCheckout]);

  return (
    <div className={`timer_badge ${status.isOverstay ? 'overstay_alert' : ''}`}>
      <Clock size={12} /> {status.text}
    </div>
  );
};
