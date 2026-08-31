import { Module } from '@nestjs/common';
import { PaymentsModule } from './payments/payments.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: Number(configService.getOrThrow<string>('DATABASE_PORT')),
        username: configService.getOrThrow<string>('DATABASE_USER'),
        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
        database: configService.getOrThrow<string>('DATABASE_NAME'),

        autoLoadEntities: true,
        synchronize: false,
      }),
    }),

    PaymentsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
