import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';
import { TaskCategory, TransactionKind } from '../../generated/prisma/enums';

export class DayDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  declare date: string;
}

export class DashboardQueryDto extends DayDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  taskPage = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  transactionPage = 1;
}

export class CreateTaskDto extends DayDto {
  @IsUUID()
  declare clientId: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare title: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  declare time: string;

  @IsEnum(TaskCategory)
  declare category: TaskCategory;

  @IsInt()
  @Min(1)
  @Max(1440)
  declare durationMinutes: number;
}

export class UpdateTaskDto {
  @IsBoolean()
  declare isComplete: boolean;
}

class TransactionFieldsDto extends DayDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  declare title: string;

  @IsInt()
  @Min(-99999999)
  @Max(99999999)
  @NotEquals(0)
  declare amountInCents: number;

  @IsEnum(TransactionKind)
  declare kind: TransactionKind;
}

export class CreateTransactionDto extends TransactionFieldsDto {
  @IsUUID()
  declare clientId: string;
}

export class UpdateTransactionDto extends TransactionFieldsDto {}

export class SetBudgetDto {
  @IsIn(['food', 'housing', 'transport', 'other'])
  declare kind: TransactionKind;

  @IsInt()
  @Min(1)
  @Max(99999999)
  declare amountInCents: number;
}

export class SetBookmarkDto {
  @IsIn(['plan', 'spending', 'balance'])
  declare articleId: string;

  @IsBoolean()
  declare isSaved: boolean;
}

export class CreateFocusSessionDto extends DayDto {
  @IsUUID()
  declare clientId: string;
  @IsInt()
  @Min(1)
  @Max(86400)
  declare durationSeconds: number;
}
