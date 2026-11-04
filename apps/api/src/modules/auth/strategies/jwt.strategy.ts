import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { UserStatus } from '@brands-creators/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    const nodeEnv = (configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase().trim();
    const accessSecret = configService.get<string>('jwt.accessSecret');

    if (nodeEnv === 'production') {
      if (!accessSecret || accessSecret.startsWith('dev_') || accessSecret.includes('dev_jwt')) {
        throw new Error(
          'SECURITY HARDENING FATAL: JWT_ACCESS_SECRET must be explicitly provided in production and cannot use development fallback.',
        );
      }
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret || 'dev_jwt_access_secret_brands_creators_2026',
    });
  }

  async validate(payload: { sub: string; email: string; roles: string[] }): Promise<any> {
    const user = await this.userModel.findById(payload.sub).lean().exec();

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('Your account is inactive or suspended. Please contact support.');
    }

    return {
      ...user,
      id: user._id.toString(),
      userId: user._id.toString(),
      sub: user._id.toString(),
    };
  }
}
