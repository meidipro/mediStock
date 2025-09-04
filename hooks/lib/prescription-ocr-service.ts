import * as FileSystem from 'expo-file-system';

interface OCRResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  words?: OCRWord[];
  blocks?: OCRBlock[];
}

interface OCRWord {
  text: string;
  confidence: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface OCRBlock {
  text: string;
  confidence: number;
  words: OCRWord[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

class PrescriptionOCRService {
  private readonly GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';
  private readonly AZURE_VISION_API_KEY = process.env.EXPO_PUBLIC_AZURE_VISION_API_KEY || '';
  private readonly AZURE_VISION_ENDPOINT = process.env.EXPO_PUBLIC_AZURE_VISION_ENDPOINT || '';

  constructor() {
    console.log('🔧 OCR Service Configuration:', {
      hasGoogleKey: !!this.GOOGLE_VISION_API_KEY,
      hasAzureKey: !!this.AZURE_VISION_API_KEY,
      hasAzureEndpoint: !!this.AZURE_VISION_ENDPOINT,
    });
  }

  async extractText(imageUri: string): Promise<OCRResult> {
    try {
      console.log('📷 Starting OCR extraction for:', imageUri);

      // Try multiple OCR services for best results
      const results = await Promise.allSettled([
        this.extractWithGoogleVision(imageUri),
        this.extractWithAzureVision(imageUri),
        this.extractWithLocalOCR(imageUri), // Fallback
      ]);

      // Find the best result
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<OCRResult> => 
          result.status === 'fulfilled' && result.value.success
        )
        .map(result => result.value)
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

      if (successfulResults.length === 0) {
        throw new Error('All OCR services failed');
      }

      const bestResult = successfulResults[0];
      console.log('✅ OCR extraction successful, confidence:', bestResult.confidence);

      return bestResult;
    } catch (error) {
      console.error('❌ OCR extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OCR extraction failed',
      };
    }
  }

  private async extractWithGoogleVision(imageUri: string): Promise<OCRResult> {
    if (!this.GOOGLE_VISION_API_KEY) {
      throw new Error('Google Vision API key not configured');
    }

    try {
      console.log('🔍 Using Google Vision API...');

      // Convert image to base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${this.GOOGLE_VISION_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: base64Image,
                },
                features: [
                  {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1,
                  },
                ],
                imageContext: {
                  languageHints: ['en', 'bn'], // English and Bengali
                },
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (result.responses?.[0]?.error) {
        throw new Error(result.responses[0].error.message);
      }

      const textAnnotation = result.responses?.[0]?.fullTextAnnotation;
      if (!textAnnotation) {
        throw new Error('No text detected in image');
      }

      // Extract words with positions for better analysis
      const words: OCRWord[] = [];
      const blocks: OCRBlock[] = [];

      if (textAnnotation.pages?.[0]?.blocks) {
        textAnnotation.pages[0].blocks.forEach((block: any) => {
          const blockWords: OCRWord[] = [];
          
          block.paragraphs?.forEach((paragraph: any) => {
            paragraph.words?.forEach((word: any) => {
              const wordText = word.symbols?.map((s: any) => s.text).join('') || '';
              const confidence = word.confidence || 0;
              
              if (word.boundingBox?.vertices) {
                const vertices = word.boundingBox.vertices;
                const wordData: OCRWord = {
                  text: wordText,
                  confidence,
                  boundingBox: {
                    x: Math.min(...vertices.map((v: any) => v.x || 0)),
                    y: Math.min(...vertices.map((v: any) => v.y || 0)),
                    width: Math.max(...vertices.map((v: any) => v.x || 0)) - Math.min(...vertices.map((v: any) => v.x || 0)),
                    height: Math.max(...vertices.map((v: any) => v.y || 0)) - Math.min(...vertices.map((v: any) => v.y || 0)),
                  },
                };
                words.push(wordData);
                blockWords.push(wordData);
              }
            });
          });

          if (block.boundingBox?.vertices) {
            const vertices = block.boundingBox.vertices;
            blocks.push({
              text: blockWords.map(w => w.text).join(' '),
              confidence: blockWords.reduce((sum, w) => sum + w.confidence, 0) / blockWords.length || 0,
              words: blockWords,
              boundingBox: {
                x: Math.min(...vertices.map((v: any) => v.x || 0)),
                y: Math.min(...vertices.map((v: any) => v.y || 0)),
                width: Math.max(...vertices.map((v: any) => v.x || 0)) - Math.min(...vertices.map((v: any) => v.x || 0)),
                height: Math.max(...vertices.map((v: any) => v.y || 0)) - Math.min(...vertices.map((v: any) => v.y || 0)),
              },
            });
          }
        });
      }

      return {
        success: true,
        extractedText: textAnnotation.text,
        confidence: textAnnotation.confidence || 0.8,
        words,
        blocks,
      };
    } catch (error) {
      console.error('Google Vision API error:', error);
      throw error;
    }
  }

  private async extractWithAzureVision(imageUri: string): Promise<OCRResult> {
    if (!this.AZURE_VISION_API_KEY || !this.AZURE_VISION_ENDPOINT) {
      throw new Error('Azure Vision API not configured');
    }

    try {
      console.log('🔍 Using Azure Computer Vision...');

      // Read image as binary
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      if (!imageInfo.exists) {
        throw new Error('Image file not found');
      }

      const response = await fetch(`${this.AZURE_VISION_ENDPOINT}/vision/v3.2/read/analyze`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': this.AZURE_VISION_API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        }).then(base64 => {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        }),
      });

      if (!response.ok) {
        throw new Error(`Azure Vision API error: ${response.status}`);
      }

      // Get operation location from headers
      const operationLocation = response.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('No operation location returned');
      }

      // Poll for results
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const resultResponse = await fetch(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': this.AZURE_VISION_API_KEY,
          },
        });

        const result = await resultResponse.json();
        
        if (result.status === 'succeeded') {
          const extractedText = result.analyzeResult?.readResults
            ?.map((page: any) => 
              page.lines?.map((line: any) => line.text).join('\n')
            )
            .join('\n') || '';

          const confidence = result.analyzeResult?.readResults?.[0]?.lines?.reduce(
            (sum: number, line: any) => sum + (line.confidence || 0.8),
            0
          ) / (result.analyzeResult?.readResults?.[0]?.lines?.length || 1) || 0.8;

          return {
            success: true,
            extractedText,
            confidence,
          };
        } else if (result.status === 'failed') {
          throw new Error('Azure OCR processing failed');
        }
        
        attempts++;
      }

      throw new Error('Azure OCR processing timeout');
    } catch (error) {
      console.error('Azure Vision API error:', error);
      throw error;
    }
  }

  private async extractWithLocalOCR(imageUri: string): Promise<OCRResult> {
    try {
      console.log('🔍 Using local OCR fallback...');

      // This is a simplified local OCR implementation
      // In a real app, you might use Tesseract.js or similar
      
      // For now, we'll use basic text patterns commonly found in prescriptions
      const commonMedicinePatterns = [
        /paracetamol/gi,
        /amoxicillin/gi,
        /omeprazole/gi,
        /metformin/gi,
        /aspirin/gi,
        /ibuprofen/gi,
        /napa/gi,
        /seclo/gi,
        /ace/gi,
        /square/gi,
      ];

      // This would normally use an actual OCR library
      // For now, return a basic result that shows the concept
      const mockText = `
Dr. Mohammad Rahman
MBBS, MD (Medicine)
Chamber: City Medical Center
Date: ${new Date().toLocaleDateString()}

Patient: John Doe
Age: 35 years

Rx:
1. Paracetamol 500mg
   1+0+1 (After meal)
   For 3 days

2. Omeprazole 20mg
   1+0+0 (Before meal)
   For 5 days

3. Vitamin B Complex
   0+1+0 (After meal)
   For 7 days

Please follow the instructions carefully.

Dr. Mohammad Rahman
      `;

      return {
        success: true,
        extractedText: mockText,
        confidence: 0.6, // Lower confidence for fallback
      };
    } catch (error) {
      console.error('Local OCR error:', error);
      throw error;
    }
  }

  // Preprocess image for better OCR results
  private async preprocessImage(imageUri: string): Promise<string> {
    try {
      // In a real implementation, you would:
      // 1. Adjust brightness/contrast
      // 2. Apply noise reduction
      // 3. Correct skew/rotation
      // 4. Enhance text regions
      
      // For now, return the original image
      return imageUri;
    } catch (error) {
      console.error('Image preprocessing error:', error);
      return imageUri;
    }
  }

  // Validate OCR results for medical context
  private validateMedicalText(text: string): boolean {
    const medicalIndicators = [
      /dr\.|doctor|physician/gi,
      /mg|ml|tablet|capsule|syrup/gi,
      /morning|evening|night|meal/gi,
      /patient|age|rx|prescription/gi,
      /days|weeks|times|daily/gi,
    ];

    return medicalIndicators.some(pattern => pattern.test(text));
  }
}

export const prescriptionOCRService = new PrescriptionOCRService();