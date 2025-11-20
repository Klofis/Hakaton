// components/ClusterCard.tsx
import React from 'react';
import FaceThumbnail from '../FaceThumbnail/FaceThumbnail';
import type { Cluster } from '../../types';
import { OPTIMIZATION_CONFIG } from '../../config';

interface ClusterCardProps {
  cluster: Cluster;
}

const ClusterCard: React.FC<ClusterCardProps> = ({ cluster }) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.8) return '#00cc00';
    if (confidence > 0.6) return '#ffaa00';
    return '#ff4444';
  };

  return (
    <div >
      <div>
        <h3 style={{
              fontFamily:'sans-serif',
              fontSize:"15px"
            }}>
          {cluster.id}
        </h3>
        {cluster.avgConfidence > 0 && (
          <div>
            <span style={{
              fontFamily:'sans-serif',
              fontSize:"15px"
            }}>Средняя уверенность:</span>
            <div style={{
              backgroundColor: getConfidenceColor(cluster.avgConfidence),
              fontFamily:'sans-serif',
              fontSize:"15px"
            }}>
              {(cluster.avgConfidence * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: `repeat(auto-fill, minmax(${OPTIMIZATION_CONFIG.THUMBNAIL_SIZE}px, 1fr))`,
        gap: "1rem"
      }}>
        {cluster.faces.map((face, idx) => (
          <FaceThumbnail key={idx} face={face} index={idx} />
        ))}
      </div>
    </div>
  );
};

export default ClusterCard;