import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { categorySchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const category = await prisma.category.findUnique({
      where: { idCategory: parseInt(id) },
    })

    if (!category) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json(
      { error: "Error al obtener categoría" },
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
    const data = categorySchema.parse(body)

    const category = await prisma.category.update({
      where: { idCategory: parseInt(id) },
      data: {
        code: data.code,
        name: data.name,
        typeCategory: data.typeCategory,
        descripcion: data.descripcion ?? null,
        status: data.status ?? true,
      },
    })

    return NextResponse.json({ category })
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
          { error: "Categoría no encontrada" },
          { status: 404 }
        )
      }

      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una categoría con este código" },
          { status: 409 }
        )
      }
    }

    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Error al actualizar categoría" },
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
    const category = await prisma.category.update({
      where: { idCategory: parseInt(id) },
      data: { status: false },
    })

    return NextResponse.json({ category })
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      )
    }

    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Error al eliminar categoría" },
      { status: 500 }
    )
  }
}


