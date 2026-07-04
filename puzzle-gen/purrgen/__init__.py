"""Purrdoku puzzle generator — pure-algorithm CSP logic puzzle pipeline.

Pipeline: 完整解生成 -> 线索池枚举 -> 构造+裁剪到唯一解 -> 逻辑可解性校验 -> 难度分级 -> 拒绝采样.
"""
