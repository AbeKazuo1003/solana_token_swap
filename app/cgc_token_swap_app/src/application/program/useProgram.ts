import create from 'zustand'
import * as anchor from '@project-serum/anchor'

export const CONFIG_PDA_SEED = 'config'

export type ProgramStore = {
  program: anchor.Program<anchor.Idl> | undefined
}

const useProgram = create<ProgramStore>((set, get) => ({
  program: undefined
}))

export default useProgram
