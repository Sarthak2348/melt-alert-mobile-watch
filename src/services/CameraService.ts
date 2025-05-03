
import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

export interface PhotoOptions {
  quality?: number;
  width?: number;
  height?: number;
  allowEditing?: boolean;
  saveToGallery?: boolean;
  direction?: CameraDirection;
}

export class CameraService {
  static async getPhoto(options: PhotoOptions = {}) {
    try {
      const defaultOptions = {
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
        saveToGallery: false,
        direction: CameraDirection.Rear,
        ...options
      };

      const image = await Camera.getPhoto(defaultOptions);
      return image;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    }
  }

  static async requestPermissions() {
    try {
      // Updated to use proper permissions API
      const permissions = await Camera.requestPermissions();
      return permissions;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      throw error;
    }
  }

  static async checkPermissions() {
    try {
      return await Camera.checkPermissions();
    } catch (error) {
      console.error('Error checking camera permissions:', error);
      throw error;
    }
  }
}
