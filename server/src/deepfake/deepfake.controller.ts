import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { DeepfakeService } from './deepfake.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

@Controller('deepfake')
export class DeepfakeController {
    constructor(private readonly deepfakeService: DeepfakeService) {}

    @Post('analyze-base64')
    async analyzeBase64(
        @Body('image') base64Image: string,
        @Body('callId') callId: string,
        @Body('timestamp') timestamp: string,
    ) {
        console.log('Received base64 upload:', {
            imageLength: base64Image ? base64Image.length : 0,
            callId,
            timestamp,
        });

        if (!base64Image || !base64Image.startsWith('data:image/')) {
            throw new BadRequestException('Invalid base64 image format');
        }

        this.saveImageForTesting(base64Image, callId);

        const result = await this.sendToPythonService(base64Image);

        console.log('Base64 image analysis result:', result);

        return {
            success: true,
            message: 'Base64 image analyzed successfully',
            result: result,
            callId,
            timestamp,
        };
    }

    private async sendToPythonService(base64Image: string) {
        try {
            console.log('Sending base64 image to Python service...');

            const response = await axios.post(
                'http://localhost:8000/detect-base64',
                {
                    image: base64Image,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                },
            );

            console.log('Python service response:', response.data);

            const result = response.data;

            if (!result || result.status !== 'success') {
                throw new Error(
                    `Python service failed: ${result?.message || 'Unknown error'}`,
                );
            }

            return result;
        } catch (error) {
            console.error('Error calling Python service:', error);
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    throw new BadRequestException(
                        `Python service error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`,
                    );
                } else if (error.request) {
                    throw new BadRequestException(
                        'Unable to connect to Python service',
                    );
                }
            }

            throw new BadRequestException(
                `Failed to analyze image: ${error.message}`,
            );
        }
    }

    private saveImageForTesting(base64Image: string, callId: string): void {
        try {
            const base64Data = base64Image.split(',')[1];
            const filename = `test_${callId}_${Date.now()}.jpg`;
            const filePath = path.join(process.cwd(), 'test_images', filename);

            // Create directory if it doesn't exist
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, base64Data, 'base64');
            console.log(`[TEST] Image saved: ${filePath}`);

            // Auto-delete after 1 minute for testing
            setTimeout(
                () => {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`[TEST] Image deleted: ${filePath}`);
                    }
                },
                1000 * 60 * 1,
            );
        } catch (error) {
            console.error('[TEST] Error saving image:', error);
        }
    }
}
