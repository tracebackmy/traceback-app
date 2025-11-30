
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export const StorageService = {
  /**
   * Uploads a file to Firebase Storage and returns the download URL.
   * Path structure: {folder}/{userId}/{timestamp}_{filename}
   */
  uploadFile: async (file: File, folder: 'items' | 'cctv' | 'evidence', userId: string): Promise<string> => {
    // Validate file type/size if needed
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error("File size exceeds 10MB limit");
    }

    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `${folder}/${userId}/${timestamp}_${cleanFileName}`;
    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  },

  /**
   * Helper to upload base64 string (used in some existing mock flows)
   * Converts base64 to Blob and uploads
   */
  uploadBase64: async (base64String: string, folder: 'items' | 'evidence', userId: string): Promise<string> => {
    const response = await fetch(base64String);
    const blob = await response.blob();
    const file = new File([blob], "upload.jpg", { type: blob.type });
    return StorageService.uploadFile(file, folder, userId);
  }
};
