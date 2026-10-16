import imagekit from '../config/imagekit.js';

/**
 * Controller: Generate signed upload parameters for client-side direct uploads.
 * Security: Accessible only to authenticated Admins via middleware.
 */
export const getUploadAuth = (req, res, next) => {
  try {
    const authParams = imagekit.getAuthenticationParameters();
    
    // Return authentication parameters to the browser
    res.status(200).json({
      ...authParams,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY
    });
  } catch (error) {
    next(error);
  }
};
