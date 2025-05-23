// middlewares/upload.js
const AWS = require('aws-sdk');
const path = require('path');
const sanitizeFilename = require('sanitize-filename');
const { v4: uuidv4 } = require('uuid');

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Function to upload to S3
async function uploadToS3(fileName, fileContent, mimeType) {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${fileName}`,
        Body: fileContent,
        ContentType: mimeType,
        ContentDisposition: 'inline',
    };

    try {
        const data = await s3.upload(params).promise();
        return data.Location; // URL of uploaded file
    } catch (err) {
        throw new Error('Error uploading file to S3: ' + err.message);
    }
}

// Handle single file upload to S3
async function handleFileUpload(file,folderName) {
    try {
        if (!file) {
            throw new Error('No file uploaded.');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('Unsupported file type.');
        }

        const safeFileName = sanitizeFilename(file.name) || 'file';
        const fileExtension = path.extname(safeFileName);
        const fileName = `${folderName}/${uuidv4()}${fileExtension}`;

        const fileContent = file.data; // file.data should be a Buffer
        const mimeType = file.mimetype;

        const s3Url = await uploadToS3(fileName, fileContent, mimeType);

        //return fileName;
        return {
            url: fileName,
            originalname: file.name,
            mimetype: file.mimetype
          };
        
    
    } catch (err) {
        console.error('Error uploading file to S3:', err);
        throw err;
    }
}

// Handle multiple files upload to S3
async function handleMultipleFileUpload(files,folderName="Images") {
    const uploadPromises = files.map(file => handleFileUpload(file,folderName));
    return Promise.all(uploadPromises);
}

async function deleteFromS3(s3Key) {

    const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Key,
      };
      try {
        const headObject = await s3.headObject(deleteParams).promise();
        // console.log('S3 File Found:', headObject);
      } catch (headErr) {
        console.error("S3 File Not Found:", headErr);
        return res.status(404).json({ message: "File not found in S3" });
      }
}

module.exports = {
    handleFileUpload,
    handleMultipleFileUpload,
    deleteFromS3
};
