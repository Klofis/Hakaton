// components/ClusterGrid.tsx
import React from 'react';
import ClusterCard from '../ClusterCard/ClusterCard';
import type { Cluster } from '../../types';

interface ClusterGridProps {
  clusters: Cluster[];
}

const ClusterGrid: React.FC<ClusterGridProps> = ({ clusters }) => {
  return (
    <div style={{ 
      display: "grid", 
      gap: "1.5rem", 
      marginTop: "2rem" 
    }}>
      {clusters.map((cluster) => (
        <ClusterCard key={cluster.id} cluster={cluster} />
      ))}
    </div>
  );
};

export default ClusterGrid;