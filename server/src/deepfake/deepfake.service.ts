import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';

@Injectable()
export class DeepfakeService {
    private dfServer: string;
    private readonly logger = new Logger(DeepfakeService.name);

    constructor(private configService: ConfigService) {
        this.dfServer = this.configService.get<string>('deepfakeServer');
    }

    async sendToPythonService(file: Express.Multer.File): Promise<{
        isDeepfake: boolean;
        confidence: number;
        faceDetected: boolean;
    }> {
        try {
            const formData = new FormData();
            formData.append('imageFile', file.buffer, {
                filename: file.originalname || 'image.jpg',
                contentType: file.mimetype || 'image/jpeg',
            });

            const response = await axios.post(
                this.dfServer + '/detect',
                formData,
                {
                    headers: formData.getHeaders(),
                    timeout: 30000,
                },
            );

            return {
                isDeepfake: response.data.isDeepfake,
                confidence: response.data.confidence,
                faceDetected: response.data.faceDetected,
            };
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    throw new BadRequestException(
                        `${error.response.data?.detail || 'Unknown error'}`,
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

    saveImageForTesting(imageFile: Buffer, callId: string): void {
        try {
            const filename = `test_${callId}_${Date.now()}.jpg`;
            const filePath = path.join(process.cwd(), 'test_images', filename);

            // Create directory if it doesn't exist
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(filePath, imageFile);

            // Delete after 30 seconds
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }, 1000 * 30);
        } catch (error) {
            this.logger.error(`Failed to save test image: ${error.message}`);
        }
    }
}
