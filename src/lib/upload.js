import axios from 'axios';

const uploadToCloudinary = async (file) => {
  if (!file) {
    throw new Error("No file provided");
  }

  // Check file type and size
  const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!validImageTypes.includes(file.type)) {
    throw new Error("Invalid file type. Please upload a valid image.");
  }

  const maxSize = 2 * 1024 * 1024; // 2MB max size
  if (file.size > maxSize) {
    throw new Error("File size exceeds the 2MB limit");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'appchat'); // Ensure this preset exists
  formData.append('cloud_name', 'dzmy4dzqb');  // Ensure this is correct

  // Specify the folder path in the public_id parameter
  formData.append('public_id', 'chatApp/' + file.name);

  try {
    // Debug the formData before sending the request
    console.log('Uploading image to Cloudinary with formData:', formData);

    // Correct API endpoint for Cloudinary
    const response = await axios.post('https://api.cloudinary.com/v1_1/dzmy4dzqb/image/upload', formData);

    // Log the response from Cloudinary
    console.log('Upload successful:', response.data);

    return response.data.secure_url; // Return the uploaded image URL
  } catch (error) {
    // Detailed error logging
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error('Image upload failed: ' + error.message);
  }
};

export default uploadToCloudinary;