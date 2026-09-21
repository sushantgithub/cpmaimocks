export interface CurrentAccountState {
  isActive: boolean
  role: string
}

export function activeAccountRole(account: CurrentAccountState | null): string | null {
  return account?.isActive ? account.role : null
}
