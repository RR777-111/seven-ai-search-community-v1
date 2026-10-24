import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DRIVE_SOURCE_OPTIONS,
  filterResultsByDriveSource,
  getDriveSourceCounts,
  type DriveSource,
  type SearchResultLike,
} from './search-results-filter.ts';

const results: readonly SearchResultLike[] = [
  { source: 'BAIDU', type: '百度网盘', title: '百度资源', url: 'https://pan.baidu.com/s/example' },
  { source: 'QUARK', type: '夸克网盘', title: '夸克资源', url: 'https://pan.quark.cn/s/example' },
  {
    source: 'XUNLEI',
    type: '迅雷云盘',
    title: '迅雷资源',
    url: 'https://pan.xunlei.com/s/example',
  },
  {
    source: 'ALIYUN',
    type: '阿里云盘',
    title: '阿里资源',
    url: 'https://www.aliyundrive.com/s/example',
  },
  { source: 'UC', type: 'UC 网盘', title: 'UC资源', url: 'https://drive.uc.cn/s/example' },
];

describe('filterResultsByDriveSource', () => {
  it('only exposes the five allow-list filter buttons plus all', () => {
    assert.deepEqual(
      DRIVE_SOURCE_OPTIONS.map((option) => option.label),
      ['全部', '百度', '夸克', '迅雷', '阿里', 'UC'],
    );
    assert.equal(
      DRIVE_SOURCE_OPTIONS.some((option) => /115|天翼|UNKNOWN|其他/u.test(option.label)),
      false,
    );
  });

  it('returns all results when all is selected', () => {
    assert.deepEqual(filterResultsByDriveSource(results, 'all'), results);
  });

  it('counts the complete allow-list result collection for every filter', () => {
    assert.deepEqual(getDriveSourceCounts([...results, results[0]]), {
      all: 6,
      BAIDU: 2,
      QUARK: 1,
      XUNLEI: 1,
      ALIYUN: 1,
      UC: 1,
    });
  });

  it('keeps all fail-closed to standardized allow-list sources', () => {
    const mixedResults: readonly SearchResultLike[] = [
      ...results,
      {
        source: 'UNKNOWN',
        type: 'UNKNOWN',
        title: '未知资源',
        url: 'https://example.com/s/unknown',
      },
      { source: '115', type: '115', title: '115资源', url: 'https://115.com/s/blocked' },
      {
        source: '天翼云盘',
        type: '天翼云盘',
        title: '天翼资源',
        url: 'https://cloud.189.cn/t/blocked',
      },
      { type: '影视', title: '无来源资源', url: 'https://example.com/s/no-source' },
    ];

    assert.deepEqual(filterResultsByDriveSource(mixedResults, 'all'), results);
  });

  it('does not render unknown sources for a specific allow-list filter', () => {
    const mixedResults: readonly SearchResultLike[] = [
      {
        source: 'UNKNOWN',
        type: 'UNKNOWN',
        title: '未知资源',
        url: 'https://example.com/s/unknown',
      },
      {
        source: 'BAIDU',
        type: '百度网盘',
        title: '百度资源',
        url: 'https://pan.baidu.com/s/example',
      },
    ];

    assert.deepEqual(filterResultsByDriveSource(mixedResults, 'BAIDU'), [
      {
        source: 'BAIDU',
        type: '百度网盘',
        title: '百度资源',
        url: 'https://pan.baidu.com/s/example',
      },
    ]);
  });

  it('falls back to the result type when source is missing', () => {
    const typedResults: readonly SearchResultLike[] = [
      { type: '百度网盘', title: '百度资源', url: 'https://pan.baidu.com/s/example' },
      { type: '夸克网盘', title: '夸克资源', url: 'https://pan.quark.cn/s/example' },
    ];

    assert.deepEqual(filterResultsByDriveSource(typedResults, 'QUARK'), [
      { type: '夸克网盘', title: '夸克资源', url: 'https://pan.quark.cn/s/example' },
    ]);
  });

  it('normalizes common source aliases used by search payloads', () => {
    const aliResults: readonly SearchResultLike[] = [
      {
        source: 'ali',
        type: '软件',
        title: '阿里别名资源',
        url: 'https://www.alipan.com/s/example',
      },
      {
        source: 'aliyun',
        type: '软件',
        title: '阿里云别名资源',
        url: 'https://www.aliyundrive.com/s/example',
      },
    ];

    assert.deepEqual(filterResultsByDriveSource(aliResults, 'ALIYUN'), aliResults);
  });

  (
    [
      ['BAIDU', '百度资源'],
      ['QUARK', '夸克资源'],
      ['XUNLEI', '迅雷资源'],
      ['ALIYUN', '阿里资源'],
      ['UC', 'UC资源'],
    ] satisfies ReadonlyArray<readonly [DriveSource, string]>
  ).forEach(([source, expectedTitle]) => {
    it(`returns only ${source} results`, () => {
      assert.deepEqual(filterResultsByDriveSource(results, source), [
        results.find((result) => result.title === expectedTitle),
      ]);
    });
  });
});
