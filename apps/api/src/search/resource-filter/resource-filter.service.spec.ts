import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SearchResult } from '../interfaces/search-result.interface';
import { ResourceFilter } from './resource-filter.service';

describe('ResourceFilter', () => {
  it('keeps resources from default search drive providers', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({ type: '115网盘', url: 'https://115.com/s/example' }),
      createResult({ type: '百度', url: 'https://pan.baidu.com/s/example' }),
      createResult({ type: '夸克网盘', url: 'https://pan.quark.cn/s/example' }),
      createResult({ type: '迅雷', url: 'https://pan.xunlei.com/s/example' }),
      createResult({ type: '阿里云盘', url: 'https://www.aliyundrive.com/s/example' }),
      createResult({ type: 'UC网盘', url: 'https://drive.uc.cn/s/example' }),
    ]);

    assert.deepEqual(results, [
      createResult({ type: '百度', url: 'https://pan.baidu.com/s/example' }),
      createResult({ type: '夸克网盘', url: 'https://pan.quark.cn/s/example' }),
      createResult({ type: '迅雷', url: 'https://pan.xunlei.com/s/example' }),
      createResult({ type: '阿里云盘', url: 'https://www.aliyundrive.com/s/example' }),
      createResult({ type: 'UC网盘', url: 'https://drive.uc.cn/s/example' }),
    ]);
  });

  it('filters every source outside the strict allow list', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({ type: '123云盘', url: 'https://www.123pan.com/s/example' }),
      createResult({ type: '123云盘', url: 'https://www.123684.com/s/example' }),
      createResult({ type: '天翼云盘', url: 'https://cloud.189.cn/t/example' }),
      createResult({ type: '115网盘', url: 'https://115.com/s/example' }),
      createResult({ type: 'PikPak', url: 'https://mypikpak.com/s/example' }),
      createResult({ type: '未知来源', url: 'https://example.com/s/example' }),
    ]);

    assert.deepEqual(results, []);
  });

  it('rejects allowed-looking source types when the url source is outside the allow list', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({ type: 'baidu', url: 'https://example-cdn.invalid/s/baidu' }),
      createResult({ type: '百度网盘', url: 'https://www.123pan.com/s/mislabelled' }),
      createResult({ type: 'quark', url: 'https://pan.quark.cn/s/quark' }),
    ]);

    assert.deepEqual(results, [
      createResult({ type: 'quark', url: 'https://pan.quark.cn/s/quark' }),
    ]);
  });

  it('rejects title bait and conflicting explicit source fields', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({
        type: '115网盘',
        source: '115',
        title: '百度资源合集',
        url: 'https://115.com/s/title-bait',
      }),
      createResult({
        type: '百度网盘',
        source: '115',
        title: '百度资源合集',
        url: 'https://pan.baidu.com/s/conflicting-source',
      }),
      createResult({
        type: '百度网盘',
        source: 'BAIDU',
        title: '百度资源合集',
        url: 'https://pan.baidu.com/s/valid-source',
      }),
    ]);

    assert.deepEqual(results, [
      createResult({
        type: '百度网盘',
        source: 'BAIDU',
        title: '百度资源合集',
        url: 'https://pan.baidu.com/s/valid-source',
      }),
    ]);
  });

  it('filters magnet resources', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({ type: '磁力链接', url: 'magnet:?xt=urn:btih:example' }),
      createResult({ type: '百度网盘', url: 'https://pan.baidu.com/s/example' }),
    ]);

    assert.deepEqual(results, [
      createResult({ type: '百度网盘', url: 'https://pan.baidu.com/s/example' }),
    ]);
  });

  it('filters ed2k and torrent resources', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({ type: '电驴链接', url: 'ed2k://example' }),
      createResult({ type: 'torrent', url: 'https://pan.baidu.com/s/example.torrent' }),
      createResult({ type: '百度网盘', url: 'https://pan.baidu.com/s/example' }),
    ]);

    assert.deepEqual(results, [
      createResult({ type: '百度网盘', url: 'https://pan.baidu.com/s/example' }),
    ]);
  });

  it('filters resources outside the allowed domains', () => {
    const filter = new ResourceFilter();

    const results = filter.filter([
      createResult({ type: '非白名单', url: 'https://example.com/s/example' }),
      createResult({ type: '百度网盘', url: 'https://pan.baidu.com/s/example' }),
    ]);

    assert.deepEqual(results, [
      createResult({ type: '百度网盘', url: 'https://pan.baidu.com/s/example' }),
    ]);
  });
});

function createResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    type: '百度网盘',
    title: '测试资源',
    url: 'https://pan.baidu.com/s/example',
    ...overrides,
  };
}
