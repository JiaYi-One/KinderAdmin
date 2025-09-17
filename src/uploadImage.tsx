import React, { useState } from "react";

interface FileUploadProps {
  onFileUpload: (fileUrl: string, fileName: string, fileSize: number, fileType: string) => void;
  acceptedTypes?: string[];
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
  allowVideos?: boolean; // New prop to enable video support
}

function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ['.png', '.jpg', '.jpeg', '.gif', '.webp'], 
  maxSize = 5,
  className = "",
  disabled = false,
  allowVideos = false
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      alert(`File type not supported. Please upload: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File size too large. Maximum size is ${maxSize}MB.`);
      return;
    }

    // Additional validation for file types
    if (allowVideos) {
      // Allow both images and videos
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Please select a valid image or video file.');
        return;
      }
    } else {
      // Only allow images
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "KinderCare");
      
      // Determine folder based on file type
      const folder = file.type.startsWith('video/') 
        ? "KinderCare/WebApp/chat_videos" 
        : "KinderCare/WebApp/chat_images";
      formData.append("folder", folder);

      console.log('Uploading to folder:', folder);

      // Determine upload endpoint based on file type
      const endpoint = file.type.startsWith('video/')
        ? "https://api.cloudinary.com/v1_1/dvremwz4m/video/upload"
        : "https://api.cloudinary.com/v1_1/dvremwz4m/image/upload";

      console.log('Upload endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      console.log('Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed with response:', errorText);
        throw new Error(`Upload failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      // Validate response data
      if (!data.secure_url) {
        console.error('Invalid upload response:', data);
        throw new Error('Invalid response from upload service');
      }
      
      console.log('Upload successful, calling onFileUpload with:', {
        url: data.secure_url,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
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
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          alert('Network error. Please check your internet connection and try again.');
        } else if (error.message.includes('Invalid response')) {
          alert('Upload service error. Please try again later.');
        } else {
          alert(`File upload failed: ${error.message}`);
        }
      } else {
        alert('File upload failed. Please try again.');
      }
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
            <i className={allowVideos ? "bi bi-camera-video" : "bi bi-image"}></i>
            <span>{allowVideos ? "Add Media" : "Add Image"}</span>
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
