import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { categorySchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const type = searchParams.get("type")

    const where: {
      OR?: { code?: { contains: string; mode: "insensitive" }; name?: { contains: string; mode: "insensitive" } }[]
      status?: boolean
      typeCategory?: string
    } = {}

    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ]
    }

    if (status === "active") {
      where.status = true
    }

    if (type) {
      where.typeCategory = type
    }

    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ typeCategory: "asc" }, { name: "asc" }],
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = categorySchema.parse(body)

    const category = await prisma.category.create({
      data: {
        code: data.code,
        name: data.name,
        typeCategory: data.typeCategory,
        descripcion: data.descripcion ?? null,
        status: data.status ?? true,
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Ya existe una categoría con este código" },
        { status: 409 }
      )
    }

    console.error("Error creating category:", error)
    return NextResponse.json(
      {
        error: "Error al crear categoría",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}


