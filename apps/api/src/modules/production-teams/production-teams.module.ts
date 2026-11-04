import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductionTeamsController } from './production-teams.controller';
import { ProductionTeamsService } from './production-teams.service';
import { ProductionTeamProfile, ProductionTeamProfileSchema } from './schemas/production-team.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProductionTeamProfile.name, schema: ProductionTeamProfileSchema },
    ]),
  ],
  controllers: [ProductionTeamsController],
  providers: [ProductionTeamsService],
  exports: [ProductionTeamsService],
})
export class ProductionTeamsModule {}
