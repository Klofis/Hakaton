// components/FileUploader.tsx
import React from 'react';
import "./FileUploader.css"
interface FileUploaderProps {
  onFilesSelected: (event: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
  onCancel: () => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFilesSelected, 
  loading, 
  onCancel 
}) => {
  return (
    <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
     
       <input 
        type="file" 
        multiple 
        accept="image/*" 
        onChange={onFilesSelected}
        disabled={loading}
        id='file-input'
        style={{
          display:'none'
        }}
      />
       <label htmlFor="file-input" className="custom-file-button" style={{
          padding: "0.5rem",
          border: "2px dashed black",
          borderRadius: "4px",
          flex: 1,
          maxWidth: "400px",
          height: "200px",
          cursor: "pointer",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Inter, sans-serif",
          fontWeight: '600',
          fontSize: '16px',
          backgroundColor: '#FFFFFF'

        }}>
    <span>Переместите файлы или нажмите сюда</span>
  </label>
  {loading && (
        <button 
          onClick={onCancel}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Отменить
        </button>
      )}
    </div>
  );
};

export default FileUploader;