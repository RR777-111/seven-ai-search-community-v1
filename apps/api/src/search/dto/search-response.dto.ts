import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SearchResponse, SearchSourceCounts, SearchTiming } from '@seven-ai-search/types';
import { SearchResultDto } from './search-result.dto';

export class SearchResponseDto implements SearchResponse {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({
    type: SearchResultDto,
    isArray: true,
    example: [
      {
        source: 'BAIDU',
        type: '百度网盘',
        title: '黑神话悟空全集',
        url: 'https://pan.baidu.com/s/example',
      },
    ],
  })
  data!: SearchResultDto[];

  @ApiProperty({
    example: '未找到有效资源，请重新输入关键词',
    description:
      'Empty for successful results; otherwise explains that no valid resources matched.',
  })
  message!: string;

  @ApiProperty({ example: '2026-07-16T10:58:23.959Z', format: 'date-time' })
  timestamp!: string;

  @ApiPropertyOptional({ example: 100 })
  total?: number;

  @ApiPropertyOptional({ example: 1 })
  page?: number;

  @ApiPropertyOptional({ example: 500 })
  pageSize?: number;

  @ApiPropertyOptional({ example: 500 })
  maxResults?: number;

  @ApiPropertyOptional({ example: true })
  exhausted?: boolean;

  @ApiPropertyOptional({ example: false })
  truncated?: boolean;

  @ApiPropertyOptional({
    example: { BAIDU: 20, QUARK: 20, XUNLEI: 15, ALIYUN: 12, UC: 12 },
  })
  sourceCounts?: SearchSourceCounts;

  @ApiPropertyOptional({ example: false })
  cacheHit?: boolean;

  @ApiPropertyOptional({
    example: {
      requestId: 'd2026683-83bb-4c64-9050-736f23e179a1',
      cacheHit: false,
      queryOptimizeMs: 1,
      panSouMs: 2050,
      filterDedupeMs: 4,
      totalMs: 2068,
      rawCount: 80,
      validLinkCount: 80,
      relevantCount: 79,
      deduplicatedCount: 79,
      validCount: 79,
      exhausted: true,
      truncated: false,
    },
  })
  timing?: SearchTiming;
}
