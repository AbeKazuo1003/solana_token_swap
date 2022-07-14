import { UseBoundStore } from 'zustand'

export type MayArray<T> = T | Array<T>

export type MayFunction<T, PS extends any[] = []> = T | ((...Params: PS) => T)
