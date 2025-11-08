import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")?.trim() ?? ""
    const limitParam = searchParams.get("limit")

    if (!query || query.length < 3) {
      return NextResponse.json({ users: [] })
    }

    const limit = Math.min(Math.max(Number(limitParam) || 10, 1), 25)

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { identityNumber: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: [
        { name: "asc" },
        { lastName: "asc" },
      ],
      select: {
        idUser: true,
        name: true,
        lastName: true,
        identityNumber: true,
        email: true,
        phone: true,
      },
      take: limit,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json(
      { error: "Error al buscar usuarios" },
      { status: 500 }
    )
  }
}

