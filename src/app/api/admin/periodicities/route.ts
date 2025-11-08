import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buyPeriodicitySchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")

    const where: {
      name?: { contains: string; mode: "insensitive" }
      active?: boolean
    } = {}

    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }

    if (status === "active") {
      where.active = true
    }

    const periodicities = await prisma.buyPeriodicity.findMany({
      where,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ periodicities })
  } catch (error) {
    console.error("Error fetching periodicities:", error)
    return NextResponse.json(
      { error: "Error al obtener periodicidades" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = buyPeriodicitySchema.parse(body)

    const periodicity = await prisma.buyPeriodicity.create({
      data: {
        name: data.name,
        active: data.active ?? true,
      },
    })

    return NextResponse.json({ periodicity }, { status: 201 })
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
        { error: "Ya existe una periodicidad con este nombre" },
        { status: 409 }
      )
    }

    console.error("Error creating periodicity:", error)
    return NextResponse.json(
      {
        error: "Error al crear periodicidad",
        details: error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}


