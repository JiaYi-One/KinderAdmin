import React, { useState } from "react";

interface FileUploadProps {
  onFileUpload: (fileUrl: string, fileName: string, fileSize: number, fileType: string) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
}

function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ['.png', '.jpg', '.jpeg'], 
  maxSize = 5,
  className = "",
  disabled = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      alert(`Image type not supported. Please upload: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`Image size too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "KinderCare"); // Set in Cloudinary
      formData.append("folder", "chat_files"); // Organize uploads in chat_files folder

      // Upload as image since we only accept images
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dvremwz4m/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      // Call the callback with file details
      onFileUpload(
        data.secure_url, 
        file.name, 
        file.size, 
        file.type
      );

      setUploadProgress(100);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Reset input
      event.target.value = '';
    }
  };

  return (
    <div className={`file-upload-container ${className}`}>
      <input
        type="file"
        onChange={handleFileUpload}
        accept={acceptedTypes.join(',')}
        disabled={isUploading || disabled}
        className="form-control"
        style={{ display: 'none' }}
        id="file-upload-input"
      />
      <label 
        htmlFor="file-upload-input" 
        className={`btn btn-outline-secondary d-flex align-items-center gap-2 ${(isUploading || disabled) ? 'disabled' : ''}`}
        style={{ cursor: (isUploading || disabled) ? 'not-allowed' : 'pointer' }}
      >
        {isUploading ? (
          <>
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Uploading...</span>
            </div>
            <span>Uploading...</span>
          </>
        ) : (
          <>
            <i className="bi bi-image"></i>
            <span>Add Image</span>
          </>
        )}
      </label>
      
      {isUploading && (
        <div className="progress mt-2" style={{ height: '4px' }}>
          <div 
            className="progress-bar" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
