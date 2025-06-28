const awsService = require("../services/aws.service");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const { isWithinLimits } = require("../middleware/featureGating");
const prisma = new PrismaClient();

const uploadFile = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    const userId = req.user.userId;

    // Debug logging
    console.log('Upload request - userId:', userId, 'user object:', req.user);

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    if (!fileName || !fileType) {
      return res
        .status(400)
        .json({ message: "File name and file type are required" });
    }

    // Check if file type is an image
    if (!fileType.startsWith('image/')) {
      return res
        .status(400)
        .json({ message: "Only image files are allowed" });
    }

    // Check if user is within image upload limits
    const { getUserPlan } = require("../middleware/featureGating");
    const plan = await getUserPlan(userId);
    const withinLimits = await isWithinLimits(userId, plan, 'imageUploads');
    
    if (!withinLimits) {
      return res
        .status(403)
        .json({ 
          message: "Image upload limit reached for your current plan",
          upgradeRequired: true 
        });
    }

    const key = `uploads/${userId}/${Date.now()}-${fileName}`;
    const url = await awsService.putObject(fileType, key);
    
    res.status(200).json({ 
      preSignedUrl: url,  // Pre-signed upload URL
      key,  // S3 object key
      userId, // For tracking purposes
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
};

// New endpoint to confirm successful upload and track in database
const confirmUpload = async (req, res) => {
  try {
    const { key, fileName, fileSize, mimeType } = req.body;
    const userId = req.user.userId;

    // Debug logging
    console.log('Confirm upload request - userId:', userId, 'user object:', req.user);

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    if (!key || !fileName || !fileSize || !mimeType) {
      return res
        .status(400)
        .json({ message: "Missing required upload information" });
    }

    // Create record in database for tracking
    const imageUpload = await prisma.imageUpload.create({
      data: {
        userId,
        s3Key: key,
        fileName,
        fileSize: parseInt(fileSize),
        mimeType,
        url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      }
    });

    res.status(200).json({ 
      message: "Upload confirmed",
      upload: imageUpload 
    });
  } catch (error) {
    console.error("Error confirming upload:", error);
    res.status(500).json({ message: "Failed to confirm upload" });
  }
};


module.exports = { uploadFile, confirmUpload };
