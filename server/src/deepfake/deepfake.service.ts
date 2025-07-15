import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as FormData from 'form-data';

@Injectable()
export class DeepfakeService {
    private dfServer: string;

    constructor(private configService: ConfigService) {
        this.dfServer = this.configService.get<string>('deepfakeServer');
    }

    async sendToPythonService(file: Express.Multer.File): Promise<{
        is_deepfake: boolean;
        confidence: number;
    }> {
        try {
            console.log(
                'Sending image to Python service (FormData):',
                this.dfServer,
            );

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

            // Auto-delete after 3 minute for testing
            setTimeout(
                () => {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                },
                1000 * 60 * 3,
            );
        } catch (error) {
            console.error('[TEST] Error saving image:', error);
        }
    }
}
