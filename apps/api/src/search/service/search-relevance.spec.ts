import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getTitleRelevanceRank } from './search-relevance';

describe('getTitleRelevanceRank', () => {
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
