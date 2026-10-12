import { useState } from "react";

function UploadImage() {
  const [image, setImage] = useState(null);

  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);

  const [uploadedImage, setUploadedImage] = useState(null);

  const handleSelectImage = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setImage(file);

    const previewUrl = URL.createObjectURL(file);

    setPreview(previewUrl);
  };

  const handleUpload = async () => {
    if (!image) {
      alert("Bạn chưa chọn ảnh.");

      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("image", image);

      const response = await fetch(
        "http://localhost:5001/api/upload/image",

        {
          method: "POST",

          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload ảnh thất bại.");
      }

      console.log("Cloudinary:", data);

      setUploadedImage(data.image);

      alert("Upload ảnh thành công!");
    } catch (error) {
      console.error(error);

      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "50px auto",
        padding: "20px",
      }}
    >
      <h2>Thêm kỷ niệm</h2>

      <input type="file" accept="image/*" onChange={handleSelectImage} />

      {preview && (
        <div
          style={{
            marginTop: "20px",
          }}
        >
          <img
            src={preview}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: "400px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
          />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={loading}
        style={{
          marginTop: "20px",
          padding: "12px 20px",
          cursor: "pointer",
        }}
      >
        {loading ? "Đang tải ảnh..." : "Đăng ảnh"}
      </button>

      {uploadedImage && (
        <div
          style={{
            marginTop: "30px",
          }}
        >
          <h3>Ảnh trên Cloudinary</h3>

          <img
            src={uploadedImage.url}
            alt="Cloudinary"
            style={{
              width: "100%",
              borderRadius: "12px",
            }}
          />

          <p>
            <strong>URL:</strong>
          </p>

          <p
            style={{
              wordBreak: "break-all",
            }}
          >
            {uploadedImage.url}
          </p>

          <p>
            <strong>Public ID:</strong> {uploadedImage.public_id}
          </p>
        </div>
      )}
    </div>
  );
}

export default UploadImage;
