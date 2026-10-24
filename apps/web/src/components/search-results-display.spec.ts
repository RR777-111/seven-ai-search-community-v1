import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getSearchResultsEndLabel,
  formatSearchResultsEmptyMessage,
  formatUpdatedAt,
  getSearchResultCardFields,
} from './search-results-display.ts';

describe('search results display helpers', () => {
  it('builds the successful result card fields', () => {
    const fields = getSearchResultCardFields({
      source: 'QUARK',
      type: '夸克网盘',
      title: '黑神话悟空合集',
      url: 'https://pan.quark.cn/s/example',
      resourceTime: '2026-07-18T12:00:00.000Z',
    });

    assert.deepEqual(fields, {
      sourceLabel: '夸克网盘',
      title: '黑神话悟空合集',
      updatedAtText: '2026-07-18',
      url: 'https://pan.quark.cn/s/example',
      copyButtonLabel: '复制链接',
    });
  });

  it('falls back to result type when source is missing', () => {
    const fields = getSearchResultCardFields({
      type: '百度网盘',
      title: '黑神话悟空合集',
      url: 'https://pan.baidu.com/s/example',
    });

    assert.equal(fields.sourceLabel, '百度网盘');
  });

  it('formats the XUNLEI source enum for card labels', () => {
    const fields = getSearchResultCardFields({
      source: 'XUNLEI',
      type: '迅雷云盘',
      title: '黑神话悟空合集',
      url: 'https://pan.xunlei.com/s/example',
    });

    assert.equal(fields.sourceLabel, '迅雷云盘');
  });

  (
    [
      ['BAIDU', '百度网盘'],
      ['QUARK', '夸克网盘'],
      ['XUNLEI', '迅雷云盘'],
      ['ALIYUN', '阿里云盘'],
      ['UC', 'UC 网盘'],
    ] as const
  ).forEach(([source, expectedLabel]) => {
    it(`formats ${source} as ${expectedLabel}`, () => {
      const fields = getSearchResultCardFields({
        source,
        type: source,
        title: '海贼王',
        url: 'https://example.com/resource',
      });

      assert.equal(fields.sourceLabel, expectedLabel);
      assert.equal(
        Object.values(fields).some((value) => /provider|diskType|UNKNOWN/u.test(value)),
        false,
      );
    });
  });

  it('shows unknown time when resource time is missing or invalid', () => {
    assert.equal(formatUpdatedAt(undefined), '未知时间');
    assert.equal(formatUpdatedAt(null), '未知时间');
    assert.equal(formatUpdatedAt('not-a-date'), '未知时间');
  });

  it('formats valid resource time as YYYY-MM-DD', () => {
    assert.equal(formatUpdatedAt('2026-07-18T12:00:00.000Z'), '2026-07-18');
  });

  it('formats the end-of-results message', () => {
    assert.equal(getSearchResultsEndLabel(), '客官，已经没有了哦～');
  });

  it('formats distinct empty result messages for global and source filters', () => {
    assert.equal(formatSearchResultsEmptyMessage(), '暂未找到相关资源，请换个关键词试试。');
    assert.equal(
      formatSearchResultsEmptyMessage({ selectedSource: 'BAIDU', sourceLabel: '百度' }),
      '当前筛选下暂无 百度 网盘资源，请切换全部或其他网盘查看。',
    );
  });
});
