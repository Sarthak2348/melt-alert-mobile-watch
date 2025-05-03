
/**
 * Service for enhancing images before detection processing
 */
export class ImageEnhancementService {
  // Default enhancement settings
  private static defaultSettings = {
    contrast: 1.3,    // Contrast enhancement factor
    brightness: 10,   // Brightness adjustment value
    sharpness: 0.5,   // Sharpness factor
    saturation: 1.2,  // Color saturation factor
    whiteBalance: {   // White balance correction
      r: 0.95,
      g: 1.0,
      b: 1.05
    }
  };

  /**
   * Enhances an image using canvas-based processing techniques
   * @param imageElement Source image or video element
   * @param settings Custom enhancement settings (optional)
   * @returns Canvas with the enhanced image
   */
  static enhanceImage(
    imageElement: HTMLImageElement | HTMLVideoElement,
    settings = this.defaultSettings
  ): HTMLCanvasElement {
    // Create a canvas for processing
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      console.error('Could not get canvas context for image enhancement');
      return canvas;
    }
    
    // Set canvas size to match image
    canvas.width = imageElement.width || 300;
    canvas.height = imageElement.height || 300;
    
    // Draw original image to canvas
    context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    // Get image data for manipulation
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Apply enhancements
    for (let i = 0; i < data.length; i += 4) {
      // Get RGB values
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      // Apply brightness adjustment
      r += settings.brightness;
      g += settings.brightness;
      b += settings.brightness;
      
      // Apply contrast enhancement
      r = ((r - 128) * settings.contrast) + 128;
      g = ((g - 128) * settings.contrast) + 128;
      b = ((b - 128) * settings.contrast) + 128;
      
      // Apply white balance correction
      r *= settings.whiteBalance.r;
      g *= settings.whiteBalance.g;
      b *= settings.whiteBalance.b;
      
      // Apply saturation
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      r = luminance + settings.saturation * (r - luminance);
      g = luminance + settings.saturation * (g - luminance);
      b = luminance + settings.saturation * (b - luminance);
      
      // Clamp values to valid range
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    // Apply sharpness (using a simple convolution)
    if (settings.sharpness > 0) {
      const sharpData = new Uint8ClampedArray(data);
      const w = canvas.width;
      
      // Simple sharpening convolution
      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          for (let c = 0; c < 3; c++) {
            const idx = (y * w + x) * 4 + c;
            const center = data[idx];
            const top = data[idx - w * 4];
            const bottom = data[idx + w * 4];
            const left = data[idx - 4];
            const right = data[idx + 4];
            
            // Apply sharpening filter
            sharpData[idx] = Math.max(0, Math.min(255, 
              center * (1 + 4 * settings.sharpness) - 
              settings.sharpness * (top + bottom + left + right)
            ));
          }
        }
      }
      
      // Copy sharpened data back
      for (let i = 0; i < data.length; i++) {
        data[i] = sharpData[i];
      }
    }
    
    // Update canvas with enhanced image data
    context.putImageData(imageData, 0, 0);
    return canvas;
  }
  
  /**
   * Applies perspective correction to align the sample
   * @param canvas Canvas with the source image
   * @param regionOfInterest Region boundaries (in percentage of image dimensions)
   * @returns Canvas with perspective-corrected image
   */
  static applyPerspectiveCorrection(
    canvas: HTMLCanvasElement, 
    regionOfInterest = { top: 0.25, left: 0.25, width: 0.5, height: 0.5 }
  ): HTMLCanvasElement {
    const context = canvas.getContext('2d');
    if (!context) return canvas;
    
    // For now, just crop to the region of interest as a simpler alternative
    const roiX = Math.floor(canvas.width * regionOfInterest.left);
    const roiY = Math.floor(canvas.height * regionOfInterest.top);
    const roiWidth = Math.floor(canvas.width * regionOfInterest.width);
    const roiHeight = Math.floor(canvas.height * regionOfInterest.height);
    
    const imageData = context.getImageData(roiX, roiY, roiWidth, roiHeight);
    
    // Create a new canvas with only the ROI
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = roiWidth;
    outputCanvas.height = roiHeight;
    const outputContext = outputCanvas.getContext('2d');
    
    if (outputContext) {
      outputContext.putImageData(imageData, 0, 0);
    }
    
    return outputCanvas;
  }
}
