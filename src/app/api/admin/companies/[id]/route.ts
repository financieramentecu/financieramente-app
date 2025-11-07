import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { companySchema } from "@/lib/admin/schemas"
import { z } from "zod"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: { idCompany: parseInt(params.id) },
    })

    if (!company) {
      return NextResponse.json(
        { error: "Compañía no encontrada" },
        { status: 404 }
      )
    }

    return NextResponse.json({ company })
  } catch (error) {
    console.error("Error fetching company:", error)
    return NextResponse.json(
      { error: "Error al obtener compañía" },
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
    const data = companySchema.parse(body)

    const company = await prisma.company.update({
      where: { idCompany: parseInt(params.id) },
      data,
    })

    return NextResponse.json({ company })
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
          { error: "Compañía no encontrada" },
          { status: 404 }
        )
      }

      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe una compañía con este nombre" },
          { status: 409 }
        )
      }
    }

    console.error("Error updating company:", error)
    return NextResponse.json(
      { error: "Error al actualizar compañía" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Soft delete - actualizar status a false
    const company = await prisma.company.update({
      where: { idCompany: parseInt(params.id) },
      data: { status: false },
    })

    return NextResponse.json({ company })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json(
        { error: "Compañía no encontrada" },
        { status: 404 }
      )
    }

    console.error("Error deleting company:", error)
    return NextResponse.json(
      { error: "Error al eliminar compañía" },
      { status: 500 }
    )
  }
}

