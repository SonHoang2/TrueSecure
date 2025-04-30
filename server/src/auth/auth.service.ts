import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Injectable()
export class AuthService {
    // constructor(
    //     @InjectRepository(User)
    //     private readonly userRepository: Repository<User>,
    //     private readonly jwtService: JwtService,
    // ) { }

    login(createAuthDto: CreateAuthDto) {}
}
