import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

// Define a proper Session type based on what's used in the app
interface MockSession {
    user: {
        id: string
        name: string
        email: string
        image: string
        role: string
    }
    expires: string
}

interface MockCategoryType {
    id: number
    name: string
    description: string | null
    status: boolean
    createdAt: Date
    updatedAt: Date
}

// Mock auth
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        categoryType: {
            findMany: vi.fn(),
            count: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
    },
}))

describe('Category Types API', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockSession: MockSession = {
        user: {
            id: '1',
            name: 'Test',
            email: 'test@example.com',
            image: '',
            role: 'ADMIN',
        },
        expires: '9999-12-31T23:59:59.999Z',
    }

    const mockDate = new Date()

    it('GET should return category types', async () => {
        vi.mocked(auth).mockResolvedValue(mockSession as unknown as never)
        vi.mocked(prisma.categoryType.findMany).mockResolvedValue([])
        vi.mocked(prisma.categoryType.count).mockResolvedValue(0)

        const req = new NextRequest('http://localhost/api/category-types')
        const res = await GET(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.data.categoryTypes).toEqual([])
    })

    it('POST should create category type', async () => {
        vi.mocked(auth).mockResolvedValue(mockSession as unknown as never)
        const mockData: MockCategoryType = {
            id: 1,
            name: 'Test',
            description: 'Test',
            status: true,
            createdAt: mockDate,
            updatedAt: mockDate,
        }
        vi.mocked(prisma.categoryType.create).mockResolvedValue(mockData)

        const req = new Request('http://localhost/api/category-types', {
            method: 'POST',
            body: JSON.stringify({ name: 'Test', status: true }),
            headers: {
                'Content-Type': 'application/json',
            },
        })

        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(201)
        expect(json.data.name).toBe('Test')
        expect(json.data.status).toBe(true)
    })
})
