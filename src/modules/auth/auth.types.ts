export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  tokenVersion: number
  createdAt: Date | null
  updatedAt: Date | null
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthSession {
  token: string
  user: AuthUser
}
