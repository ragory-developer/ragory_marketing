const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "ClientStatus" RENAME VALUE 'CONVERTED' TO 'CLIENTS'`)
    console.log('Successfully renamed CONVERTED to CLIENTS in DB enum')
  } catch (e) {
    console.error('Error renaming enum (it might already be renamed):', e.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
