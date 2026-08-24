import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { TransfersModule } from './transfers/transfers.module';
import { BudgetsModule } from './budgets/budgets.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { LoansModule } from './loans/loans.module';
import { GoalsModule } from './goals/goals.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BackupModule } from './backup/backup.module';
import { FxModule } from './fx/fx.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AccountsModule,
    TransactionsModule,
    TransfersModule,
    BudgetsModule,
    SubscriptionsModule,
    LoansModule,
    GoalsModule,
    AnalyticsModule,
    BackupModule,
    FxModule,
  ],
})
export class AppModule {}

