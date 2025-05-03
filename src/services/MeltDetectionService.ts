import { ImageEnhancementService } from './ImageEnhancementService';

interface MeltDetectionResult {
  detected: boolean;
  confidence: number;
  detectionData?: any;
}

interface DetectionSettings {
  sensitivity: number;      // 0-100 sensitivity for detection
  sampleInterval: number;   // Pixel sampling interval (higher = better performance)
  regionOfInterest?: {      // Optional region to focus analysis
    top: number;            // Top position (0-1)
    left: number;           // Left position (0-1)
    width: number;          // Width (0-1)
    height: number;         // Height (0-1)
  };
  colorProfiles: Array<{   // Detection color profiles
    name: string;
    minR: number;
    maxR: number;
    minG: number;
    maxG: number;
    minB: number;
    maxB: number;
    weight: number;        // Importance weight for this profile
  }>;
  enhanceImage: boolean;   // Whether to apply image enhancement
  temporalSensitivity: number; // 0-1 sensitivity for changes over time
  motionThreshold: number; // Threshold for motion detection
}

export class MeltDetectionService {
  private static model: any | null = null;
  private static isModelLoading = false;
  private static isInitialized = false;
  private static previousDetectionData: any = null;
  private static previousFrame: ImageData | null = null;
  private static frameCounter = 0;
  private static meltsDetectedCount = 0;
  
  // Default detection settings
  private static defaultSettings: DetectionSettings = {
    sensitivity: 50,
    sampleInterval: 20,
    regionOfInterest: {
      top: 0.25,
      left: 0.25,
      width: 0.5,
      height: 0.5
    },
    colorProfiles: [
      // Amber/yellow melting profile
      {
        name: "amber",
        minR: 180,
        maxR: 255,
        minG: 130,
        maxG: 220,
        minB: 20,
        maxB: 100,
        weight: 1.0
      },
      // Beige/cream background profile (to filter out)
      {
        name: "beige",
        minR: 190,
        maxR: 255,
        minG: 170,
        maxG: 240,
        minB: 140,
        maxB: 220,
        weight: -0.5 // Negative weight to reduce false positives
      }
    ],
    enhanceImage: true,
    temporalSensitivity: 0.3,
    motionThreshold: 30 // Threshold for motion detection (0-255)
  };

