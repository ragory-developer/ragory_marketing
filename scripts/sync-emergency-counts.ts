import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Syncing activeEmergencyCount for all clients...')
  
  const clients = await prisma.client.findMany({
    include: {
      emergencyNotes: {
        where: { isDone: false }
      }
    }
  })

  let updatedCount = 0

  for (const client of clients) {
    const actualCount = client.emergencyNotes.length
    
    if (client.activeEmergencyCount !== actualCount) {
      await prisma.client.update({
        where: { id: client.id },
        data: { activeEmergencyCount: actualCount }
      })
      console.log(`✅ Updated ${client.name}: ${client.activeEmergencyCount} -> ${actualCount}`)
      updatedCount++
    }
  }

  console.log(`✨ Done! Updated ${updatedCount} clients.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
