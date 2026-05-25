"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Shield } from 'lucide-react';
import styles from './PassFooter.module.css';

interface SignatureProps {
  title: string;
  signed?: boolean;
  name?: string;
  date?: string | Date;
  hash?: string;
  role: string;
}

const SignatureBlock: React.FC<SignatureProps> = ({
  title,
  signed,
  name,
  date,
  hash,
  role
}) => {
  const formattedDate = date ? new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : '';

  return (
    <motion.div 
      className={styles.signatureBlock}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      {signed ? (
        <div className={styles.signedContent}>
          <div className={styles.verifiedHeader}>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              style={{ display: 'inline-block' }}
            >
              <CheckCircle size={16} className={styles.greenCheck} />
            </motion.span>
            <span>Digitally Signed</span>
          </div>
          <div className={styles.signerName}>{title}: {name || 'Verified'}</div>
          <div className={styles.timestamp}>{formattedDate}</div>
          {hash && (
            <div className={styles.hashBadge} title={hash}>
              SHA-256: {hash.slice(0, 8)}...
            </div>
          )}
        </div>
      ) : (
        <div className={styles.unsignedContent}>
          <div className={styles.signatureLine} />
          <div className={styles.unsignedTitle}>{title} Signature</div>
          <div className={styles.awaitingText}>Awaiting action...</div>
        </div>
      )}
    </motion.div>
  );
};

interface PassFooterProps {
  visitor: any;
}

export const PassFooter: React.FC<PassFooterProps> = ({ visitor }) => {
  if (!visitor) return null;

  return (
    <div className={styles.passFooterWrapper}>
      <h3 className={styles.sectionTitle}>Sovereign Access Attestation</h3>
      <div className={styles.passFooter}>
        <SignatureBlock
          title="Visitor"
          role="VISITOR"
          signed={visitor.visitorSignature?.signed}
          name={visitor.visitorSignature?.signedBy || visitor.name}
          date={visitor.visitorSignature?.signedAt}
          hash={visitor.visitorSignature?.signatureHash}
        />

        <SignatureBlock
          title="Guard"
          role="GUARD"
          signed={visitor.guardSignature?.signed}
          name={visitor.guardSignature?.signedBy}
          date={visitor.guardSignature?.signedAt}
          hash={visitor.guardSignature?.signatureHash}
        />

        <SignatureBlock
          title="Host"
          role="HOST"
          signed={visitor.hostSignature?.signed}
          name={visitor.hostSignature?.signedBy || visitor.hostName}
          date={visitor.hostSignature?.signedAt}
          hash={visitor.hostSignature?.signatureHash}
        />
      </div>
      
      <div className={styles.attestationClause}>
        <div className={styles.clauseShield}>
          <Shield size={14} className={styles.greenCheck} />
          This visitor pass is secured with tamper-aware digital signatures cryptographically verified by NG-VMS.
        </div>
      </div>
    </div>
  );
};
