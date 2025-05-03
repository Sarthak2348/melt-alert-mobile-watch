/**
 * Service for enhancing images before detection processing
 * Includes advanced image processing techniques inspired by OpenCV
 */
export class ImageEnhancementService {
  // Default enhancement settings
  private static defaultSettings = {
    contrast: 1.3,      // Contrast enhancement factor
    brightness: 10,     // Brightness adjustment value
    sharpness: 0.5,     // Sharpness factor
    saturation: 1.2,    // Color saturation factor
    denoise: 0.3,       // Denoising strength
    colorBalance: true, // Apply automatic white balance
    clahe: true,        // Apply CLAHE-like contrast enhancement
    whiteBalance: {     // White balance correction
      r: 0.95,
      g: 1.0,
      b: 1.05
    }
  };

  /**
   * Enhances an image using advanced processing techniques
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
    const width = canvas.width;
    const height = canvas.height;
    
    // Step 1: Convert to LAB-like color space and apply color balancing
    if (settings.colorBalance) {
      // Calculate average color values (approximate LAB conversion)
      let avgR = 0, avgG = 0, avgB = 0;
      let pixelCount = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        avgR += data[i];
        avgG += data[i + 1];
        avgB += data[i + 2];
        pixelCount++;
      }
      
      avgR /= pixelCount;
      avgG /= pixelCount;
      avgB /= pixelCount;
      
      // Calculate deviation from neutral gray
      const targetAvg = 128;
      const rOffset = targetAvg - avgR;
      const gOffset = targetAvg - avgG;
      const bOffset = targetAvg - avgB;
      
      // Apply color correction based on luminance
      for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const luminanceFactor = luminance / 255;
        
        data[i] += rOffset * luminanceFactor;
        data[i + 1] += gOffset * luminanceFactor;
        data[i + 2] += bOffset * luminanceFactor;
      }
    }
    
    // Step 2: Apply CLAHE-like contrast enhancement
    if (settings.clahe) {
      // Create histogram
      const histSize = 256;
      const histogram = new Uint32Array(histSize);
      
      for (let i = 0; i < data.length; i += 4) {
        // Calculate luminance
        const luminance = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogram[luminance]++;
      }
      
      // Calculate cumulative histogram
      const cdf = new Uint32Array(histSize);
      cdf[0] = histogram[0];
      for (let i = 1; i < histSize; i++) {
        cdf[i] = cdf[i - 1] + histogram[i];
      }
      
      // Normalize CDF
      const cdfMin = cdf.find(x => x > 0) || 0;
      const lookupTable = new Uint8Array(histSize);
      
      for (let i = 0; i < histSize; i++) {
        lookupTable[i] = Math.round(((cdf[i] - cdfMin) / (data.length / 4 - cdfMin)) * 255);
      }
      
      // Apply equalization
      for (let i = 0; i < data.length; i += 4) {
        const luminance = Math.floor(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        const factor = lookupTable[luminance] / luminance;
        
        if (!isNaN(factor) && isFinite(factor)) {
          data[i] = Math.min(255, Math.max(0, data[i] * factor * 0.7 + data[i] * 0.3));
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor * 0.7 + data[i + 1] * 0.3));
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor * 0.7 + data[i + 2] * 0.3));
        }
      }
    }
    
    // Step 3: Apply standard enhancements
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
    
    // Step 4: Apply sharpening using a convolution filter
    if (settings.sharpness > 0) {
      // Make a copy of the data for sharpening
      const sharpData = new Uint8ClampedArray(data);
      
      // Apply a sharpening kernel (similar to the Python kernel [[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) {
            const idx = (y * width + x) * 4 + c;
            
            const center = data[idx] * (1 + 4 * settings.sharpness);
            const top = data[((y - 1) * width + x) * 4 + c] * settings.sharpness;
            const bottom = data[((y + 1) * width + x) * 4 + c] * settings.sharpness;
            const left = data[(y * width + x - 1) * 4 + c] * settings.sharpness;
            const right = data[(y * width + x + 1) * 4 + c] * settings.sharpness;
            
            sharpData[idx] = Math.max(0, Math.min(255, center - top - bottom - left - right));
          }
        }
      }
      
      // Copy sharpened data back
      for (let i = 0; i < data.length; i++) {
        data[i] = sharpData[i];
      }
    }
    
    // Step 5: Apply simple denoising (blurring high frequency components)
    if (settings.denoise > 0) {
      const denoiseData = new Uint8ClampedArray(data);
      const denoiseAmount = settings.denoise;
      
      for (let y = 2; y < height - 2; y++) {
        for (let x = 2; x < width - 2; x++) {
          for (let c = 0; c < 3; c++) {
            const idx = (y * width + x) * 4 + c;
            
            // Average with neighbors, weighted
            let sum = data[idx] * 0.4; // Current pixel has highest weight
            let totalWeight = 0.4;
            
            // Sample 8 neighbors
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip center
                
                const nidx = ((y + dy) * width + (x + dx)) * 4 + c;
                const weight = 0.075; // Each neighbor has same weight
                sum += data[nidx] * weight;
                totalWeight += weight;
              }
            }
            
            // Apply weighted average based on denoise amount
            denoiseData[idx] = Math.round(
              data[idx] * (1 - denoiseAmount) + (sum / totalWeight) * denoiseAmount
            );
          }
        }
      }
      
      // Copy denoised data back
      for (let i = 0; i < data.length; i++) {
        data[i] = denoiseData[i];
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