  /**
   * Detects melting in the provided image or video element
   * @param imageElement Source image/video element
   * @param customSettings Optional custom detection settings 
   * @returns Detection result with confidence scores
   */
  static async detectMelting(
    imageElement: HTMLImageElement | HTMLVideoElement, 
    customSettings?: Partial<DetectionSettings>
  ): Promise<MeltDetectionResult> {
    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Merge default and custom settings
      const settings: DetectionSettings = {
        ...this.defaultSettings,
        ...customSettings,
        colorProfiles: customSettings?.colorProfiles || this.defaultSettings.colorProfiles,
        regionOfInterest: customSettings?.regionOfInterest || this.defaultSettings.regionOfInterest
      };
      
      // Frame skipping for performance (process every Nth frame)
      this.frameCounter++;
      if (this.frameCounter % 3 !== 0) {
        // Return previous result for skipped frames
        if (this.previousDetectionData) {
          return {
            detected: this.previousDetectionData.detected,
            confidence: this.previousDetectionData.confidence,
            detectionData: { 
              ...this.previousDetectionData.detectionData,
              skippedFrame: true
            }
          };
        }
      }
      this.frameCounter = 0;
      
      // Apply image enhancement if enabled
      let canvas;
      if (settings.enhanceImage) {
        canvas = ImageEnhancementService.enhanceImage(imageElement);
        
        // Apply perspective correction/ROI if specified
        if (settings.regionOfInterest) {
          canvas = ImageEnhancementService.applyPerspectiveCorrection(
            canvas, 
            settings.regionOfInterest
          );
        }
      } else {
        // Create a canvas without enhancement
        canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        // Set canvas dimensions to match the image
        canvas.width = imageElement.width || 300;
        canvas.height = imageElement.height || 300;
        
        // Draw the image to the canvas
        context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
      }
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Get image data for analysis
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // STEP 1: Motion Detection (inspired by OpenCV code)
      let motionDetected = false;
      let motionArea = 0;
      let diffImage: Uint8ClampedArray | null = null;
      
      if (this.previousFrame) {
        // Create difference image between frames
        diffImage = new Uint8ClampedArray(pixels.length);
        let changedPixels = 0;
        
        for (let i = 0; i < pixels.length; i += 4) {
          // Calculate absolute difference for each channel
          const rDiff = Math.abs(pixels[i] - this.previousFrame.data[i]);
          const gDiff = Math.abs(pixels[i + 1] - this.previousFrame.data[i + 1]);
          const bDiff = Math.abs(pixels[i + 2] - this.previousFrame.data[i + 2]);
          
          // Average difference across channels
          const diff = (rDiff + gDiff + bDiff) / 3;
          
          // Apply threshold to identify significant changes
          const significant = diff > settings.motionThreshold;
          
          // Store binary difference result
          diffImage[i] = diffImage[i + 1] = diffImage[i + 2] = significant ? 255 : 0;
          diffImage[i + 3] = 255; // Alpha channel
          
          if (significant) {
            changedPixels++;
          }
        }
        
        // Calculate the percentage of pixels that changed
        motionArea = changedPixels / (pixels.length / 4) * 100;
        
        // Determine if motion is significant
        motionDetected = motionArea > (1.0 * settings.sensitivity / 100);
      }
      
      // Store current frame for next comparison
      this.previousFrame = new ImageData(
        new Uint8ClampedArray(pixels), 
        canvas.width, 
        canvas.height
      );
      
      // STEP 2: Color Profile Analysis
      // Initialize profile detection counters
      const profileCounts: Record<string, number> = {};
      settings.colorProfiles.forEach(profile => {
        profileCounts[profile.name] = 0;
      });
      
      // Adjust sampling interval based on sensitivity (higher sensitivity = more samples)
      const adjustedSampleInterval = Math.max(1, Math.floor(settings.sampleInterval * (100 - settings.sensitivity) / 50));
      
      // Analyze pixels to detect melt patterns
      let totalAnalyzedPixels = 0;
      
      for (let i = 0; i < pixels.length; i += adjustedSampleInterval * 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        totalAnalyzedPixels++;
        
        // Check against each color profile
        settings.colorProfiles.forEach(profile => {
          if (r >= profile.minR && r <= profile.maxR &&
              g >= profile.minG && g <= profile.maxG &&
              b >= profile.minB && b <= profile.maxB) {
            profileCounts[profile.name]++;
          }
        });
      }
      
      // Calculate weighted detection score
      let detectionScore = 0;
      let totalWeight = 0;
      
      settings.colorProfiles.forEach(profile => {
        const profilePercentage = (profileCounts[profile.name] / totalAnalyzedPixels) * 100;
        detectionScore += profilePercentage * profile.weight;
        totalWeight += Math.abs(profile.weight);
      });
      
      // Normalize detection score
      const normalizedScore = totalWeight > 0 ? (detectionScore / totalWeight) : 0;
      
      // Apply sensitivity threshold
      const adjustedThreshold = 5 * (settings.sensitivity / 50);
      
      // STEP 3: Combine color and motion detection
      let finalConfidence = Math.max(0, normalizedScore);
      let temporalChangeDetected = false;
      
      if (motionDetected) {
        // Boost confidence when motion is detected
        finalConfidence += motionArea * 0.5;
        temporalChangeDetected = true;
      }
      
      // Also incorporate previous temporal changes if available
      if (this.previousDetectionData) {
        const previousConfidence = this.previousDetectionData.confidence;
        const confidenceChange = Math.abs(finalConfidence - previousConfidence);
        
        if (confidenceChange > settings.temporalSensitivity * 10) {
          temporalChangeDetected = true;
          // Increase confidence when significant changes are detected
          finalConfidence += confidenceChange * settings.temporalSensitivity;
        }
      }
      
      // Determine if melting is detected
      const isMelting = finalConfidence > adjustedThreshold || 
                       (temporalChangeDetected && finalConfidence > adjustedThreshold * 0.7);
      
      // Counter to avoid false positives
      if (isMelting) {
        this.meltsDetectedCount++;
      } else {
        this.meltsDetectedCount = Math.max(0, this.meltsDetectedCount - 1);
      }
      
      // Only report a melt if we've seen it in multiple frames
      const confirmedMelting = this.meltsDetectedCount >= 3;
      
      // Prepare detection data
      const detectionData = {
        profileCounts,
        totalAnalyzed: totalAnalyzedPixels,
        normalizedScore,
        temporalChangeDetected,
        motionDetected,
        motionArea,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        timestamp: new Date().getTime(),
        diffImageData: diffImage
      };
      
      // Store detection data for temporal analysis
      this.previousDetectionData = {
        detected: confirmedMelting,
        confidence: finalConfidence,
        detectionData
      };
      
      return {
        detected: confirmedMelting,
        confidence: finalConfidence,
        detectionData
      };
    } catch (error) {
      console.error('Error in melt detection:', error);
      return { detected: false, confidence: 0 };
    }
  }
  
  /**
   * Initializes the detection service
   */
  static async initialize() {
    if (this.isInitialized) return;
    
    try {
      if (!this.isModelLoading) {
        this.isModelLoading = true;
        
        console.log('Initializing melt detection service with enhanced algorithms');
        
        this.isInitialized = true;
        this.isModelLoading = false;
      }
    } catch (error) {
      this.isModelLoading = false;
      console.error('Failed to initialize MeltDetectionService:', error);
      throw error;
    }
  }
  
  /**
   * Updates detection settings for custom detection scenarios
   * @param settings New detection settings
   */
  static updateSettings(settings: Partial<DetectionSettings>) {
    this.defaultSettings = {
      ...this.defaultSettings,
      ...settings,
      colorProfiles: settings.colorProfiles || this.defaultSettings.colorProfiles,
      regionOfInterest: settings.regionOfInterest || this.defaultSettings.regionOfInterest
    };
    
    // Reset previous detection data when settings change
    this.previousDetectionData = null;
  }
}
