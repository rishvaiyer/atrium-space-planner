import { createContext, useContext } from 'react'

export const LowPower = createContext(false)

export function useLowPower() {
  return useContext(LowPower)
}
