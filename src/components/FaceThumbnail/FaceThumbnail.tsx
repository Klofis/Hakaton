// components/FaceThumbnail.tsx
import React from 'react';
import type { FaceWithConfidence } from '../../types';
import { OPTIMIZATION_CONFIG } from '../../config';

interface FaceThumbnailProps {
  face: FaceWithConfidence;
  index: number;
}

const FaceThumbnail: React.FC<FaceThumbnailProps> = ({ face, index }) => {
  const getConfidenceText = (confidence: number): string => {
    if (confidence > 0.8) return 'High';
    if (confidence > 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <div style={{ position: 'relative' }}>
      <img 
        src={face.image} 
        alt={`face-${index}`} 
        width={OPTIMIZATION_CONFIG.THUMBNAIL_SIZE}
        height={OPTIMIZATION_CONFIG.THUMBNAIL_SIZE + 30}
        style={{
          borderRadius: "8px",
          objectFit: "contain",
          border: "2px solid #fff",
          boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
          background: "#f0f0f0",
          
        }}
        loading="lazy"
      />
      <div style={{
        position: 'absolute',
        top: '5px',
        right: '5px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: 'bold',
        fontFamily: "sans-serif"
      }}>
        {getConfidenceText(face.confidence)}
      </div>
    </div>
  );
};

export default FaceThumbnail;