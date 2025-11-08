import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currencySchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currency = await prisma.currency.findUnique({
      where: { idCurrency: parseInt(id) },
    })

    if (!currency) {
      return NextResponse.json(
        { error: "Moneda no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({ currency })
  } catch (error) {
    console.error("Error fetching currency:", error)
    return NextResponse.json(
      { error: "Error al obtener moneda" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const data = currencySchema.parse(body)

    const currency = await prisma.currency.update({
      where: { idCurrency: parseInt(id) },
      data: {
        name: data.name,
        symbol: data.symbol ?? null,
        active: data.active ?? true,
      },
    })

    return NextResponse.json({ currency })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.issues },
        { status: 400 }
      )
    }

    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json(
          { error: "Moneda no encontrada" },
          { status: 404 }
        )
      }

      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una moneda con este nombre" },
          { status: 409 }
        )
      }
    }

    console.error("Error updating currency:", error)
    return NextResponse.json(
      { error: "Error al actualizar moneda" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currency = await prisma.currency.update({
      where: { idCurrency: parseInt(id) },
      data: { active: false },
    })

    return NextResponse.json({ currency })
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Moneda no encontrada" },
        { status: 404 }
      )
    }

    console.error("Error deleting currency:", error)
    return NextResponse.json(
      { error: "Error al eliminar moneda" },
      { status: 500 }
    )
  }
}


