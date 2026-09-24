import 'dotenv/config'
import { z } from 'zod'

const booleanFromString = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return value
}, z.boolean())

const optionalBootstrapToken = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}, z.string().min(32).optional())

export const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria').default('postgresql://postgres:postgres@localhost:5432/artesanias'),
  DATABASE_SSL: z.enum(['require', 'disable']).default('disable'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET es obligatoria').optional(),
  JWT_EXPIRES_IN: z.string().min(1, 'JWT_EXPIRES_IN es obligatoria').default('7d'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGIN: z.string().min(1, 'CORS_ORIGIN es obligatoria').default('*'),
  AUTH_REGISTRATION_ENABLED: booleanFromString.default(false),
  AUTH_BOOTSTRAP_TOKEN: optionalBootstrapToken,
})

export function createEnvConfig(rawEnv: Record<string, string | undefined>) {
  const config = envSchema.parse({
    HOST: rawEnv.HOST,
    PORT: rawEnv.PORT,
    DATABASE_URL: rawEnv.DATABASE_URL,
    DATABASE_SSL: rawEnv.DATABASE_SSL,
    JWT_SECRET: rawEnv.JWT_SECRET,
    JWT_EXPIRES_IN: rawEnv.JWT_EXPIRES_IN,
    NODE_ENV: rawEnv.NODE_ENV,
    CORS_ORIGIN: rawEnv.CORS_ORIGIN,
    AUTH_REGISTRATION_ENABLED: rawEnv.AUTH_REGISTRATION_ENABLED,
    AUTH_BOOTSTRAP_TOKEN: rawEnv.AUTH_BOOTSTRAP_TOKEN,
  })

  const jwtSecret = config.JWT_SECRET ?? (config.NODE_ENV === 'production' ? '' : 'development-secret-change-me')
  if (config.NODE_ENV === 'production' && (jwtSecret.length < 32 || jwtSecret === 'development-secret-change-me')) {
    throw new Error('JWT_SECRET debe ser un secreto seguro de al menos 32 caracteres en producción.')
  }
  if (config.NODE_ENV === 'production' && config.DATABASE_SSL !== 'require') {
    throw new Error('DATABASE_SSL=require es obligatorio en producción.')
  }
  if (config.NODE_ENV === 'production' && config.CORS_ORIGIN.trim() === '*') {
    throw new Error('CORS_ORIGIN no puede ser * en producción.')
  }
  if (config.AUTH_REGISTRATION_ENABLED && !config.AUTH_BOOTSTRAP_TOKEN) {
    throw new Error('AUTH_BOOTSTRAP_TOKEN es obligatorio cuando AUTH_REGISTRATION_ENABLED está habilitado.')
  }

  return { ...config, JWT_SECRET: jwtSecret }
}

export const env = createEnvConfig(process.env)
