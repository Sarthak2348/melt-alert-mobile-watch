
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface PhotoOptions {
  quality?: number;
  width?: number;
  height?: number;
  allowEditing?: boolean;
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
      const permissions = await Camera.requestPermissions();
      return permissions;
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      throw error;
    }
  }
}
