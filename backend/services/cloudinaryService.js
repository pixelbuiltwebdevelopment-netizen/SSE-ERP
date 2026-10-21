const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary credentials
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload buffer to Cloudinary with folder structure
 */
const uploadStream = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'erp/companies',
        resource_type: options.resourceType || 'auto',
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Upload single file from multer (req.file)
 */
const uploadFile = async (file, companyId = 'temp', subfolder = 'general') => {
  if (!file || !file.buffer) {
    throw new Error('File buffer missing');
  }

  const folderPath = `erp/companies/${companyId}/${subfolder}`;
  const isImage = file.mimetype.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';

  const uploadResult = await uploadStream(file.buffer, {
    folder: folderPath,
    resourceType,
  });

  return {
    publicId: uploadResult.public_id,
    url: uploadResult.secure_url || uploadResult.url,
    originalName: file.originalname,
    size: file.size,
    resourceType: uploadResult.resource_type,
    format: uploadResult.format || file.originalname.split('.').pop(),
  };
};

/**
 * Delete file from Cloudinary by publicId
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  if (!publicId) return null;
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
    return result;
  } catch (error) {
    console.error(`[Cloudinary Delete Error]: ${error.message}`);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadFile,
  deleteFile,
};
