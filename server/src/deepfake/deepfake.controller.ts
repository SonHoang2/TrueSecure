import {
    Controller,
    Post,
    Body,
    BadRequestException,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DeepfakeService } from './deepfake.service';

@Controller('deepfake')
export class DeepfakeController {
    constructor(private readonly deepfakeService: DeepfakeService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('image'))
    async analyzeBase64(
        @UploadedFile() file: Express.Multer.File,
        // @Body('callId') callId: string,
    ) {
        if (!file) {
            throw new BadRequestException('No image file provided');
        }

        if (!file.mimetype.startsWith('image/')) {
            throw new BadRequestException(
                'Invalid file type. Only images are allowed',
            );
        }

        // this.deepfakeService.saveImageForTesting(file.buffer, callId);

        const result = await this.deepfakeService.sendToPythonService(file);

        return result;
    }
}
