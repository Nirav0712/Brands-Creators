import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User, UserSchema } from '../users/schemas/user.schema';
import { CreatorProfile, CreatorProfileSchema } from '../creators/schemas/creator.schema';
import { BrandProfile, BrandProfileSchema } from '../brands/schemas/brand.schema';
import { ProductionTeamProfile, ProductionTeamProfileSchema } from '../production-teams/schemas/production-team.schema';
import { Category, CategorySchema } from '../categories/schemas/category.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = (configService.get<string>('nodeEnv') || process.env.NODE_ENV || 'development').toLowerCase().trim();
        const accessSecret = configService.get<string>('jwt.accessSecret');

        if (nodeEnv === 'production') {
          if (!accessSecret || accessSecret.startsWith('dev_') || accessSecret.includes('dev_jwt')) {
            throw new Error(
              'SECURITY HARDENING FATAL: JWT_ACCESS_SECRET must be explicitly provided in production and cannot use development fallback.',
            );
          }
        }

        return {
          secret: accessSecret || 'dev_jwt_access_secret_brands_creators_2026',
          signOptions: {
            expiresIn: configService.get<string>('jwt.accessExpiresIn') || '15m',
          },
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CreatorProfile.name, schema: CreatorProfileSchema },
      { name: BrandProfile.name, schema: BrandProfileSchema },
      { name: ProductionTeamProfile.name, schema: ProductionTeamProfileSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
