/**
 * lib/schemas.ts
 * Central Zod validation schemas for all API request bodies.
 *
 * Usage in an API route:
 *   import { ClientCreateSchema } from '@/lib/schemas'
 *   const result = ClientCreateSchema.safeParse(await req.json())
 *   if (!result.success) return zodError(result.error)
 *   const { name, phone, ... } = result.data
 */

import { z } from 'zod'

// ─── Shared helpers ────────────────────────────────────────────────────────────

/** Converts an empty string to undefined so optional fields work cleanly */
const optStr  = z.string().trim().optional().transform(v => v === '' ? undefined : v)
const optUrl  = z.string().trim().url('Invalid URL').optional().or(z.literal(''))
const optDate = z.string().trim().optional().transform(v => {
  if (!v || v === '') return undefined
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d
})

/** Standard UUID format check */
const uuid = z.string().uuid()

/** Return a structured 400 response from a ZodError */
export function zodError(error: z.ZodError) {
  const { NextResponse } = require('next/server')
  return NextResponse.json(
    { error: 'Validation failed', details: error.flatten().fieldErrors },
    { status: 400 }
  )
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// ─── Users ────────────────────────────────────────────────────────────────────

export const UserCreateSchema = z.object({
  name:     z.string().trim().min(1, 'Name is required'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role:     z.enum([
    'SUPER_ADMIN','MARKETING_DIRECTOR','MARKETING_MANAGER','FIELD_MARKETING_MANAGER',
    'DIGITAL_SPECIALIST','FIELD_EXECUTIVE','SALES_AGENT','SUPPORT_AGENT','VIEWER','EMPLOYEE',
  ]).optional(),
})

export const UserUpdateSchema = z.object({
  name:     z.string().trim().min(1).optional(),
  username: z.string().trim().min(3).optional(),
  password: z.string().min(6).optional(),
  role:     z.enum([
    'SUPER_ADMIN','MARKETING_DIRECTOR','MARKETING_MANAGER','FIELD_MARKETING_MANAGER',
    'DIGITAL_SPECIALIST','FIELD_EXECUTIVE','SALES_AGENT','SUPPORT_AGENT','VIEWER','EMPLOYEE',
  ]).optional(),
  isActive: z.boolean().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field required' })

// ─── Clients ──────────────────────────────────────────────────────────────────

export const CLIENT_STATUSES  = ['PROSPECT','CONTACTED','INTERESTED','NEGOTIATING','CLIENTS','LOST','INACTIVE'] as const
export const CLIENT_PRIORITIES = ['LOW','MEDIUM','HIGH'] as const
export const NOTE_TYPES        = ['GENERAL','CALL','VISIT','FOLLOW_UP','COMPLAINT','SMS'] as const

export const ClientCreateSchema = z.object({
  name:             z.string().trim().min(1, 'Name is required'),
  phone:            z.string().trim().min(6, 'Phone is required'),
  shopName:         optStr,
  address:          optStr,
  alternativePhone: optStr,
  email:            z.string().trim().email('Invalid email').optional().or(z.literal('')),
  businessType:     optStr,
  district:         optStr,
  area:             optStr,
  status:           z.enum(CLIENT_STATUSES).optional().default('PROSPECT'),
  priority:         z.enum(CLIENT_PRIORITIES).optional().default('MEDIUM'),
  source:           optStr,
  notes:            optStr,
  marketId:         uuid.optional().or(z.literal('')),
  assignedToId:     uuid.optional().or(z.literal('')),
  facebookUrl:      optStr,
  nextFollowUpAt:   optDate,
})

export const ClientUpdateSchema = ClientCreateSchema.partial()

export const ClientNoteCreateSchema = z.object({
  content: z.string().trim().min(1, 'Content is required'),
  type:    z.enum(NOTE_TYPES).optional().default('GENERAL'),
})

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const CAMPAIGN_TYPES    = ['FIELD_SURVEY','DIGITAL','EMAIL','SMS','SOCIAL_MEDIA','FIELD_MARKETING'] as const
export const CAMPAIGN_STATUSES = ['DRAFT','ACTIVE','PAUSED','COMPLETED','ARCHIVED'] as const

export const CampaignCreateSchema = z.object({
  title:       z.string().trim().min(3, 'Title must be at least 3 characters'),
  type:        z.enum(CAMPAIGN_TYPES),
  description: optStr,
  startDate:   optDate,
  endDate:     optDate,
  budget:      z.number().nonnegative().optional().or(z.string().transform(v => v ? parseFloat(v) : undefined)),
  targetCount: z.number().int().nonnegative().optional().or(z.string().transform(v => v ? parseInt(v) : undefined)),
})

export const CampaignUpdateSchema = CampaignCreateSchema.partial().extend({
  status: z.enum(CAMPAIGN_STATUSES).optional(),
  spent:  z.number().nonnegative().optional(),
})

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const TASK_STATUSES   = ['PENDING','IN_PROGRESS','COMPLETED','CANCELLED'] as const

export const TaskCreateSchema = z.object({
  title:        z.string().trim().min(1, 'Title is required'),
  description:  optStr,
  priority:     z.enum(CLIENT_PRIORITIES).optional().default('MEDIUM'),
  dueDate:      optDate,
  assignedToId: uuid.optional().or(z.literal('')),
  clientId:     uuid.optional().or(z.literal('')),
  campaignId:   uuid.optional().or(z.literal('')),
})

export const TaskUpdateSchema = TaskCreateSchema.partial().extend({
  status: z.enum(TASK_STATUSES).optional(),
})

// ─── SMS ──────────────────────────────────────────────────────────────────────

export const SmsSchema = z.object({
  clientId:          uuid,
  phone:             z.string().trim().min(6),
  message:           z.string().trim().min(1, 'Message cannot be empty'),
  scheduledDateTime: z.string().optional(),
  type:              z.enum(['text','unicode']).optional().default('text'),
})

// ─── Settings ─────────────────────────────────────────────────────────────────

export const GoogleCredentialsSchema = z.object({
  googleClientId:     z.string().min(1),
  googleClientSecret: z.string().min(1),
})

export const SmsSettingsSchema = z.object({
  mramSmsApiKey:  z.string(),
  mramSmsSenderId: z.string(),
})

export const ServiceAccountSchema = z.object({
  googleServiceAccountJson: z.string().min(1),
})
