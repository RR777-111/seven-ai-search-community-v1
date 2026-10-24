import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchProviderTimeoutException } from '../interfaces/search-provider.interface';
import { PanSouAdapter } from './pansou.adapter';

describe('PanSouAdapter', () => {
  it('preserves timeout failures so the search service does not retry them', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new DOMException('The operation timed out.', 'TimeoutError');
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    await assert.rejects(
      () => createAdapter().search('超时资源', { timeoutMs: 10 }),
      SearchProviderTimeoutException,
    );
  });

  it('requests merged PanSou results and maps them to the standard search result shape', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
      assert.equal(String(input), 'http://pansou.test/api/search');
      assert.equal(init?.method, 'POST');
      assert.deepEqual(JSON.parse(String(init?.body)), {
        kw: '黑神话悟空',
        res: 'merge',
        cloud_types: ['baidu', 'quark', 'xunlei', 'aliyun', 'uc'],
      });

      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            total: 5,
            merged_by_type: {
              115: [
                {
                  url: 'https://115.com/s/example',
                  note: '黑神话悟空 115',
                },
              ],
              baidu: [
                {
                  url: 'https://pan.baidu.com/s/example',
                  note: '黑神话悟空全集',
                },
              ],
              quark: [
                {
                  url: 'https://pan.quark.cn/s/example',
                  note: '黑神话悟空 4K',
                },
              ],
              uc: [
                {
                  url: 'https://drive.uc.cn/s/example',
                  note: '黑神话悟空 UC',
                },
              ],
              xunlei: [
                {
                  url: 'https://pan.xunlei.com/s/example',
                  note: '黑神话悟空 迅雷',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('黑神话悟空');

    assert.deepEqual(results, [
      {
        source: 'BAIDU',
        type: '百度网盘',
        title: '黑神话悟空全集',
        url: 'https://pan.baidu.com/s/example',
      },
      {
        source: 'QUARK',
        type: '夸克网盘',
        title: '黑神话悟空 4K',
        url: 'https://pan.quark.cn/s/example',
      },
      {
        source: 'UC',
        type: 'UC网盘',
        title: '黑神话悟空 UC',
        url: 'https://drive.uc.cn/s/example',
      },
      {
        source: 'XUNLEI',
        type: '迅雷云盘',
        title: '黑神话悟空 迅雷',
        url: 'https://pan.xunlei.com/s/example',
      },
    ]);
  });

  it('maps direct PanSou result arrays with title fields', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: [
            {
              type: 'aliyun',
              title: '金特务 阿里资源',
              url: 'https://www.aliyundrive.com/s/example',
            },
            {
              type: '123',
              title: '金特务 123云盘',
              url: 'https://www.123pan.com/s/example',
            },
            {
              type: '百度网盘',
              title: '金特务 123684误标资源',
              url: 'https://www.123684.com/s/mislabelled',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('金特务');

    assert.deepEqual(results, [
      {
        source: 'ALIYUN',
        type: '阿里云盘',
        title: '金特务 阿里资源',
        url: 'https://www.aliyundrive.com/s/example',
      },
    ]);
  });

  it('maps cloud source and resource timestamps when PanSou provides them', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              baidu: [
                {
                  url: 'https://pan.baidu.com/s/timestamps',
                  note: '时间字段资源',
                  created_at: '2026-07-17T12:00:00+08:00',
                  updated_at: '2026-07-18T12:00:00+08:00',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('时间字段资源');

    assert.deepEqual(results, [
      {
        source: 'BAIDU',
        type: '百度网盘',
        title: '时间字段资源',
        url: 'https://pan.baidu.com/s/timestamps',
        createdAt: '2026-07-17T12:00:00+08:00',
        updatedAt: '2026-07-18T12:00:00+08:00',
      },
    ]);
  });

  it('maps PanSou datetime values and ignores zero-date placeholders', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              aliyun: [
                {
                  url: 'https://www.alipan.com/s/dated-resource',
                  note: '真实日期资源',
                  datetime: '2024-06-02T14:25:55Z',
                },
                {
                  url: 'https://www.alipan.com/s/placeholder-date',
                  note: '占位日期资源',
                  datetime: '0001-01-01T00:00:00Z',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('日期资源');

    assert.deepEqual(results, [
      {
        source: 'ALIYUN',
        type: '阿里云盘',
        title: '真实日期资源',
        url: 'https://www.alipan.com/s/dated-resource',
        createdAt: '2024-06-02T14:25:55Z',
      },
      {
        source: 'ALIYUN',
        type: '阿里云盘',
        title: '占位日期资源',
        url: 'https://www.alipan.com/s/placeholder-date',
      },
    ]);
  });

  it('keeps PanSou links searchable when timestamp fields are missing', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              quark: [
                {
                  url: 'https://pan.quark.cn/s/no-timestamp',
                  note: '缺少时间字段资源',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('缺少时间字段资源');

    assert.deepEqual(results, [
      {
        source: 'QUARK',
        type: '夸克网盘',
        title: '缺少时间字段资源',
        url: 'https://pan.quark.cn/s/no-timestamp',
      },
    ]);
  });

  it('normalizes only strict allow-list sources and discards unsupported sources', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              115: [{ url: 'https://115.com/s/115', note: '115资源' }],
              baidu: [{ url: 'https://pan.baidu.com/s/baidu', note: '百度资源' }],
              quark: [{ url: 'https://pan.quark.cn/s/quark', note: '夸克资源' }],
              aliyun: [{ url: 'https://www.aliyundrive.com/s/aliyun', note: '阿里资源' }],
              xunlei: [{ url: 'https://pan.xunlei.com/s/xunlei', note: '迅雷资源' }],
              uc: [{ url: 'https://drive.uc.cn/s/uc', note: 'UC资源' }],
              123: [{ url: 'https://www.123pan.com/s/hidden', note: '123资源' }],
              tianyi: [{ url: 'https://cloud.189.cn/t/hidden', note: '天翼资源' }],
              pikpak: [{ url: 'https://mypikpak.com/s/hidden', note: 'PikPak资源' }],
              unknown: [{ url: 'https://example.com/s/hidden', note: '未知资源' }],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('金特务');

    assert.deepEqual(
      results.map((result) => result.type),
      ['百度网盘', '夸克网盘', '阿里云盘', '迅雷云盘', 'UC网盘'],
    );
    assert.deepEqual(
      results.map((result) => result.source),
      ['BAIDU', 'QUARK', 'ALIYUN', 'XUNLEI', 'UC'],
    );
  });

  it('uses merged_by_type group keys when item source fields are missing or non-drive names', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              baidu: [
                {
                  source: 'tg-channel-crawler',
                  title: '海贼王 百度资源',
                  url: 'https://pan.baidu.com/s/baidu-context',
                },
              ],
              quark: [
                {
                  provider: 'quark',
                  title: '海贼王 夸克资源',
                  url: 'https://pan.quark.cn/s/quark-context',
                },
              ],
              xunlei: [
                {
                  diskType: 'xunlei',
                  title: '海贼王 迅雷资源',
                  url: 'https://pan.xunlei.com/s/xunlei-context',
                },
              ],
              aliyun: [
                {
                  category: 'alipan',
                  title: '海贼王 阿里资源',
                  url: 'https://www.alipan.com/s/aliyun-context',
                },
              ],
              uc: [
                {
                  drive: 'uc cloud',
                  title: '海贼王 UC资源',
                  url: 'https://drive.uc.cn/s/uc-context',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('海贼王');

    assert.deepEqual(
      results.map((result) => result.source),
      ['BAIDU', 'QUARK', 'XUNLEI', 'ALIYUN', 'UC'],
    );
    assert.deepEqual(
      results.map((result) => result.type),
      ['百度网盘', '夸克网盘', '迅雷云盘', '阿里云盘', 'UC网盘'],
    );
  });

  it('drops blocked or conflicting source metadata even when titles mention allowed drives', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              baidu: [
                {
                  source: '115网盘',
                  title: '标题含百度但实际 115 来源',
                  url: 'https://pan.baidu.com/s/blocked-source',
                },
                {
                  source: 'quark',
                  title: '冲突来源字段',
                  url: 'https://pan.baidu.com/s/conflicting-source',
                },
              ],
              115: [
                {
                  title: '标题含百度的 115 链接',
                  url: 'https://115.com/s/title-bait',
                },
              ],
              tianyi: [
                {
                  title: '天翼链接',
                  url: 'https://cloud.189.cn/t/blocked',
                },
              ],
              other: [
                {
                  title: '其他网盘链接',
                  url: 'https://example.com/s/blocked',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('海贼王');

    assert.deepEqual(results, []);
  });

  it('maps a redacted real PanSou mixed fixture to five whitelisted drive results', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              115: [
                { source: '115网盘', title: '海贼王 115 A', url: 'https://115.com/s/a' },
                { source: '115网盘', title: '海贼王 115 B', url: 'https://115.com/s/b' },
              ],
              aliyun: [
                {
                  category: 'alipan',
                  title: '海贼王 阿里',
                  url: 'https://www.alipan.com/s/a',
                },
              ],
              baidu: [
                {
                  source: '百度网盘',
                  title: '海贼王 百度',
                  url: 'https://pan.baidu.com/s/a',
                },
              ],
              other: [{ source: '其他网盘', title: '海贼王 其他', url: 'https://example.com/s/a' }],
              quark: [
                {
                  provider: 'quark',
                  title: '海贼王 夸克',
                  url: 'https://pan.quark.cn/s/a',
                },
              ],
              tianyi: [
                { source: '天翼云盘', title: '海贼王 天翼', url: 'https://cloud.189.cn/t/a' },
              ],
              uc: [{ drive: 'uc cloud', title: '海贼王 UC', url: 'https://drive.uc.cn/s/a' }],
              xunlei: [
                {
                  diskType: 'xunlei',
                  title: '海贼王 迅雷',
                  url: 'https://pan.xunlei.com/s/a',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('海贼王');

    assert.equal(results.length, 5);
    assert.deepEqual(results.map((result) => result.source).sort(), [
      'ALIYUN',
      'BAIDU',
      'QUARK',
      'UC',
      'XUNLEI',
    ]);
  });

  it('reads explicit source fields and never trusts a title bait source', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            results: [
              {
                category: '百度网盘',
                title: '分类字段百度资源',
                link: 'https://pan.baidu.com/s/category',
              },
              {
                drive: 'quark',
                name: 'drive 字段夸克资源',
                shareUrl: 'https://pan.quark.cn/s/drive',
              },
              {
                diskType: 'xunlei',
                note: 'diskType 字段迅雷资源',
                share_url: 'https://pan.xunlei.com/s/disk-type',
              },
              {
                source: '115',
                title: '标题里有百度的 115 资源',
                url: 'https://115.com/s/title-bait',
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('来源字段');

    assert.deepEqual(results, [
      {
        source: 'BAIDU',
        type: '百度网盘',
        title: '分类字段百度资源',
        url: 'https://pan.baidu.com/s/category',
      },
      {
        source: 'QUARK',
        type: '夸克网盘',
        title: 'drive 字段夸克资源',
        url: 'https://pan.quark.cn/s/drive',
      },
      {
        source: 'XUNLEI',
        type: '迅雷云盘',
        title: 'diskType 字段迅雷资源',
        url: 'https://pan.xunlei.com/s/disk-type',
      },
    ]);
  });

  it('falls back from title to name and note when mapping PanSou links', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          code: 0,
          message: 'success',
          data: {
            merged_by_type: {
              baidu: [
                {
                  url: 'https://pan.baidu.com/s/name',
                  name: '海贼王 name 资源',
                },
                {
                  url: 'https://pan.baidu.com/s/note',
                  note: '海贼王 note 资源',
                },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('海贼王');

    assert.deepEqual(
      results.map((result) => result.title),
      ['海贼王 name 资源', '海贼王 note 资源'],
    );
  });

  it('returns an empty array when PanSou has no matching results', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ code: 0, message: 'success', data: { total: 0 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    const results = await createAdapter().search('不存在的资源');

    assert.deepEqual(results, []);
  });

  it('returns a service-unavailable exception when PanSou cannot be reached', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    await assert.rejects(
      () => createAdapter().search('黑神话悟空'),
      (error: unknown) => error instanceof ServiceUnavailableException,
    );
  });

  it('returns a bad-gateway exception for an invalid PanSou response', async (t) => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({ code: 0, message: 'success', data: { merged_by_type: [] } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }) as typeof fetch;
    t.after(() => {
      globalThis.fetch = originalFetch;
    });

    await assert.rejects(
      () => createAdapter().search('黑神话悟空'),
      (error: unknown) => error instanceof BadGatewayException,
    );
  });
});

function createAdapter(): PanSouAdapter {
  return new PanSouAdapter(
    new ConfigService({
      PANSOU_BASE_URL: 'http://pansou.test',
      PANSOU_TIMEOUT_MS: '1000',
    }),
  );
}
