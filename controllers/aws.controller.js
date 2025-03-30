const awsService = require("../services/aws.service");
const axios = require("axios");

const uploadFile = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res
        .status(400)
        .json({ message: "File name and file type are required" });
    }

    const key = `uploads/${Date.now()}-${fileName}`;

    const url = await awsService.putObject(fileType, key);
    
    res.status(200).json({ 
      preSignedUrl: url,  // Pre-signed upload URL
      key,  // S3 object key
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
};


module.exports = { uploadFile };
