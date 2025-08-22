import React, { useState } from "react";

function ImageUpload() {
  const [image, setImage] = useState(null);

  const handleUpload = async (event: { target: { files: any[]; }; }) => {
    const file = event.target.files[0];
    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset"); // set in Cloudinary

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/your_cloud_name/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();
    setImage(data.secure_url);
  };

  return (
    <div>
      <input type="file" onChange={handleUpload} />
      {image && (
        <div>
          <p>Uploaded Image:</p>
          <img src={image} alt="Uploaded" width="300" />
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
