import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SearchResult } from '@seven-ai-search/types';

export class SearchResultDto implements SearchResult {
  @ApiProperty({ example: '百度网盘' })
  type!: string;

  @ApiProperty({ example: '黑神话悟空全集' })
  title!: string;

  @ApiProperty({ example: 'https://pan.baidu.com/s/example', format: 'uri' })
  url!: string;

  @ApiPropertyOptional({
    example: 'BAIDU',
    description:
      'Standardized allow-listed drive source enum: BAIDU, QUARK, XUNLEI, ALIYUN, or UC.',
  })
  source?: string;

  @ApiPropertyOptional({ example: '2026-07-17T12:00:00+08:00', format: 'date-time' })
  createdAt?: string;

  @ApiPropertyOptional({ example: '2026-07-18T12:00:00+08:00', format: 'date-time' })
  updatedAt?: string;

  @ApiPropertyOptional({
    example: '2026-07-18T04:00:00.000Z',
    format: 'date-time',
    nullable: true,
    description: 'Trusted resource update or creation time, or null when unavailable.',
  })
  resourceTime?: string | null;
}
