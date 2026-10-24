import { Transform, type TransformFnParams } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { SearchRequest } from '@seven-ai-search/types';

export class SearchRequestDto implements SearchRequest {
  @ApiProperty({
    example: '黑神话悟空',
    description: 'Resource search keyword',
    minLength: 1,
    maxLength: 100,
  })
  @Transform(({ value }: TransformFnParams) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  keyword!: string;
}
