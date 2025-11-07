import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { productOriginSchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const origin = await prisma.productOrigin.findUnique({
      where: { idOrigin: parseInt(params.id) },
    })

    if (!origin) {
      return NextResponse.json(
        { error: "Origen de producto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({ origin })
  } catch (error) {
    console.error("Error fetching product origin:", error)
    return NextResponse.json(
      { error: "Error al obtener origen de producto" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = productOriginSchema.parse(body)

    const origin = await prisma.productOrigin.update({
      where: { idOrigin: parseInt(params.id) },
      data: {
        name: data.name,
        description: data.description ?? null,
        status: data.status ?? true,
      },
    })

    return NextResponse.json({ origin })
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
          { error: "Origen de producto no encontrado" },
          { status: 404 }
        )
      }

      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un origen de producto con este nombre" },
          { status: 409 }
        )
      }
    }

    console.error("Error updating product origin:", error)
    return NextResponse.json(
      { error: "Error al actualizar origen de producto" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const origin = await prisma.productOrigin.update({
      where: { idOrigin: parseInt(params.id) },
      data: { status: false },
    })

    return NextResponse.json({ origin })
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Origen de producto no encontrado" },
        { status: 404 }
      )
    }

    console.error("Error deleting product origin:", error)
    return NextResponse.json(
      { error: "Error al eliminar origen de producto" },
      { status: 500 }
    )
  }
}


