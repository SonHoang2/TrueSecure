import {
    IsBoolean,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';

export class OfferDto {
    @IsObject()
    @IsNotEmpty()
    offer: any;

    @IsNumber()
    @IsNotEmpty()
    receiverId: number;

    @IsBoolean()
    @IsNotEmpty()
    isVideo: boolean;

    @IsObject()
    @IsOptional()
    sender?: any;
}

export class AnswerDto {
    @IsObject()
    @IsNotEmpty()
    answer: any;

    @IsNumber()
    @IsNotEmpty()
    receiverId: number;
}

export class IceCandidateDto {
    @IsObject()
    @IsNotEmpty()
    candidate: any;

    @IsNumber()
    @IsNotEmpty()
    receiverId: number;
}

export class CallActionDto {
    @IsNumber()
    @IsNotEmpty()
    receiverId: number;
}
