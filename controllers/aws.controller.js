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

    // Check storage limits before upload (we'll validate file size on confirm)
    const { getUserPlan, getStorageUsage } = require("../middleware/featureGating");
    const plan = await getUserPlan(userId);
    const storageUsage = await getStorageUsage(userId);
    
    // For now, just check if user has storage available (detailed check happens on confirm)
    // This is a pre-check to avoid unnecessary S3 operations
    const planLimits = {
      free: 1, // 1GB
      pro: 10, // 10GB  
      enterprise: 100 // 100GB
    };
    
    const storageLimit = planLimits[plan] || planLimits.free;
    
    if (storageUsage >= storageLimit) {
      return res
        .status(403)
        .json({ 
          message: `Storage limit reached. You've used ${storageUsage.toFixed(2)}GB of your ${storageLimit}GB limit.`,
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

    // Check storage limits with the actual file size
    const { getUserPlan, getStorageUsage } = require("../middleware/featureGating");
    const plan = await getUserPlan(userId);
    const currentStorageUsage = await getStorageUsage(userId);
    const fileSizeInGB = parseInt(fileSize) / (1024 * 1024 * 1024); // Convert bytes to GB
    
    const planLimits = {
      free: 1, // 1GB
      pro: 10, // 10GB  
      enterprise: 100 // 100GB
    };
    
    const storageLimit = planLimits[plan] || planLimits.free;
    
    if (currentStorageUsage + fileSizeInGB > storageLimit) {
      return res
        .status(403)
        .json({ 
          message: `Upload would exceed storage limit. Current usage: ${currentStorageUsage.toFixed(2)}GB, File size: ${fileSizeInGB.toFixed(2)}GB, Limit: ${storageLimit}GB`,
          upgradeRequired: true 
        });
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
