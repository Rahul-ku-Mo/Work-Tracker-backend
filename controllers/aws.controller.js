const awsService = require("../services/aws.service");

const uploadFile = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res
        .status(400)
        .json({ message: "File name and file type are required" });
    }

    const key = `uploads/${Date.now()}-${fileName}`;
    const url = await awsService.putObject(key, fileType);
    
    // Create permanent URL for referencing the uploaded file
    const permanentUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.status(200).json({ 
      url,  // Pre-signed upload URL
      key,  // S3 object key
      fileUrl: permanentUrl // Permanent URL to access the file after upload
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
};

module.exports = { uploadFile };
