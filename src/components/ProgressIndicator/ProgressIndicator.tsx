// components/ProgressIndicator.tsx
import React from 'react';

interface ProgressIndicatorProps {
  loading: boolean;
  progress: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ loading, progress }) => {
  if (!loading) return null;

  return (
    <div className='progress-indication-main-block'>
      <p style={{ 
       fontFamily:"sans-serif",
       fontSize:"16px"
      }}>Обработка... {progress}%</p>
      <div style={{ 
        width: "100%", 
        height: "8px", 
        backgroundColor: "#f0f0f0",
        borderRadius: "4px",
        overflow: "hidden",
        maxWidth: "400px"
      }}>
        <div style={{
          width: `${progress}%`,
          height: "100%",
          backgroundColor: "#007acc",
          transition: "width 0.3s ease",
          borderRadius: "4px"
        }} />
      </div>
    </div>
  );
};

export default ProgressIndicator;