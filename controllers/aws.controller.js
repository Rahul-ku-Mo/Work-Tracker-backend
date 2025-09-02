const awsService = require("../services/aws.service");
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


const uploadAttachment = async (req, res) => {
  try {
    const { fileName, fileType, slug } = req.body;

    console.log('Upload attachment request:', { fileName, fileType, slug });

    const userId =  req.user.userId;
  

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    if (!fileName || !fileType || !slug) {
      return res.status(400).json({ message: "File name and file type and slug are required" });
    }

    // Check storage limits before upload
    const { getUserPlan, getStorageUsage } = require("../middleware/featureGating");
    const plan = await getUserPlan(userId);
    const storageUsage = await getStorageUsage(userId);
    
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

    const key = `attachments/${slug}/${Date.now()}-${fileName}`;
    const url = await awsService.putObject(fileType, key);

    res.status(200).json({ 
      preSignedUrl: url,  // Pre-signed upload URL
      key,  // S3 object key
      slug, // For tracking purposes
    });
  }
   catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ message: "Failed to upload attachment" });
  }
}

// Confirm attachment upload and save to database
const confirmAttachmentUpload = async (req, res) => {
  try {
    const { key, fileName, fileSize, mimeType, slug } = req.body;
    const userId = req.user.userId;

    console.log('Confirm attachment upload request:', { key, fileName, fileSize, mimeType, slug, userId });

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    if (!key || !fileName || !fileSize || !mimeType || !slug) {
      return res
        .status(400)
        .json({ message: "Missing required upload information" });
    }

    // Find the card by slug
    const card = await prisma.card.findUnique({
      where: { slug }
    });

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
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

    // Create attachment record in database
    const attachment = await prisma.attachment.create({
      data: {
        cardId: card.id,
        userId,
        s3Key: key,
        fileName,
        fileSize: parseInt(fileSize),
        mimeType,
        url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      }
    });

    res.status(200).json({ 
      message: "Attachment upload confirmed",
      attachment 
    });
  } catch (error) {
    console.error("Error confirming attachment upload:", error);
    res.status(500).json({ message: "Failed to confirm attachment upload" });
  }
};

// Get attachments for a card
const getCardAttachments = async (req, res) => {
  try {
    const { slug } = req.params;
    const userId = req.user.userId;

    console.log('Get attachments request:', { slug, userId });

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Find the card by slug
    const card = await prisma.card.findUnique({
      where: { slug },
      include: {
        cardAttachments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    res.status(200).json({ 
      attachments: card.cardAttachments 
    });
  } catch (error) {
    console.error("Error fetching card attachments:", error);
    res.status(500).json({ message: "Failed to fetch attachments" });
  }
};

// Delete attachment
const deleteAttachment = async (req, res) => {
  try {
    const { attachmentId } = req.params;
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({ message: "User authentication required" });
    }

    // Find the attachment and verify ownership or card access
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        card: true
      }
    });

    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // For now, only allow the uploader to delete (you can add more permission logic here)
    if (attachment.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this attachment" });
    }

    // Delete from database
    await prisma.attachment.delete({
      where: { id: attachmentId }
    });

    // TODO: Also delete from S3 if needed
    // await awsService.deleteObject(attachment.s3Key);

    res.status(200).json({ 
      message: "Attachment deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ message: "Failed to delete attachment" });
  }
};


module.exports = { uploadFile, confirmUpload, uploadAttachment, confirmAttachmentUpload, getCardAttachments, deleteAttachment };
