import BN from 'bn.js'
import { PublicKey } from '@solana/web3.js'
import { Fraction } from '@/types/entity'

// eslint-disable-next-line @typescript-eslint/ban-types
export type EnumStr = string & {}
export type Primitive = boolean | number | string | bigint
export type StringNumber = string | number
export type ObjectNotArray = { [key: string]: any }

export type AnyFn = (...args: any[]) => any
export type AnyObj = { [key: string]: any }

export type MayFunction<T, Params extends any[] = []> = T | ((...params: Params) => T)
export type MayPromise<T> = T | Promise<T>
export type MayArray<T> = T | T[]

export type NotFunctionValue = Exclude<any, AnyFn>
export type PublicKeyish = HexAddress | PublicKey
export type Numberish = number | string | bigint | Fraction | BN
export type BooleanLike = unknown // any value that can transform to boolean

export type ID = string

/** a string of readless charateries (like: base64 string)  */
export type HexAddress = string

/** use it in <img>'src */
export type SrcAddress = string
