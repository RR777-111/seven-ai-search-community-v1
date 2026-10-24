import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTitleRelevanceRank } from './search-relevance';

describe('getTitleRelevanceRank', () => {
  it('measures AI false positives and false negatives against observed search titles', () => {
    // Manually labeled titles from the isolated real PanSou search on 2026-10-24.
    const relevant = [
      '《AI图景：Sora时代的人工智能应用》(epub)',
      '《掌控AI进阶之路-中小学生探索人工智能》(epub)',
      '学习资料: 《人工智能+PPT超级表达力课，利用人工智能少改稿高效率，又快又好的完成PPT》',
      '学习资料: 《人工智能-必备数学基础》',
      '学习资料: 《强化学习必修课：引领人工智能新时代》',
      '学习资料: 《卢菁博士的人工智能体系课 (进阶版)》',
      '学习资料: 《小白也能听懂的人工智能原理》',
      '学习资料: 《开放科学：人工智能时代的呼唤》',
      '标题：开放科学：人工智能时代的呼唤 [计算机类]',
      '人工智能',
      '《人工智能时代与人类价值》(epub)',
      '《AI、通胀与武器》（azw3+epub+mobi+pdf)',
      '《AI中国方案》（azw3+epub+mobi+pdf)',
      '《指数型组织2.0：AI时代的增长新范式》（azw3+epub+mobi+pdf)',
      '《七弈万象：人类与AI博弈史》（azw3+epub+mobi+pdf)',
      '《我的第一本AI漫画：探秘DeepSeek》(epub)',
      '《AI大战略》(epub)',
      '学习资料: 《教材深度学习》',
    ];
    const unrelated = [
      'AI恋综《我的AI搭档—奇异恋爱（2026）》1080P 简中字幕 全06期',
      'AI恋综《我的AI搭档—奇异恋爱（2026）》1080P 简中字幕 全06期',
      'AI恋综《我的AI搭档—奇异恋爱（2026）》1080P 简中字幕 更新02期',
      'AI恋综《我的AI搭档—奇异恋爱（2026）》1080P 简中字幕 更新02期',
      'AI恋综《我的AI搭档—奇异恋爱(2026)》1080P 简中字幕 全06期',
    ];
    const falseNegatives = relevant.filter((title) => getTitleRelevanceRank(title, '人工智能') === null);
    const falsePositives = unrelated.filter((title) => getTitleRelevanceRank(title, '人工智能') !== null);
    assert.deepEqual(falseNegatives, []);
    assert.deepEqual(falsePositives, []);

    assert.notEqual(getTitleRelevanceRank('AI电影制作教程 1080P', '人工智能'), null);
    assert.notEqual(getTitleRelevanceRank('AI短剧创作实战课 第01集', '人工智能'), null);
    assert.notEqual(getTitleRelevanceRank('AI动画生成指南 ComfyUI 工作流', '人工智能'), null);
    assert.notEqual(getTitleRelevanceRank('AI动画生成指南 ComfyUI 工作流 1080P', '人工智能'), null);
    assert.notEqual(getTitleRelevanceRank('AI短剧从零到精通 1080P', '人工智能'), null);
    assert.notEqual(getTitleRelevanceRank('AI动画基础教材 1080P', '人工智能'), null);
    assert.notEqual(getTitleRelevanceRank('人工智能主题纪录片 1080P', '人工智能'), null);
    assert.equal(getTitleRelevanceRank('AI恋综《我的AI搭档》1080P', 'AI恋综'), 0);
    assert.equal(getTitleRelevanceRank('AI恋综《我的AI搭档》1080P', 'AI'), null);
    assert.equal(getTitleRelevanceRank('AI电影 1080P 双语字幕', 'artificial intelligence'), null);
  });

  it('removes unrelated entertainment without losing computer learning material', () => {
    assert.equal(getTitleRelevanceRank('海绵宝宝：皮老板大电影 (2025)', '计算机'), null);
    assert.equal(getTitleRelevanceRank('海绵宝宝：皮老板大电影 (2025)', '海绵宝宝'), 0);
    assert.equal(getTitleRelevanceRank('计算机基础教程与专业课程', '计算机'), 0);
    assert.equal(getTitleRelevanceRank('电脑入门教材', '计算机'), 1);
    assert.equal(getTitleRelevanceRank('Computer Science Course', '计算机'), 1);
    assert.equal(getTitleRelevanceRank('操作系统入门与实践', '计算机'), 2);
    assert.equal(getTitleRelevanceRank('尚硅谷 Linux 教程', '计算机'), 2);
    assert.equal(getTitleRelevanceRank('程序是怎样跑起来的', '计算机'), 2);
  });

  it('handles English, abbreviations, and generic learning suffixes conservatively', () => {
    assert.equal(getTitleRelevanceRank('Python教程：从零到精通', 'Python教程'), 0);
    assert.equal(getTitleRelevanceRank('Python 实战课程', 'Python教程'), 2);
    assert.equal(getTitleRelevanceRank('Java 教程', 'Python教程'), null);
    assert.equal(getTitleRelevanceRank('Python3基础教程', 'Python'), 0);
    assert.equal(getTitleRelevanceRank('Python3.12实战', 'Python教程'), 2);
    assert.equal(getTitleRelevanceRank('Pythonic 编程', 'Python'), null);
    assert.equal(getTitleRelevanceRank('Windows11使用指南', 'Windows'), 0);
    assert.equal(getTitleRelevanceRank('AI 入门课程', '人工智能'), 1);
    assert.equal(getTitleRelevanceRank('Artificial Intelligence Handbook', '人工智能'), 1);
    assert.equal(getTitleRelevanceRank('paid movie', '人工智能'), null);
    assert.equal(getTitleRelevanceRank('人工智能基础教程', 'AI'), 1);
    assert.equal(getTitleRelevanceRank('Grand Theft Auto V', 'gta5'), 1);
    assert.equal(getTitleRelevanceRank('人工智能基础教程', 'artificial intelligence'), 1);
    assert.equal(getTitleRelevanceRank('GTA5完整版', 'gta v'), 1);
    assert.equal(getTitleRelevanceRank('机器学习教材', '机器学习'), 0);
    assert.equal(getTitleRelevanceRank('机器人大电影', '机器学习'), null);
    assert.equal(getTitleRelevanceRank('深度秘密电视剧', '深度学习'), null);
    assert.equal(getTitleRelevanceRank('C语言基础', 'C++'), null);
    assert.equal(getTitleRelevanceRank('C#实战', 'C++'), null);
    assert.equal(getTitleRelevanceRank('JavaScript入门', 'C++'), null);
    assert.equal(getTitleRelevanceRank('C++ Primer', 'C#'), null);
    assert.equal(getTitleRelevanceRank('Internet原理', '.NET'), null);
    assert.equal(getTitleRelevanceRank('C Primer', 'C++ Primer'), null);
    assert.equal(getTitleRelevanceRank('C++ Primer', 'C# Primer'), null);
    assert.equal(getTitleRelevanceRank('Internet Core教程', '.NET Core'), null);
    assert.equal(getTitleRelevanceRank('C++17入门', 'C++'), 0);
    assert.equal(getTitleRelevanceRank('C#12实战', 'C#'), 0);
    assert.equal(getTitleRelevanceRank('.NET8.0 Core教程', '.NET'), 0);
    assert.equal(getTitleRelevanceRank('C++17 Primer', 'C++ Primer'), 1);
    assert.equal(getTitleRelevanceRank('C#实战教程', 'C#教程'), 2);
    assert.equal(getTitleRelevanceRank('任意资源合集', '!!!'), null);
  });

  it('requires all distinctive terms for unfamiliar multiword queries', () => {
    assert.equal(getTitleRelevanceRank('Black Myth deluxe edition', 'myth black'), 1);
    assert.equal(getTitleRelevanceRank('Black Swan movie', 'black myth'), null);
    assert.equal(getTitleRelevanceRank('任意资源合集', '计算机基础教程'), null);
  });
});
