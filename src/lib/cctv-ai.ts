import { CCTVConfig, DetectedObject, MotionEvent } from '@/types/cctv';

// AI Service Interface
export interface AIService {
  initialize(): Promise<void>;
  detectObjects(imageData: ImageData): Promise<DetectedObject[]>;
  detectMotion(previousFrame: ImageData | null, currentFrame: ImageData): Promise<boolean>;
  analyzeBehavior(objects: DetectedObject[]): Promise<string[]>;
}

// Mock AI Service for demonstration
export class MockAIService implements AIService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    // Simulate AI model loading
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.isInitialized = true;
    console.log('Mock AI Service initialized');
  }

  async detectObjects(imageData: ImageData): Promise<DetectedObject[]> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 500));

    const objects: DetectedObject[] = [];
    const types: DetectedObject['type'][] = ['person', 'bag', 'phone', 'wallet', 'unknown'];
    
    // Generate random detections for demo
    const detectionCount = Math.floor(Math.random() * 4); // 0-3 objects
    
    for (let i = 0; i < detectionCount; i++) {
      objects.push({
        id: `obj-${Date.now()}-${i}`,
        type: types[Math.floor(Math.random() * types.length)],
        confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        boundingBox: {
          x: Math.random() * 0.8,
          y: Math.random() * 0.8,
          width: Math.random() * 0.15 + 0.05,
          height: Math.random() * 0.15 + 0.05
        },
        timestamp: new Date()
      });
    }

    return objects;
  }

  async detectMotion(previousFrame: ImageData | null, currentFrame: ImageData): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    // Simulate motion detection processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // If no previous frame, assume no motion for first frame
    if (!previousFrame) return false;
    
    // 20% chance of motion detection for demo
    return Math.random() < 0.2;
  }

  async analyzeBehavior(objects: DetectedObject[]): Promise<string[]> {
    if (!this.isInitialized) {
      throw new Error('AI service not initialized');
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const behaviors: string[] = [];
    
    // Simple behavior analysis based on detected objects
    const people = objects.filter(obj => obj.type === 'person');
    const items = objects.filter(obj => obj.type !== 'person');

    if (people.length > 0 && items.length > 0) {
      behaviors.push('Person with items detected');
    }

    if (people.length > 1) {
      behaviors.push('Multiple people in frame');
    }

    if (items.some(item => item.type === 'bag' && item.confidence > 0.8)) {
      behaviors.push('Bag left unattended');
    }

    if (items.some(item => item.type === 'phone' && item.confidence > 0.8)) {
      behaviors.push('Mobile phone detected');
    }

    return behaviors;
  }
}

// CCTV Management Service
export class CCTVManager {
  private aiService: AIService;
  private cameras: Map<string, CCTVConfig> = new Map();
  private detectionCallbacks: Map<string, (objects: DetectedObject[]) => void> = new Map();
  private motionCallbacks: Map<string, (event: MotionEvent) => void> = new Map();

  constructor(aiService: AIService) {
    this.aiService = aiService;
  }

  async initialize(): Promise<void> {
    await this.aiService.initialize();
    console.log('CCTV Manager initialized');
  }

  addCamera(camera: CCTVConfig): void {
    this.cameras.set(camera.id, camera);
  }

  removeCamera(cameraId: string): void {
    this.cameras.delete(cameraId);
    this.detectionCallbacks.delete(cameraId);
    this.motionCallbacks.delete(cameraId);
  }

  getCamera(cameraId: string): CCTVConfig | undefined {
    return this.cameras.get(cameraId);
  }

  getAllCameras(): CCTVConfig[] {
    return Array.from(this.cameras.values());
  }

  updateCamera(cameraId: string, updates: Partial<CCTVConfig>): void {
    const camera = this.cameras.get(cameraId);
    if (camera) {
      this.cameras.set(cameraId, {
        ...camera,
        ...updates,
        updatedAt: new Date()
      });
    }
  }

  onObjectDetected(cameraId: string, callback: (objects: DetectedObject[]) => void): void {
    this.detectionCallbacks.set(cameraId, callback);
  }

  onMotionDetected(cameraId: string, callback: (event: MotionEvent) => void): void {
    this.motionCallbacks.set(cameraId, callback);
  }

  async processFrame(cameraId: string, frame: ImageData): Promise<void> {
    const camera = this.cameras.get(cameraId);
    if (!camera) return;

    try {
      // Object detection
      if (camera.objectDetection) {
        const objects = await this.aiService.detectObjects(frame);
        if (objects.length > 0) {
          const callback = this.detectionCallbacks.get(cameraId);
          callback?.(objects);

          // Behavior analysis
          const behaviors = await this.aiService.analyzeBehavior(objects);
          if (behaviors.length > 0) {
            console.log(`Camera ${cameraId} behavior analysis:`, behaviors);
          }
        }
      }

      // Motion detection (would require previous frame)
      if (camera.motionDetection) {
        // For demo, we'll simulate motion detection with null previous frame
        const motionDetected = await this.aiService.detectMotion(null, frame);
        if (motionDetected) {
          const motionEvent: MotionEvent = {
            id: `motion-${Date.now()}`,
            cameraId,
            timestamp: new Date(),
            duration: Math.random() * 5000 + 1000, // 1-6 seconds
            intensity: Math.random(),
            reviewed: false
          };

          const callback = this.motionCallbacks.get(cameraId);
          callback?.(motionEvent);
        }
      }
    } catch (error) {
      console.error(`Error processing frame for camera ${cameraId}:`, error);
    }
  }

  getCameraStats(): { 
    online: number; 
    offline: number; 
    maintenance: number;
    total: number 
  } {
    const cameras = this.getAllCameras();
    const online = cameras.filter(c => c.status === 'online').length;
    const offline = cameras.filter(c => c.status === 'offline').length;
    const maintenance = cameras.filter(c => c.status === 'maintenance').length;
    
    return {
      online,
      offline,
      maintenance,
      total: cameras.length
    };
  }
}

// Export singleton instance
export const cctvManager = new CCTVManager(new MockAIService());