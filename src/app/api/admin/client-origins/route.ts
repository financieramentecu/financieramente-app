import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clientOriginSchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    const where: {
      name?: { contains: string; mode: "insensitive" }
      status?: boolean
    } = {}

    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }

    if (status === "active") {
      where.status = true
    }

    const origins = await prisma.clientOrigin.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ origins })
  } catch (error) {
    console.error("Error fetching client origins:", error)
    return NextResponse.json(
      { error: "Error al obtener orígenes de cliente" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = clientOriginSchema.parse(body)

    const origin = await prisma.clientOrigin.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? true,
      },
    })

    return NextResponse.json({ origin }, { status: 201 })
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
        { error: "Ya existe un origen de cliente con este nombre" },
        { status: 409 }
      )
    }

    console.error("Error creating client origin:", error)
    return NextResponse.json(
      {
        error: "Error al crear origen de cliente",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}


